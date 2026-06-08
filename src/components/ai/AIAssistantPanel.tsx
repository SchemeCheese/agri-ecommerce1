'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Bot, Send, Loader2, AlertCircle, History, Plus, ImagePlus, X, Store, ChevronRight, Package, Eraser } from 'lucide-react';
import { SOCKET_BASE_URL, resolveImageUrl } from '@/lib/runtime-config';
import api from '@/lib/axios';
import { compressImageForAI, mimeFromDataUri } from '@/lib/image-compressor';
import { useToast } from '@/components/ui/Toast';

// ── Types ────────────────────────────────────────────────────────────────────
/** Card sản phẩm từ ai:actionable_data — link/ảnh build từ DB phía BE, không phải LLM. */
type ActionableProduct = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  image_url?: string | null;
};

/** Card cửa hàng từ ai:actionable_data. */
type ActionableShop = {
  seller_id: string;
  shop_name?: string | null;
  avatar_url?: string | null;
  avg_rating?: number | null;
  verdict?: string | null;
};

type ActionableBlock =
  | { type: 'products'; data: ActionableProduct[] }
  | { type: 'shops'; data: ActionableShop[] };

type AIMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  image?: string; // data URI ảnh đính kèm (chỉ hiển thị local, BE không persist)
  pending?: boolean; // true khi đang stream từ server
  error?: boolean;
  created_at?: string;
  // Entity cards do tool trả về — mỗi type giữ block mới nhất (tool có thể
  // chạy nhiều round, round sau refine kết quả round trước)
  actionableData?: ActionableBlock[];
};

type AISessionSummary = {
  id: string;
  mode: 'BUYER' | 'SELLER';
  created_at: string;
  updated_at: string;
  _count?: { messages: number };
};

interface Props {
  mode?: 'BUYER' | 'SELLER';
  context?: { productId?: string; shopId?: string };
  className?: string;
}

const AI_NS = `${SOCKET_BASE_URL.replace(/\/$/, '')}/ai-chat`;

