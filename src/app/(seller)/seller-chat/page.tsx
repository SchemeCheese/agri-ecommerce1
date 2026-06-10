// src/app/(seller)/seller-chat/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/axios';
import { API_BASE_URL, SOCKET_BASE_URL, resolveImageUrl } from '@/lib/runtime-config';
import {
  MessageCircle, Send, Search, ChevronLeft,
  Loader2, ClipboardList, XCircle, RotateCcw, Bot, Handshake, ExternalLink, CheckCircle2, ImagePlus
} from 'lucide-react';
import { NegotiationQuoteCard } from '@/components/chat/NegotiationQuoteCard';
import { SellerQuoteForm, SellerProductOption } from '@/components/chat/SellerQuoteForm';
import { ChatSkeleton } from '@/components/ui/ChatSkeleton';
import {
  Message,
  Conversation,
  QuoteData,
  SendQuotePayload,
  extractQuote,
  extractNegotiationMsg,
  extractLatestNegotiationEvent,
  isNegotiationRequestMessage,
} from '@/types/chat';
import { formatCurrency } from '@/utils/vi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── helpers ─────────────────────────────────────────────────────────────────
const getPartnerName = (conv: Conversation) =>
  conv.partner?.profile?.store_name || conv.partner?.full_name || 'Khách hàng';

const formatTime = (dateStr: string) => {
  const d    = new Date(dateStr);
  const diffM = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffM < 1)    return 'Vừa xong';
  if (diffM < 60)   return `${diffM} phút`;
  if (diffM < 1440) return `${Math.floor(diffM / 60)} giờ`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// ─────────────────────────────────────────────────────────────────────────────
