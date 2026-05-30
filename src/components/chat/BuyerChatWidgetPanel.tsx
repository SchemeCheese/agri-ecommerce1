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
import { formatCurrency } from '@/utils/vi';
import {
  Conversation,
  Message,
  QuoteData,
  extractQuote,
} from '@/types/chat';
import { NegotiationQuoteCard, QuoteOrderInfo } from '@/components/chat/NegotiationQuoteCard';
import { PaymentResultModal } from '@/components/chat/PaymentResultModal';

// Payload BE emit qua WS event `orderStatusUpdated` — sau MoMo IPN hoặc các
// trạng thái khác. messageId optional vì BE không phải lúc nào cũng biết quote
// nào liên kết với order (FE tự map qua orderId).
interface OrderStatusUpdatedPayload {
  orderId:           string;
  checkoutSessionId?: string | null;
  paymentMethod?:    string;
  paymentStatus?:    'UNPAID' | 'PAID' | 'FAILED';
  orderStatus?:      'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | string;
}

// Payload BE emit qua WS event `quoteAccepted` sau khi tạo Order tự động.
interface QuoteAcceptedPayload {
  messageId:           string;
  orderId:             string;
  checkoutSessionId:   string;
  sellerId:            string;
  productId:           string;
  productName:         string;
  quantity:            number;
  unit:                string;
  negotiatedPrice:     number;
  totalAmount:         number;
  paymentMethod:       'COD' | 'MOMO' | 'QR_CODE' | 'ZALOPAY';
  awaitsPaymentSelection: boolean;
}

