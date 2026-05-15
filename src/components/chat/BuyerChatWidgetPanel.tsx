'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  ChevronLeft,
  ImagePlus,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Search,
  Send,
  Store,
  X,
} from 'lucide-react';

import api from '@/lib/axios';
import { SOCKET_BASE_URL, resolveImageUrl } from '@/lib/runtime-config';
import { useAuth } from '@/context/AuthContext';
import {
  Conversation,
  Message,
  QuoteData,
  CheckoutData,
  extractQuote,
} from '@/types/chat';
import { NegotiationQuoteCard } from '@/components/chat/NegotiationQuoteCard';

type Mode = 'popup' | 'fullscreen';

interface Props {
  mode: Mode;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onClose: () => void;
}

const SOCKET_URL = `${SOCKET_BASE_URL.replace(/\/$/, '')}/chat`;

const getPartnerName = (conv: Conversation) =>
  conv.partner?.profile?.store_name || conv.partner?.full_name || 'Shop';

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const diffM = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffM < 1) return 'Vừa xong';
  if (diffM < 60) return `${diffM} phút`;
  if (diffM < 1440) return `${Math.floor(diffM / 60)} giờ`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function BuyerChatWidgetPanel({
  mode,
  isFullScreen,
  onToggleFullScreen,
  onClose,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [unreadConvIds, setUnreadConvIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeConvIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await api.get('/chat/conversations');
      const data: Conversation[] = res.data || [];
      setConversations(data);
      return data;
    } catch {
      setConversations([]);
      return [] as Conversation[];
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages?limit=30`);
      const payload = res.data;
      const items = Array.isArray(payload) ? payload : payload?.items ?? [];
      setMessages(items);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConv(conv);
      setMobileView('chat');
      activeConvIdRef.current = conv.id;
      setUnreadConvIds((prev) => {
        const next = new Set(prev);
        next.delete(conv.id);
        return next;
      });
      socketRef.current?.emit('joinRoom', { conversationId: conv.id });
      await loadMessages(conv.id);
      setTimeout(() => inputRef.current?.focus(), 60);
    },
    [loadMessages]
  );

  // socket init
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      if (activeConvIdRef.current) {
        socket.emit('joinRoom', { conversationId: activeConvIdRef.current });
      }
    });

    socket.on('newMessage', (msg: Message & { conversationId?: string; conversation_id?: string }) => {
      const normalized: Message = {
        ...msg,
        message_content: (msg as any).message_content ?? (msg as any).content ?? '',
        message_type: (msg as any).message_type ?? 'TEXT',
      };

      const convId = (msg as any).conversationId || (msg as any).conversation_id;
      const isActive = !!activeConvIdRef.current && convId && convId === activeConvIdRef.current;

      if (isActive) {
        setMessages((prev) => (prev.find((m) => m.id === normalized.id) ? prev : [...prev, normalized]));
      } else {
        if (convId) {
          setUnreadConvIds((prev) => new Set([...prev, convId]));
        }
        // lightweight refresh for lastMessage ordering
        loadConversations();
      }
    });

    // BE-driven unread count
    socket.on(
      'unreadUpdated',
      (payload: { conversationId: string; unread: number; totalUnread: number }) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === payload.conversationId ? { ...c, unread_count: payload.unread } : c)),
        );
        if (payload.unread === 0) {
          setUnreadConvIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.conversationId);
            return next;
          });
        }
      },
    );

    socket.on('quoteUpdated', ({ messageId, status }: { messageId: string; status: QuoteData['status'] }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          if (m.quote) return { ...m, quote: { ...m.quote, status } };
          if (m.quote_status !== undefined) return { ...m, quote_status: status };
          return m;
        })
      );
    });

    socket.on('negotiationAccepted', ({ checkoutData }: { checkoutData: CheckoutData }) => {
      const { productId, productName, quantity, negotiatedPrice, unit, sellerId } = checkoutData;
      router.push(
        `/checkout?ng=1` +
          `&id=${encodeURIComponent(productId)}` +
          `&name=${encodeURIComponent(productName)}` +
          `&qty=${quantity}` +
          `&price=${encodeURIComponent(negotiatedPrice)}` +
          `&unit=${encodeURIComponent(unit)}` +
          `&sellerId=${encodeURIComponent(sellerId)}`
      );
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [router, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !activeConv || !socketRef.current) return;
    setSending(true);
    socketRef.current.emit('sendMessage', {
      conversationId: activeConv.id,
      content: inputText.trim(),
      clientMessageId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    });
    setInputText('');
    setSending(false);
  }, [inputText, activeConv]);

  // ── Image upload ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const handlePickImage = () => fileInputRef.current?.click();
  const handleImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConv || !socketRef.current) return;
    if (uploadingImage) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setUploadError('Chỉ chấp nhận JPEG/PNG/WEBP/GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ảnh vượt quá 5MB.');
      return;
    }
    setUploadError(null);
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/chat/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url: string = res.data?.url;
      if (!url) throw new Error('Upload thất bại.');
      socketRef.current.emit('sendImageMessage', {
        conversationId: activeConv.id,
        imageUrl: url,
        clientMessageId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không gửi được ảnh.';
      setUploadError(typeof msg === 'string' ? msg : 'Không gửi được ảnh.');
    } finally {
      setUploadingImage(false);
    }
  }, [activeConv, uploadingImage]);

  const respondToQuote = (messageId: string, action: 'ACCEPTED' | 'REJECTED') => {
    if (!activeConv) return;
    socketRef.current?.emit('respondToQuote', {
      messageId,
      action,
      conversationId: activeConv.id,
    });
  };

  const filteredConvs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => getPartnerName(c).toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const isSplit = mode === 'fullscreen' || isFullScreen;

  const ListPane = (
    <div className="flex h-full flex-col">
      {/* List header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <MessageCircle size={16} className="text-green-600" /> Tin nhắn
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">Shop bạn đã trò chuyện gần đây</p>
          </div>
          {/* Window actions (match widget behavior) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label={isSplit ? 'Thu nhỏ' : 'Toàn màn hình'}
              title={isSplit ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isSplit ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm shop..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10"
          />
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {loadingConvs && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-green-600" size={22} />
          </div>
        )}

        {!loadingConvs && filteredConvs.length === 0 && (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={28} className="text-green-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Bạn chưa có cuộc trò chuyện nào</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Hãy khám phá nông sản tươi sạch và liên hệ với người bán nhé!
            </p>
            <Link
              href="/products"
              className="inline-flex mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
              onClick={onClose}
            >
              Khám phá ngay
            </Link>
          </div>
        )}

        {filteredConvs.map((conv) => {
          const name = getPartnerName(conv);
          const isActive = activeConv?.id === conv.id;
          const lastMsg = conv.lastMessage;
          const unread = conv.unread_count ?? (unreadConvIds.has(conv.id) ? 1 : 0);
          const showUnread = unread > 0 && !isActive;

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => selectConversation(conv)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all text-left border-b border-gray-50 ${
                isActive ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-green-100 flex-shrink-0 flex items-center justify-center text-green-700 font-black border border-gray-100">
                {conv.partner?.avatar ? (
                  <img src={resolveImageUrl(conv.partner.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
                {showUnread && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`font-bold text-sm truncate ${isActive ? 'text-green-700' : 'text-gray-900'}`}>{name}</p>
                  {lastMsg && (
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(lastMsg.created_at)}</span>
                  )}
                </div>
                {lastMsg && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-xs truncate flex-1 ${showUnread ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                      {lastMsg.content}
                    </p>
                    {showUnread && (
                      <span className="bg-green-600 text-white text-[10px] font-black rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const ChatPane = (
    <div className="flex h-full flex-col">
      {!activeConv ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-white">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
            <MessageCircle size={28} className="text-green-300" />
          </div>
          <p className="font-bold text-gray-800">Chọn một shop để bắt đầu</p>
          <p className="text-xs text-gray-500 mt-1">Danh sách bên trái hiển thị các shop bạn đã chat.</p>
          <Link
            href="/products"
            className="mt-5 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            onClick={onClose}
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
            {!isSplit && (
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Quay lại"
                title="Quay lại"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div className="w-10 h-10 rounded-full overflow-hidden bg-green-100 flex-shrink-0 flex items-center justify-center text-green-700 font-black border border-gray-100">
              {activeConv.partner?.avatar ? (
                <img src={resolveImageUrl(activeConv.partner.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                getPartnerName(activeConv).charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{getPartnerName(activeConv)}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                Đang hoạt động
              </p>
            </div>

            <Link
              href={`/shop/${activeConv.partner?.id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
            >
              <Store size={13} /> Xem shop
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-gray-50 px-4 py-4 overflow-y-auto space-y-1">
            {loadingMsgs && (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-green-600" size={22} />
              </div>
            )}

            {!loadingMsgs && messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400">Chưa có tin nhắn</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMe = msg.sender?.id === user?.id;
              const prev = messages[idx - 1];
              const showTime =
                !prev ||
                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

              const timeChip = showTime ? (
                <div className="text-center my-3">
                  <span className="text-[11px] text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : null;

              if (msg.message_type === 'SYSTEM') {
                const cp = msg.context_product;
                if (cp) {
                  return (
                    <div key={msg.id || idx}>
                      {timeChip}
                      <div className="flex justify-center my-2">
                        <div className="border border-gray-200 bg-white rounded-full shadow-sm overflow-x-auto max-w-[90%]">
                          <Link
                            href={`/products/${cp.id}`}
                            className="flex items-center gap-2 px-3 py-1.5 min-w-max hover:bg-gray-50 transition"
                          >
                            {cp.image && (
                              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                                <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <span className="text-xs text-gray-500">Đang hỏi về:</span>
                            <span className="text-xs font-bold text-gray-900">{cp.name}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || idx}>
                    {timeChip}
                    <div className="flex justify-center my-2">
                      <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-4 py-1.5 rounded-full max-w-[85%] text-center">
                        {msg.message_content}
                      </div>
                    </div>
                  </div>
                );
              }

              const quote = extractQuote(msg);
              if (msg.message_type === 'NEGOTIATION_QUOTE' && quote) {
                return (
                  <div key={msg.id || idx}>
                    {timeChip}
                    <div className={`flex items-end gap-2 mb-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                          {getPartnerName(activeConv).charAt(0)}
                        </div>
                      )}
                      <NegotiationQuoteCard
                        quote={quote}
                        isBuyer={true}
                        onAccept={() => respondToQuote(quote.messageId, 'ACCEPTED')}
                        onReject={() => respondToQuote(quote.messageId, 'REJECTED')}
                      />
                    </div>
                  </div>
                );
              }

              // IMAGE message
              if (msg.message_type === 'IMAGE' && (msg as any).image_url) {
                const imgUrl = resolveImageUrl((msg as any).image_url);
                return (
                  <div key={msg.id || idx}>
                    {timeChip}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                      <a
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`max-w-[70%] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      >
                        <img src={imgUrl} alt="Anh" className="w-full h-auto max-h-64 object-cover block" loading="lazy" />
                        {msg.message_content && (
                          <div className="px-2.5 py-1.5 text-xs text-gray-700">{msg.message_content}</div>
                        )}
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id || idx}>
                  {timeChip}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                        isMe ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.message_content}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          {uploadError && (
            <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-red-700 text-xs flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError(null)} className="text-red-600 hover:underline">Đóng</button>
            </div>
          )}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={handlePickImage}
                disabled={uploadingImage}
                className="w-10 h-10 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center justify-center transition disabled:opacity-50"
                title="Gửi ảnh"
              >
                {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={18} />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="w-11 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition disabled:opacity-60"
                aria-label="Gửi"
                title="Gửi"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (isSplit) {
    return (
      <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] bg-white">
        <div className="border-r border-gray-100">{ListPane}</div>
        <div>{ChatPane}</div>
      </div>
    );
  }

  // Popup: slide between list/chat
  return (
    <div className="h-full bg-white relative overflow-hidden">
      <div
        className={`h-full w-[200%] flex transition-transform duration-300 ${
          mobileView === 'list' ? 'translate-x-0' : '-translate-x-1/2'
        }`}
      >
        <div className="w-1/2 border-r border-gray-100">{ListPane}</div>
        <div className="w-1/2">{ChatPane}</div>
      </div>
    </div>
  );
}