// Khớp SUPPORTED_IMAGE_MIME_TYPES của BE (SuggestProductDto / AskQuestionDto)
const AI_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
// Giới hạn file ĐẦU VÀO — ảnh được nén về webp ≤0.3MB trước khi gửi nên chỉ
// cần chặn file quá khổ (tránh decode ảnh khổng lồ ngay trên client)
const AI_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// ── Component ────────────────────────────────────────────────────────────────
export const AIAssistantPanel: React.FC<Props> = ({
  mode = 'BUYER',
  context,
  className = '',
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AISessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // Ảnh đang chờ gửi kèm tin nhắn tiếp theo
  const [pendingImage, setPendingImage] = useState<{ dataUri: string; mimeType: string } | null>(null);
  // true khi đang nén/encode ảnh — disable nút đính kèm, hiện spinner
  const [imageProcessing, setImageProcessing] = useState(false);
  const { show: showToast, ToastNode } = useToast();

  const socketRef = useRef<Socket | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null),
    [],
  );

  // ── Init socket ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setConnecting(false);
      setError('Vui lòng đăng nhập để dùng trợ lý AI.');
      return;
    }

    const socket = io(AI_NS, {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnecting(false);
      setError(null);
    });

    socket.on('connect_error', (err) => {
      setConnecting(false);
      setError(`Không kết nối được trợ lý AI: ${err.message}`);
    });

    socket.on('ai:thinking', () => {
      setThinking(true);
      setThinkingLabel(null);
    });

    socket.on('ai:tool_start', (payload: { sessionId: string; toolName: string; label: string }) => {
      setThinkingLabel(payload.label);
    });

    // Entity cards từ tool result — gắn vào assistant message đang stream.
    // Cùng type thì replace (round tool sau refine round trước), khác type thì thêm.
    socket.on('ai:actionable_data', (payload: { type: 'products' | 'shops'; data: any[] }) => {
      // Chỉ render type đã có card component — type lạ (vd 'orders' tương lai) bỏ qua
      if (payload?.type !== 'products' && payload?.type !== 'shops') return;
      if (!Array.isArray(payload?.data) || payload.data.length === 0) return;
      setMessages((prev) => {
        const id = streamingMsgIdRef.current;
        if (!id) return prev;
        return prev.map((m) => {
          if (m.id !== id) return m;
          const others = (m.actionableData ?? []).filter((b) => b.type !== payload.type);
          return { ...m, actionableData: [...others, { type: payload.type, data: payload.data } as ActionableBlock] };
        });
      });
    });

    socket.on('ai:token', (payload: { chunk: string; sessionId: string }) => {
      // Không đọc thinkingLabel từ closure — effect chỉ chạy 1 lần ([token])
      // nên giá trị đó stale vĩnh viễn là null. setState(null) khi đã null
      // được React bail-out, không gây render thừa.
      setThinkingLabel(null);
      setSessionId((cur) => cur ?? payload.sessionId);
      setMessages((prev) => {
        const id = streamingMsgIdRef.current;
        if (!id) return prev;
        return prev.map((m) =>
          m.id === id ? { ...m, content: m.content + payload.chunk } : m,
        );
      });
    });

    socket.on('ai:complete', (payload: { sessionId: string }) => {
      setThinking(false);
      setThinkingLabel(null);
      setSessionId(payload.sessionId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgIdRef.current ? { ...m, pending: false } : m,
        ),
      );
      streamingMsgIdRef.current = null;
    });

    socket.on('ai:error', (payload: { code: string; message: string }) => {
      setThinking(false);
      setError(payload.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgIdRef.current
            ? { ...m, content: payload.message, pending: false, error: true }
            : m,
        ),
      );
      streamingMsgIdRef.current = null;
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // ── Load lịch sử sessions ─────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/ai/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('[AI] loadSessions', err);
    }
  }, [token]);

  // ── Chọn 1 session cũ → tải lại messages ───────────────────────────────────
  const openSession = useCallback(
    async (id: string) => {
      try {
        const res = await api.get(`/ai/sessions/${id}`);
        const session = res.data;
        const msgs: AIMessage[] = (session?.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        }));
        setMessages(msgs);
        setSessionId(id);
        setShowHistory(false);
      } catch (err) {
        console.error('[AI] openSession', err);
      }
    },
    [],
  );

  // ── Mở chat mới (clear session) ───────────────────────────────────────────
  const newSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setPendingImage(null);
    streamingMsgIdRef.current = null;
    setShowHistory(false);
  }, []);

  // ── Làm mới ngữ cảnh — xoá hội thoại cũ để AI không bị "ám" context cũ ─────
  const clearContext = useCallback(() => {
    newSession();
    showToast('Đã làm mới ngữ cảnh trò chuyện');
  }, [newSession, showToast]);

  // ── Chọn ảnh đính kèm ──────────────────────────────────────────────────────
  const handlePickImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file
    if (!file) return;
    if (!AI_IMAGE_MIME_TYPES.includes(file.type)) {
      setError('Định dạng ảnh không hỗ trợ — dùng JPEG, PNG, WebP hoặc HEIC.');
      return;
    }
    if (file.size > AI_IMAGE_MAX_BYTES) {
      setError('Ảnh quá lớn — tối đa 10MB.');
      return;
    }
    setImageProcessing(true);
    try {
      // Nén về webp ≤0.3MB trong web worker — main thread không bị block
      const dataUri = await compressImageForAI(file);
      setError(null);
      // Bình thường là image/webp; nén fallback (vd HEIC) thì giữ mime gốc
      setPendingImage({ dataUri, mimeType: mimeFromDataUri(dataUri, file.type) });
    } catch {
      setError('Không xử lý được ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setImageProcessing(false);
    }
  }, []);

  // ── Gửi câu hỏi ────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = draft.trim();
    const image = pendingImage;
    if ((!text && !image) || !socketRef.current?.connected || thinking) return;

    // Gửi ảnh không kèm chữ → nội dung mặc định để BE vẫn có text hợp lệ
    const content = text || 'Hãy phân tích hình ảnh đính kèm này.';

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: 'USER',
      content,
      image: image?.dataUri,
    };
    const placeholderId = `a-${Date.now()}`;
    streamingMsgIdRef.current = placeholderId;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: 'ASSISTANT', content: '', pending: true },
    ]);
    setDraft('');
    setPendingImage(null);
    setError(null);

    socketRef.current.emit('ai:ask', {
      content,
      sessionId: sessionId ?? undefined,
      mode,
      context,
      // BE tự strip data-URI prefix khỏi imageBase64
      ...(image ? { imageBase64: image.dataUri, imageMimeType: image.mimeType } : {}),
    });
  }, [draft, pendingImage, thinking, sessionId, mode, context]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {ToastNode}
      {/* Header tools */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Bot size={16} className="text-green-600" />
          <span>AgriBot · {mode === 'BUYER' ? 'Người mua' : 'Người bán'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearContext}
            disabled={messages.length === 0 && !pendingImage}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Làm mới hội thoại"
            aria-label="Làm mới hội thoại"
          >
            <Eraser size={16} />
          </button>
          <button
            type="button"
            onClick={newSession}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
            title="Cuộc trò chuyện mới"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowHistory((v) => !v);
              if (!showHistory) loadSessions();
            }}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
            title="Lịch sử"
          >
            <History size={16} />
          </button>
        </div>
      </div>

      {/* History dropdown */}
      {showHistory && (
        <div className="max-h-48 overflow-y-auto border-b border-gray-100 bg-gray-50/60">
          {sessions.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-400">Chưa có lịch sử.</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s.id)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white border-b border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Phiên · {s.mode} · {s._count?.messages ?? 0} tin
                  </span>
                  <span className="text-gray-400">
                    {new Date(s.updated_at).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
        {connecting && (
          <div className="flex items-center gap-2 text-sm text-gray-500 justify-center py-4">
            <Loader2 className="animate-spin" size={14} /> Đang kết nối trợ lý...
          </div>
        )}
        {!connecting && messages.length === 0 && !error && (
          <div className="text-center text-sm text-gray-500 py-6">
            👋 Xin chào! Mình là AgriBot. Hỏi mình về sản phẩm, giá cả, thương lượng, hoặc quy trình mua bán nhé.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                m.role === 'USER'
                  ? 'bg-green-600 text-white'
                  : m.error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {m.image && (
                // data URI — next/image không tối ưu được, dùng img thường
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt="Ảnh đính kèm"
                  className="rounded-lg mb-1.5 max-h-40 w-auto"
                />
              )}
              {m.role === 'ASSISTANT' && m.pending && !m.content && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Loader2 className="animate-spin" size={12} />
                  {thinkingLabel ?? 'đang soạn...'}
                </span>
              )}
              {m.content}
              {/* Entity cards từ tool result — link thật từ DB, chống LLM bịa link */}
              {m.actionableData && m.actionableData.length > 0 && (
                <div className="mt-2 space-y-2 whitespace-normal">
                  {m.actionableData.map((block) => (
                    <div key={block.type} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {block.type === 'products'
                        ? block.data.map((p) => <ProductMiniCard key={p.id} product={p} />)
                        : block.data.map((s) => <ShopMiniCard key={s.seller_id} shop={s} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 border-t border-gray-100 bg-white">
        {/* Preview ảnh chờ gửi */}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage.dataUri}
                alt="Ảnh chờ gửi"
                className="h-16 w-16 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full p-0.5 hover:bg-gray-900 transition-colors"
                aria-label="Bỏ ảnh"
              >
                <X size={12} />
              </button>
            </div>
            <span className="text-xs text-gray-400">Ảnh sẽ được gửi kèm tin nhắn</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-gray-50 rounded-full border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={connecting || thinking || imageProcessing}
            className="p-2 ml-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Đính kèm ảnh"
            title={imageProcessing ? 'Đang nén ảnh...' : 'Đính kèm ảnh'}
          >
            {imageProcessing ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={AI_IMAGE_MIME_TYPES.join(',')}
            className="hidden"
            onChange={handlePickImage}
          />
          <input
            type="text"
            placeholder={
              connecting ? 'Đang kết nối...' : thinking ? 'Đang chờ phản hồi...' : 'Nhập câu hỏi...'
            }
            disabled={connecting || thinking || !!error && !token}
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none text-sm disabled:opacity-50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            maxLength={500}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={(!draft.trim() && !pendingImage) || connecting || thinking || imageProcessing}
            className="p-2 mr-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Gửi"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-[10px] text-gray-400 mt-1 px-2">
          Tối đa 500 ký tự · Trợ lý chỉ hỗ trợ nghiệp vụ giao dịch nông sản
        </div>
      </div>
    </div>
  );
};

// ── Actionable cards ─────────────────────────────────────────────────────────
const formatVnd = (n: number) => `${Number(n).toLocaleString('vi-VN')}đ`;

/** Card sản phẩm mini trong bubble AI — bấm vào mở trang chi tiết. */
const ProductMiniCard = ({ product }: { product: ActionableProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="w-32 shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-green-400 hover:shadow-sm transition-all"
  >
    <div className="h-20 w-full bg-gray-50 flex items-center justify-center text-gray-300">
      {product.image_url ? (
        // URL từ BE (có thể là path tương đối /uploads/...) — img thường + resolveImageUrl
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <Package size={20} />
      )}
    </div>
    <div className="p-2">
      <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{product.name}</p>
      <p className="text-xs font-bold text-green-700 mt-1">
        {formatVnd(product.price)}
        {product.unit && <span className="font-normal text-gray-400">/{product.unit}</span>}
      </p>
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600 mt-1">
        Xem chi tiết <ChevronRight size={11} />
      </span>
    </div>
  </Link>
);

/** Card cửa hàng mini trong bubble AI — bấm vào mở trang shop. */
const ShopMiniCard = ({ shop }: { shop: ActionableShop }) => (
  <Link
    href={`/shop/${shop.seller_id}`}
    className="w-40 shrink-0 bg-white border border-gray-200 rounded-xl p-2.5 hover:border-green-400 hover:shadow-sm transition-all"
  >
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-full bg-green-50 border border-gray-100 overflow-hidden flex items-center justify-center text-green-600 shrink-0">
        {shop.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(shop.avatar_url)} alt="" className="h-full w-full object-cover" />
        ) : (
          <Store size={16} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{shop.shop_name || 'Cửa hàng'}</p>
        {typeof shop.avg_rating === 'number' && shop.avg_rating > 0 && (
          <p className="text-[11px] text-amber-500">★ {shop.avg_rating}</p>
        )}
      </div>
    </div>
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600 mt-1.5">
      Đến cửa hàng <ChevronRight size={11} />
    </span>
  </Link>
);

export default AIAssistantPanel;