interface NegotiationErrorPayload {
  messageId: string;
  code:      'MISSING_SHIPPING_ADDRESS' | string;
  message:   string;
}

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

  // Per-message order info từ quoteAccepted — key = quote messageId.
  // Card đọc map này để render Pay Now selector inline thay vì redirect /checkout.
  const [orderInfoByQuote, setOrderInfoByQuote] = useState<Record<string, QuoteOrderInfo>>({});
  // Modal "Vui lòng cập nhật địa chỉ" khi BE từ chối ACCEPT vì address rỗng.
  const [missingAddrModal, setMissingAddrModal] = useState<{ messageId: string; message: string } | null>(null);
  // Spinner cho 1 quote đang gọi /payments/momo/create.
  const [payingQuoteId, setPayingQuoteId] = useState<string | null>(null);
  // Overlay MoMo QR — hiển thị khi BE trả payUrl/deeplink/qrCodeUrl.
  const [momoRedirecting, setMomoRedirecting] = useState(false);
  const [momoPaymentData, setMomoPaymentData] = useState<{
    amount?: number;
    payUrl?: string;
    deeplink?: string;
    qrCodeUrl?: string;
  } | null>(null);

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

    // Checkout-in-chat: BE đã tạo Order khi buyer ACCEPT — không redirect sang
    // /checkout nữa, chỉ lưu orderInfo để card render Pay Now selector inline.
    // Event `quoteAccepted` (đổi tên từ `negotiationAccepted` cho rõ semantic).
    socket.on('quoteAccepted', (payload: QuoteAcceptedPayload) => {
      setOrderInfoByQuote((prev) => ({
        ...prev,
        [payload.messageId]: {
          orderId:           payload.orderId,
          checkoutSessionId: payload.checkoutSessionId,
          totalAmount:       payload.totalAmount,
          awaitsPaymentSelection: payload.awaitsPaymentSelection,
          selectedMethod:    null,
        },
      }));
    });

    // ACCEPT bị BE chặn (vd MISSING_SHIPPING_ADDRESS) — bật modal bắt buyer cập
    // nhật profile, quote vẫn PENDING để buyer accept lại sau khi sửa.
    socket.on('negotiationError', (payload: NegotiationErrorPayload) => {
      if (payload.code === 'MISSING_SHIPPING_ADDRESS') {
        setMissingAddrModal({ messageId: payload.messageId, message: payload.message });
      }
    });

    // Order status update từ BE — chủ yếu sau MoMo IPN flip session=PAID,
    // Order=CONFIRMED. FE tìm quote có orderId khớp rồi update paymentStatus/
    // orderStatus để card chuyển sang "Đã thanh toán & xác nhận" tự động.
    socket.on('orderStatusUpdated', (payload: OrderStatusUpdatedPayload) => {
      setOrderInfoByQuote((prev) => {
        const next = { ...prev };
        let matchedMessageId: string | null = null;
        for (const [msgId, info] of Object.entries(prev)) {
          if (info.orderId === payload.orderId) {
            matchedMessageId = msgId;
            next[msgId] = {
              ...info,
              paymentStatus: payload.paymentStatus ?? info.paymentStatus,
              orderStatus:   payload.orderStatus   ?? info.orderStatus,
            };
            break;
          }
        }
        // Tắt overlay MoMo nếu update này là cho order đang redirect
        if (matchedMessageId && payload.paymentStatus === 'PAID') {
          setMomoRedirecting(false);
        }
        return next;
      });
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

  // Buyer click MoMo/COD trong card sau khi ACCEPT báo giá. KHÔNG navigate
  // sang /checkout — chat ở yên trong widget. COD: inject SYSTEM message
  // confirm vào chat history. MoMo: mở modal QR trong chat, kèm link dự phòng.
  const handleSelectPayment = useCallback(
    async (messageId: string, method: 'COD' | 'MOMO') => {
      const info = orderInfoByQuote[messageId];
      if (!info) return;
      setPayingQuoteId(messageId);
      try {
        if (method === 'MOMO') {
          const { data } = await api.post('/payments/momo/create', {
            checkout_session_id: info.checkoutSessionId,
          });

          setMomoPaymentData({
            amount: Number(info.totalAmount ?? 0),
            payUrl: data?.payUrl,
            deeplink: data?.deeplink,
            qrCodeUrl: data?.qrCodeUrl,
          });

          if (data?.payUrl || data?.deeplink || data?.qrCodeUrl) {
            setMomoRedirecting(true);
          }

          setOrderInfoByQuote((prev) => ({
            ...prev,
            [messageId]: { ...prev[messageId], selectedMethod: 'MOMO' },
          }));
          return;
        }

        const { data } = await api.post(`/orders/${info.orderId}/change-payment-method`, {
          payment_method: method,
        });
        // Mark selectedMethod để card show kết quả
        setOrderInfoByQuote((prev) => ({
          ...prev,
          [messageId]: { ...prev[messageId], selectedMethod: method },
        }));

        if (method === 'COD') {
          // In-chat confirmation: push 1 SYSTEM message ngay vào history hiện tại
          // (synthetic — không persist DB, không gửi WS). Buyer thấy luồng đặt
          // hàng hoàn tất ngay trong chat thay vì redirect ra page khác.
          const shortId = info.orderId.slice(-6).toUpperCase();
          const syntheticMsg: Message = {
            id:              `local-cod-${info.orderId}`,
            message_content: `✅ Đơn #${shortId} đã được đặt thành công (COD). Seller đang chờ xác nhận.`,
            message_type:    'SYSTEM',
            created_at:      new Date().toISOString(),
            sender:          { id: user?.id ?? '', full_name: user?.full_name ?? '' },
          };
          setMessages((prev) => [...prev, syntheticMsg]);
        }

      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Không cập nhật được phương thức thanh toán.';
        alert(typeof msg === 'string' ? msg : 'Lỗi cập nhật phương thức thanh toán.');
      } finally {
        setPayingQuoteId(null);
      }
    },
    [orderInfoByQuote, user]
  );

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
    <div className="flex h-full flex-col relative">
      {/* MoMo QR overlay — phủ ChatPane khi click "Trả qua MoMo". */}
      <PaymentResultModal
        open={momoRedirecting}
        message="Thanh toán MoMo"
        subMessage="Quét mã QR để thanh toán hoặc mở MoMo nếu bạn muốn dùng ứng dụng."
        payment={momoPaymentData}
        onOpenPayment={() => {
          const url = momoPaymentData?.payUrl || momoPaymentData?.deeplink;
          if (url) window.location.href = url;
        }}
      />
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

                // SYSTEM + context_product + proposed_quantity → "Yêu cầu thương lượng"
                // Buyer chính họ vừa khởi tạo → hiển thị card đầy đủ kg/giá/tổng để
                // họ thấy lại đã đề xuất gì (seller side đã có UI riêng).
                if (cp && msg.proposed_quantity != null) {
                  const qty = Number(msg.proposed_quantity);
                  const price = msg.proposed_price != null ? Number(msg.proposed_price) : null;
                  const total = price != null ? qty * price : null;
                  const unit = cp.unit || 'kg';

                  return (
                    <div key={msg.id || idx}>
                      {timeChip}
                      <div className="flex justify-center my-2 px-2">
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 w-full max-w-[320px] shadow-sm">
                          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-orange-100">
                            <span className="text-base">🌾</span>
                            <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                              Yêu cầu thương lượng
                            </span>
                          </div>
                          <Link
                            href={`/products/${cp.id}`}
                            className="flex items-center gap-2 mb-2 hover:opacity-80"
                          >
                            {cp.image && (
                              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-orange-100">
                                <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <span className="text-sm font-bold text-gray-900 truncate">{cp.name}</span>
                          </Link>
                          <div className="bg-white rounded-xl border border-orange-100 px-3 py-2 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Số lượng:</span>
                              <span className="font-bold text-gray-900">{qty} {unit}</span>
                            </div>
                            {price != null && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Giá đề xuất:</span>
                                  <span className="font-bold text-orange-600">{formatCurrency(price)}/{unit}</span>
                                </div>
                                <div className="flex justify-between border-t border-orange-100 pt-1">
                                  <span className="text-gray-600 font-medium">Tổng:</span>
                                  <span className="font-black text-orange-700">{formatCurrency(total!)}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-orange-700/80 mt-2 text-center">
                            Đang chờ shop phản hồi báo giá...
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // SYSTEM + context_product (chỉ chip sản phẩm — câu hỏi thường về SP)
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
                const orderInfo = orderInfoByQuote[quote.messageId];
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
                        orderInfo={orderInfo}
                        onSelectPayment={(method) => handleSelectPayment(quote.messageId, method)}
                        paymentLoading={payingQuoteId === quote.messageId}
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

  // Modal "Vui lòng cập nhật địa chỉ giao hàng" — bật khi BE từ chối ACCEPT báo
  // giá vì profile.address rỗng. Buyer click "Cập nhật" → router.push(/profile)
  // để sửa, rồi quay lại accept lại quote (vẫn PENDING).
  const MissingAddressModal = missingAddrModal && (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-lg">
              ⚠️
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm">Cần địa chỉ giao hàng</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{missingAddrModal.message}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMissingAddrModal(null)}
            className="px-3 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={() => {
              setMissingAddrModal(null);
              router.push('/profile?tab=info');
            }}
            className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition"
          >
            Cập nhật ngay
          </button>
        </div>
      </div>
    </div>
  );

  if (isSplit) {
    return (
      <>
        <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] bg-white">
          <div className="border-r border-gray-100">{ListPane}</div>
          <div>{ChatPane}</div>
        </div>
        {MissingAddressModal}
      </>
    );
  }

  // Popup: slide between list/chat
  return (
    <>
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
      {MissingAddressModal}
    </>
  );
}