export default function SellerChatPage() {
  const { user } = useAuth();

  const [activeTab,     setActiveTab]     = useState<'buyer' | 'ai'>('buyer');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs,  setLoadingConvs]  = useState(false);
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [inputText,     setInputText]     = useState('');
  const [sending,       setSending]       = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [mobileView,    setMobileView]    = useState<'list' | 'chat'>('list');
  const [negotiationCancelledFor, setNegotiationCancelledFor] = useState<Set<string>>(new Set());
  const [sellerProducts, setSellerProducts] = useState<SellerProductOption[]>([]);
  const [orderInfoByQuote, setOrderInfoByQuote] = useState<Record<string, any>>({});

  const socketRef      = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // true = cuộn xuống đáy 1 lần (mở hội thoại / tự gửi). Tin đến khác → chỉ cuộn nếu gần đáy.
  const forceScrollBottomRef = useRef(true);
  const inputRef       = useRef<HTMLInputElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const router          = useRouter();

  // ── Load seller products (for quote form) ────────────────────────────────
  useEffect(() => {
    api.get('/products/my-products')
      .then(r => setSellerProducts(
        (r.data || []).map((p: any) => ({ id: p.id, name: p.name, unit: p.unit || 'kg' }))
      ))
      .catch(() => {});
  }, []);

  // ── Load conversations ───────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res          = await api.get('/chat/conversations');
      const data: Conversation[] = res.data;
      setConversations(data);
      return data;
    } catch { return [] as Conversation[]; }
    finally { setLoadingConvs(false); }
  }, []);

  // ── Load messages (paginated; first page = newest 30) ─────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages?limit=30`);
      const payload = res.data;
      const items = Array.isArray(payload) ? payload : payload?.items ?? [];
      forceScrollBottomRef.current = true; // mở hội thoại → cuộn xuống đáy 1 lần
      setMessages(items);

      // Extract orderInfo from NEGOTIATION_QUOTE messages
      const newOrderInfo: Record<string, any> = {};
      for (const msg of items) {
        if (msg.message_type === 'NEGOTIATION_QUOTE' && msg.orderInfo && msg.id) {
          newOrderInfo[msg.id] = msg.orderInfo;
          console.log('[SellerChat] Extracted orderInfo for quote', msg.id, ':', msg.orderInfo);
        }
      }
      if (Object.keys(newOrderInfo).length > 0) {
        setOrderInfoByQuote((prev) => ({ ...prev, ...newOrderInfo }));
      }
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  }, []);

  // ── Select conversation ──────────────────────────────────────────────
  const selectConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setMobileView('chat');
    activeConvIdRef.current = conv.id;
    socketRef.current?.emit('joinRoom', { conversationId: conv.id });
    await loadMessages(conv.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages]);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    const socket = io(`${SOCKET_BASE_URL.replace(/\/$/, '')}/chat`, {
      auth: { token: `Bearer ${token}` }, transports: ['websocket']
    });
    socket.on('connect',    () => {
      console.log('[SellerChat] connected');
      if (activeConvIdRef.current) {
        socket.emit('joinRoom', { conversationId: activeConvIdRef.current });
      }
    });
    socket.on('disconnect', () => console.log('[SellerChat] disconnected'));

    socket.on('newMessage', (msg: Message & { conversationId?: string }) => {
      const normalized: Message = {
        ...msg,
        message_content: (msg as any).message_content ?? (msg as any).content ?? '',
        message_type:    (msg as any).message_type ?? 'TEXT',
      };
      setMessages(prev => prev.find(m => m.id === normalized.id) ? prev : [...prev, normalized]);
    });

    // Unread realtime
    socket.on(
      'unreadUpdated',
      (payload: { conversationId: string; unread: number; totalUnread: number }) => {
        setConversations(prev =>
          prev.map(c => c.id === payload.conversationId ? { ...c, unread_count: payload.unread } : c),
        );
      },
    );
    socket.on('quoteUpdated', ({ messageId, status }: { messageId: string; status: QuoteData['status'] }) => {
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId) return m;
          if (m.quote) return { ...m, quote: { ...m.quote, status } };
          if (m.quote_status !== undefined) return { ...m, quote_status: status };
          return m;
        })
      );
    });
    socket.on('negotiationCancelled', ({ conversationId }: { conversationId: string }) => {
      setNegotiationCancelledFor(prev => new Set([...prev, conversationId]));
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [user]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Auto-scroll thông minh (không kéo user về đáy khi đang đọc tin cũ) ──────
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (forceScrollBottomRef.current) {
      forceScrollBottomRef.current = false;
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
      return;
    }
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !activeConv || !socketRef.current) return;
    setSending(true);
    forceScrollBottomRef.current = true; // tự gửi tin → cuộn xuống đáy
    socketRef.current.emit('sendMessage', {
      conversationId: activeConv.id,
      content: inputText.trim(),
      clientMessageId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    });
    setInputText('');
    setSending(false);
  }, [inputText, activeConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Image upload ─────────────────────────────────────────────────────────
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

  // ── Send quote ────────────────────────────────────────────────────────────
  const handleSendQuote = (data: Omit<SendQuotePayload, 'conversationId'>) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('sendNegotiationQuote', {
      conversationId: activeConv.id,
      ...data,
    });
  };

  // ── Cancel negotiation ──────────────────────────────────────────────────
  const handleCancelNegotiation = () => {
    if (!activeConv) return;
    socketRef.current?.emit('cancelNegotiation', { conversationId: activeConv.id });
  };

  const filteredConvs = conversations.filter(c =>
    getPartnerName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const negotiationMsg    = extractNegotiationMsg(messages);
  const negotiationEvent   = extractLatestNegotiationEvent(messages);
  const isNegotiationConv  = !!negotiationMsg;
  const isNegotiationOpen  = !!negotiationEvent && isNegotiationRequestMessage(negotiationEvent);
  const isCancelled       = activeConv ? negotiationCancelledFor.has(activeConv.id) : false;

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-100px)] flex overflow-hidden">

      {/* ──────────── LEFT: CONVERSATION LIST ──────────── */}
      <div className={`w-80 border-r border-gray-200 flex flex-col ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex w-full md:w-80'
      }`}>
        {/* Tabs: Khách hàng / AI */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('buyer')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'buyer' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Khách hàng
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className="flex-1 py-1.5 text-sm font-medium rounded-md transition text-gray-400 cursor-not-allowed relative"
              title="Sắp ra mắt"
              disabled
            >
              Trợ lý AI
              <span className="absolute -top-1 -right-1 text-[9px] bg-yellow-400 text-yellow-900 px-1 rounded font-bold">
                soon
              </span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-green-600" size={24} />
            </div>
          )}
          {!loadingConvs && filteredConvs.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageCircle size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Chưa có cuộc trò chuyện</p>
            </div>
          )}
          {filteredConvs.map(conv => {
            const name     = getPartnerName(conv);
            const isActive = activeConv?.id === conv.id;
            const lastMsg  = conv.lastMessage;
            const isNeg    = false; // negotiation derived per-message
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 ${
                  isActive ? 'bg-green-50 border-r-4 border-r-green-500' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden relative">
                  {conv.partner?.avatar
                    ? <img src={resolveImageUrl(conv.partner.avatar)} alt="" className="w-full h-full object-cover" />
                    : name.charAt(0).toUpperCase()}
                  {isNeg && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-orange-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">🤝</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{name}</h4>
                    {lastMsg && <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(lastMsg.created_at)}</span>}
                  </div>

                  {lastMsg && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs truncate flex-1 ${(conv.unread_count ?? 0) > 0 && !isActive ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                        {lastMsg.content}
                      </p>
                      {(conv.unread_count ?? 0) > 0 && !isActive && (
                        <span className="bg-green-600 text-white text-[10px] font-black rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                          {conv.unread_count! > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────── RIGHT: CHAT AREA ──────────── */}
      <div className={`flex-1 flex flex-col ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-semibold">Chọn cuộc trò chuyện</p>
            <p className="text-xs text-gray-400 mt-1">Danh sách bên trái hiển thị tất cả khách hàng</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold overflow-hidden">
                  {activeConv.partner?.avatar
                    ? <img src={resolveImageUrl(activeConv.partner.avatar)} alt="" className="w-full h-full object-cover" />
                    : getPartnerName(activeConv).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{getPartnerName(activeConv)}</h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    Online
                    {isNegotiationConv && (
                      <span className="ml-2 bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        Đàm phán
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* Seller actions */}
              <div className="flex items-center gap-2">
                  {isNegotiationConv && !isCancelled && isNegotiationOpen && (
                  <>
                    <button
                      onClick={() => setShowQuoteForm(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition shadow-sm"
                    >
                    <ClipboardList size={13} /> Gửi báo giá
                    </button>
                    <button
                      onClick={handleCancelNegotiation}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <XCircle size={13} /> Hủy
                    </button>
                  </>
                )}
                  {isNegotiationConv && !isCancelled && !isNegotiationOpen && (
                    <div className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                      Đã xử lý báo giá
                    </div>
                  )}
              </div>
            </div>

            {/* Negotiation banner - shows buyer's proposed terms */}
            {isNegotiationConv && negotiationMsg?.context_product && (
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-orange-700 font-medium mb-1">
                  <ClipboardList size={13} />
                  <span>Đàm phán: <strong>{negotiationMsg.context_product.name}</strong></span>
                </div>
                {(negotiationMsg.proposed_quantity || negotiationMsg.proposed_price) && (
                  <div className="flex items-center gap-4 text-xs bg-white border border-orange-100 rounded-lg px-3 py-2 mt-1">
                    <span className="text-gray-500">Khách đề xuất:</span>
                    {negotiationMsg.proposed_quantity && (
                      <span className="font-bold text-gray-800">{negotiationMsg.proposed_quantity} {negotiationMsg.context_product.unit || 'kg'}</span>
                    )}
                    {negotiationMsg.proposed_price && (
                      <>
                        <span className="text-gray-300">×</span>
                        <span className="font-bold text-orange-600">{formatCurrency(negotiationMsg.proposed_price)}/{negotiationMsg.context_product.unit || 'kg'}</span>
                        {negotiationMsg.proposed_quantity && (
                          <span className="ml-auto font-black text-orange-700">=&nbsp;{formatCurrency(negotiationMsg.proposed_price * negotiationMsg.proposed_quantity)}</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cancelled banner */}
            {isCancelled && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600 font-medium flex-shrink-0">
                <RotateCcw size={13} /> Đàm phán đã kết thúc.
              </div>
            )}

            {/* Messages */}
            <div ref={messagesScrollRef} className="flex-1 min-h-0 bg-gray-50 px-5 py-4 overflow-y-auto space-y-1">
              {loadingMsgs && <ChatSkeleton />}
              {!loadingMsgs && messages.length === 0 && (
                <div className="text-center py-10"><p className="text-xs text-gray-400">Chưa có tin nhắn</p></div>
              )}

              {messages.map((msg, idx) => {
                const isMe     = msg.sender?.id === user?.id;
                const prevMsg  = messages[idx - 1];
                const showTime = !prevMsg ||
                  (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;

                const TimeDiv = showTime ? (
                  <div className="text-center my-3">
                    <span className="text-[11px] text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(msg.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ) : null;

                // SYSTEM
                if (msg.message_type === 'SYSTEM') {
                  const cp = msg.context_product;
                  // SYSTEM + context_product + proposed → Thẻ thương lượng (seller view: 2 action buttons)
                  if (cp && msg.proposed_quantity) {
                    return (
                      <div key={msg.id || idx}>
                        {TimeDiv}
                        <div className="flex justify-center my-3">
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 w-full max-w-[360px] shadow-sm">
                            <p className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5">
                              <Handshake size={13}/> Khách hàng muốn thương lượng giá về:
                            </p>
                            {/* Product badge */}
                            <div className="flex items-center gap-2 mb-3 overflow-x-auto">
                              <div className="flex items-center gap-2 min-w-max">
                                {cp.image && (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                    <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{cp.name}</p>
                                  <p className="text-xs text-green-600">{formatCurrency(cp.reference_price ?? cp.price ?? 0)}/{cp.unit || 'kg'}</p>
                                </div>
                                <Link href={`/products/${cp.id}`} className="ml-1 text-gray-400 hover:text-green-600">
                                  <ExternalLink size={11}/>
                                </Link>
                              </div>
                            </div>
                            <div className="bg-white rounded-xl border border-orange-100 px-3 py-2 text-xs space-y-1 mb-3">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Số lượng muốn mua:</span>
                                <span className="font-bold">{msg.proposed_quantity} {cp.unit || 'kg'}</span>
                              </div>
                              {msg.proposed_price && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Giá khách đề xuất:</span>
                                  <span className="font-bold text-orange-600">{formatCurrency(msg.proposed_price)}/{cp.unit || 'kg'}</span>
                                </div>
                              )}
                              {msg.proposed_price && (
                                <div className="flex justify-between border-t border-orange-100 pt-1">
                                  <span className="text-gray-600 font-medium">Tổng:</span>
                                  <span className="font-black text-orange-700">{formatCurrency(msg.proposed_price * msg.proposed_quantity)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (!activeConv || !socketRef.current) return;
                                  // Chấp nhận giá khách đề xuất: gửi quote với đúng giá đó
                                  socketRef.current.emit('sendNegotiationQuote', {
                                    conversationId: activeConv.id,
                                    productId:   cp.id,
                                    productName: cp.name,
                                    quantity:    msg.proposed_quantity!,
                                    price:       msg.proposed_price ?? (cp.reference_price ?? cp.price ?? 0),
                                    unit:        cp.unit || 'kg',
                                  });
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition"
                              >
                                <CheckCircle2 size={13}/> Chấp nhận &amp; Gửi đơn
                              </button>
                              <button
                                onClick={handleCancelNegotiation}
                                className="flex items-center justify-center gap-1 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition"
                              >
                                <XCircle size={13}/> Từ chối
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // SYSTEM + context_product (chút → badge sản phẩm)
                  if (cp) {
                    return (
                      <div key={msg.id || idx}>
                        {TimeDiv}
                        <div className="flex justify-center my-2">
                          <div className="border border-gray-200 bg-white rounded-full shadow-sm overflow-x-auto max-w-[90%]">
                            <Link href={`/products/${cp.id}`} className="flex items-center gap-2 px-3 py-1.5 min-w-max hover:bg-gray-50 transition">
                              {cp.image && (
                                <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                                  <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                                   <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                                   <img src={resolveImageUrl(cp.image)} alt={cp.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <span className="text-xs text-gray-500">Đang hỏi về:</span>
                              <span className="text-xs font-bold text-gray-900">{cp.name}</span>
                              <ExternalLink size={11} className="text-gray-300"/>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // Plain SYSTEM
                  return (
                    <div key={msg.id || idx}>
                      {TimeDiv}
                      <div className="flex justify-center my-2">
                        <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-4 py-1.5 rounded-full max-w-[85%] text-center">
                          {msg.message_content}
                        </div>
                      </div>
                    </div>
                  );
                }

                // NEGOTIATION_QUOTE card (seller sees it with no action buttons)
                const quote = extractQuote(msg);
                if (msg.message_type === 'NEGOTIATION_QUOTE' && quote) {
                  return (
                    <div key={msg.id || idx}>
                      {TimeDiv}
                      <div className={`flex items-end gap-2 mb-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                            {getPartnerName(activeConv).charAt(0)}
                          </div>
                        )}
                        <NegotiationQuoteCard
                          quote={quote}
                          isBuyer={false}  // seller view → no accept/reject buttons
                          orderInfo={orderInfoByQuote[msg.id]}
                          currentUser={user ? { id: user.id, is_buyer: user.is_buyer, is_seller: user.is_seller } : undefined}
                        />
                      </div>
                    </div>
                  );
                }

                // IMAGE
                if (msg.message_type === 'IMAGE' && (msg as any).image_url) {
                  const imgUrl = (msg as any).image_url.startsWith('http')
                    ? (msg as any).image_url
                    : `${API_BASE_URL}${(msg as any).image_url}`;
                  return (
                    <div key={msg.id || idx}>
                      {TimeDiv}
                      <div className={`flex items-end gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                            {getPartnerName(activeConv).charAt(0)}
                          </div>
                        )}
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`max-w-[60%] rounded-2xl overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} shadow-sm border border-gray-100 bg-white`}
                        >
                          <img src={imgUrl} alt="Ảnh" className="w-full h-auto max-h-72 object-cover block" loading="lazy" />
                          {msg.message_content && (
                            <div className="px-3 py-1.5 text-xs text-gray-700">{msg.message_content}</div>
                          )}
                        </a>
                      </div>
                    </div>
                  );
                }

                // TEXT
                return (
                  <div key={msg.id || idx}>
                    {TimeDiv}
                    <div className={`flex items-end gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                          {getPartnerName(activeConv).charAt(0)}
                        </div>
                      )}
                      <div className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-green-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}>
                        {msg.message_content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {uploadError && (
              <div className="px-4 py-1.5 bg-red-50 border-t border-red-100 text-red-700 text-xs flex items-center justify-between">
                <span>⚠️ {uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-red-600 hover:underline">Đóng</button>
              </div>
            )}
            <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-2 flex-shrink-0">
              {isNegotiationConv && !isCancelled && isNegotiationOpen && (
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="p-2.5 text-green-600 hover:bg-green-50 border border-green-200 rounded-xl transition flex-shrink-0"
                  title="Gửi báo giá"
                >
                  <ClipboardList size={18} />
                </button>
              )}
              {isNegotiationConv && !isCancelled && !isNegotiationOpen && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl">
                  Đã khóa báo giá
                </div>
              )}
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
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition flex-shrink-0 disabled:opacity-50"
                title="Gửi ảnh"
              >
                {uploadingImage ? <Loader2 className="animate-spin" size={18}/> : <ImagePlus size={18}/>}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quote form modal */}
      {showQuoteForm && (
        <SellerQuoteForm
          products={sellerProducts}
          defaultProduct={
            negotiationMsg?.context_product
              ? {
                  id:       negotiationMsg.context_product.id,
                  name:     negotiationMsg.context_product.name,
                  unit:     negotiationMsg.context_product.unit || 'kg',
                  quantity: negotiationMsg.proposed_quantity ?? undefined,
                }
              : undefined
          }
          onSend={handleSendQuote}
          onClose={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  );
}

