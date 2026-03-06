'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/axios';
import { Container } from '@/components/ui/Container';
import {
  MessageCircle, Send, Search, ChevronLeft,
  Loader2, Store, Handshake, XCircle, RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { NegotiationQuoteCard } from '@/components/chat/NegotiationQuoteCard';
import { Message, Conversation, QuoteData, CheckoutData } from '@/types/chat';

// ─── helpers ─────────────────────────────────────────────────────────────────
const getPartnerName = (conv: Conversation) =>
  conv.partner?.profile?.store_name || conv.partner?.full_name || 'Người dùng';

const formatTime = (dateStr: string) => {
  const d      = new Date(dateStr);
  const diffM  = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffM < 1)    return 'Vừa xong';
  if (diffM < 60)   return `${diffM} phút`;
  if (diffM < 1440) return `${Math.floor(diffM / 60)} giờ`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router       = useRouter();
  const { user }     = useAuth();
  const searchParams = useSearchParams();

  // URL params
  const sellerIdParam   = searchParams?.get('sellerId');
  const convIdParam     = searchParams?.get('conversationId');
  const isNegotiate     = searchParams?.get('negotiate') === '1';
  const productIdParam  = searchParams?.get('productId');
  const qtyParam        = Number(searchParams?.get('qty') || 0);

  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [loadingConvs,   setLoadingConvs]   = useState(false);
  const [activeConv,     setActiveConv]     = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const [inputText,      setInputText]      = useState('');
  const [sending,        setSending]        = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [mobileView,     setMobileView]     = useState<'list' | 'chat'>('list');
  const [negotiationCancelledFor, setNegotiationCancelledFor] = useState<Set<string>>(new Set());
  const negotiationStartedRef = useRef(false);

  const socketRef      = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);


  // ── Load conversations ───────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await api.get('/chat/conversations');
      const data: Conversation[] = res.data;
      setConversations(data);
      return data;
    } catch (err) {
      console.error('[Chat] loadConversations error:', err);
      return [] as Conversation[];
    } finally { setLoadingConvs(false); }
  }, []);

  // ── Load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('[Chat] loadMessages error:', err);
    } finally { setLoadingMsgs(false); }
  }, []);

  // ── Select conversation ──────────────────────────────────────────────────
  const selectConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setMobileView('chat');
    socketRef.current?.emit('joinRoom', { conversationId: conv.id });
    await loadMessages(conv.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages]);
  // ── Emit startNegotiation (only once per mount) ─────────────────────
  const emitStartNegotiation = useCallback((conversationId: string) => {
    if (negotiationStartedRef.current) return;
    if (!productIdParam || !qtyParam)  return;
    negotiationStartedRef.current = true;
    socketRef.current?.emit('startNegotiation', {
      conversationId,
      productId: productIdParam,
      quantity:  qtyParam,
    });
  }, [productIdParam, qtyParam]);

  // ── Cancel negotiation ──────────────────────────────────────
  const handleCancelNegotiation = () => {
    if (!activeConv) return;
    socketRef.current?.emit('cancelNegotiation', { conversationId: activeConv.id });
  };

  // ── Respond to quote ────────────────────────────────────────
  const respondToQuote = (messageId: string, action: 'ACCEPTED' | 'REJECTED') => {
    if (!activeConv) return;
    socketRef.current?.emit('respondToQuote', {
      messageId,
      action,
      conversationId: activeConv.id,
    });
  };
  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const socket = io('http://localhost:3001/chat', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
    });

    socket.on('connect', () => console.log('[Chat] Socket connected'));
    socket.on('disconnect', () => console.log('[Chat] Socket disconnected'));

    socket.on('newMessage', (msg: Message) => {
      setMessages(prev =>
        prev.find(m => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    // Quote status updated
    socket.on('quoteUpdated', ({ messageId, status }: { messageId: string; status: string }) => {
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId || !m.quote) return m;
          return { ...m, quote: { ...m.quote, status: status as QuoteData['status'] } };
        })
      );
    });

    // Buyer accepted → redirect to checkout
    socket.on('negotiationAccepted', ({ checkoutData }: { checkoutData: CheckoutData }) => {
      const { productId, productName, quantity, negotiatedPrice, unit, sellerId: sId } = checkoutData;
      router.push(
        `/checkout?ng=1` +
        `&id=${encodeURIComponent(productId)}` +
        `&name=${encodeURIComponent(productName)}` +
        `&qty=${quantity}` +
        `&price=${encodeURIComponent(negotiatedPrice)}` +
        `&unit=${encodeURIComponent(unit)}` +
        `&sellerId=${encodeURIComponent(sId)}`
      );
    });

    // Negotiation cancelled
    socket.on('negotiationCancelled', ({ conversationId }: { conversationId: string }) => {
      setNegotiationCancelledFor(prev => new Set([...prev, conversationId]));
    });

    socket.on('conversationReady', ({ conversationId }: { conversationId: string }) => {
      socket.emit('joinRoom', { conversationId });
      loadConversations().then(convs => {
        const conv = convs.find(c => c.id === conversationId);
        if (conv) {
          selectConversation(conv).then(() => {
            if (isNegotiate) emitStartNegotiation(conversationId);
          });
        }
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [user, loadConversations, selectConversation]);

  // ── Init: load convs + handle URL params ─────────────────────────────────
  useEffect(() => {
    loadConversations().then(convs => {
      if (convIdParam) {
        const conv = convs.find(c => c.id === convIdParam);
        if (conv) selectConversation(conv);
        return;
      }
      if (sellerIdParam) {
        const existing = convs.find(c => c.partner?.id === sellerIdParam);
        const openConv = (conv: Conversation) => {
          selectConversation(conv).then(() => {
            if (isNegotiate) emitStartNegotiation(conv.id);
          });
        };
        if (existing) { openConv(existing); return; }
        api
          .post('/chat/initiate', { partnerId: sellerIdParam })
          .then(res => {
            socketRef.current?.emit('joinRoom', { conversationId: res.data.conversationId });
            return loadConversations().then(fresh => {
              const c = fresh.find(f => f.id === res.data.conversationId)
                     || fresh.find(f => f.partner?.id === sellerIdParam);
              if (c) openConv(c);
            });
          })
          .catch(() => {
            const tryStart = () =>
              socketRef.current?.emit('startConversation', { partnerId: sellerIdParam });
            if (socketRef.current?.connected) tryStart();
            else {
              const iv = setInterval(() => {
                if (socketRef.current?.connected) { tryStart(); clearInterval(iv); }
              }, 300);
            }
          });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerIdParam, convIdParam]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !activeConv || !socketRef.current) return;
    setSending(true);
    socketRef.current.emit('sendMessage', {
      conversationId: activeConv.id,
      content:        inputText.trim(),
    });
    setInputText('');
    setSending(false);
  }, [inputText, activeConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvs = conversations.filter(c =>
    getPartnerName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isNegotiationConv = activeConv?.conversation_type === 'NEGOTIATION';
  const isCancelled       = activeConv ? negotiationCancelledFor.has(activeConv.id) : false;

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-gray-50 min-h-screen pt-4 pb-10">
      <Container>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-green-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Tin nhắn</span>
        </div>

        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          style={{ height: 'calc(100vh - 160px)', minHeight: 520 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">

            {/* ══════════ LEFT: CONVERSATION LIST ══════════ */}
            <div className={`border-r border-gray-100 flex flex-col h-full ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-white">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <MessageCircle size={20} className="text-green-600"/> Tin nhắn
                </h2>
                <div className="mt-3 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loadingConvs && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-green-600" size={24}/>
                  </div>
                )}

                {!loadingConvs && filteredConvs.length === 0 && (
                  <div className="text-center py-16 px-4">
                    <MessageCircle size={48} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm font-semibold text-gray-500">Chưa có cuộc trò chuyện</p>
                    <p className="text-xs text-gray-400 mt-1">Bấm &quot;Chat ngay&quot; trên trang sản phẩm để bắt đầu</p>
                  </div>
                )}

                {filteredConvs.map(conv => {
                  const name     = getPartnerName(conv);
                  const isActive = activeConv?.id === conv.id;
                  const lastMsg  = conv.lastMessage;
                  const isMyMsg  = lastMsg?.sender_id === user?.id;
                  const isNeg    = conv.conversation_type === 'NEGOTIATION';
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50 ${
                        isActive ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-green-100 flex-shrink-0 flex items-center justify-center text-green-700 font-black text-lg border border-gray-100">
                        {conv.partner?.avatar
                          ? <img src={`http://localhost:3001${conv.partner.avatar}`} alt="" className="w-full h-full object-cover"/>
                          : name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className={`font-bold text-sm truncate ${isActive ? 'text-green-700' : 'text-gray-900'}`}>{name}</p>
                          {lastMsg && (
                            <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(lastMsg.created_at)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isNeg && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                              Đàm phán
                            </span>
                          )}
                          {lastMsg && (
                            <p className="text-xs text-gray-400 truncate">
                              {isMyMsg ? 'Bạn: ' : ''}{lastMsg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ══════════ RIGHT: CHAT WINDOW ══════════ */}
            <div className={`flex flex-col h-full ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-20 h-20 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                    <MessageCircle size={36} className="text-green-400"/>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">Chọn cuộc trò chuyện</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Hoặc tìm sản phẩm và bấm &quot;Chat ngay&quot;<br/>để bắt đầu nhắn tin với người bán.
                  </p>
                  <Link
                    href="/products"
                    className="mt-6 bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                  >
                    Khám phá sản phẩm
                  </Link>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <ChevronLeft size={20}/>
                    </button>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-green-100 flex-shrink-0 flex items-center justify-center text-green-700 font-black border border-gray-100">
                      {activeConv.partner?.avatar
                        ? <img src={`http://localhost:3001${activeConv.partner.avatar}`} alt="" className="w-full h-full object-cover"/>
                        : getPartnerName(activeConv).charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{getPartnerName(activeConv)}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"/>
                        Đang hoạt động
                        {isNegotiationConv && (
                          <span className="ml-2 bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Đang đàm phán
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isNegotiationConv && !isCancelled && (
                        <button
                          onClick={handleCancelNegotiation}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <XCircle size={13}/> Hủy đàm phán
                        </button>
                      )}
                      <Link
                        href={`/shop/${activeConv.partner?.id}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Store size={13}/> Xem shop
                      </Link>
                    </div>
                  </div>

                  {/* Negotiation info banner */}
                  {isNegotiationConv && activeConv.product && (
                    <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2 text-xs text-orange-700">
                      <Handshake size={13}/>
                      <span>Đàm phán giá: <strong>{activeConv.product.name}</strong></span>
                    </div>
                  )}

                  {/* Cancelled banner */}
                  {isCancelled && (
                    <div className="px-5 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600 font-medium">
                      <RotateCcw size={13}/> Đàm phán đã kết thúc. Bạn có thể tiếp tục nhắn tin bình thường.
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/50">
                    {loadingMsgs && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-green-600" size={24}/>
                      </div>
                    )}
                    {!loadingMsgs && messages.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-sm text-gray-400">Hãy gửi tin nhắn đầu tiên! 👋</p>
                      </div>
                    )}

                    {messages.map((msg, idx) => {
                      const isMe    = msg.sender_id === user?.id;
                      const prevMsg = messages[idx - 1];
                      const showTime = !prevMsg ||
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;

                      const TimeDiv = showTime ? (
                        <div className="text-center my-3">
                          <span className="text-[11px] text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                            {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{new Date(msg.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      ) : null;

                      // SYSTEM message
                      if (msg.message_type === 'SYSTEM') {
                        return (
                          <div key={msg.id || idx}>
                            {TimeDiv}
                            <div className="flex justify-center my-2">
                              <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-4 py-1.5 rounded-full max-w-[85%] text-center">
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // NEGOTIATION_QUOTE card
                      if (msg.message_type === 'NEGOTIATION_QUOTE' && msg.quote) {
                        return (
                          <div key={msg.id || idx}>
                            {TimeDiv}
                            <div className={`flex items-end gap-2 mb-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0 border border-gray-100">
                                  {getPartnerName(activeConv).charAt(0)}
                                </div>
                              )}
                              <NegotiationQuoteCard
                                quote={msg.quote}
                                isBuyer={!isMe}
                                onAccept={() => respondToQuote(msg.quote!.messageId, 'ACCEPTED')}
                                onReject={() => respondToQuote(msg.quote!.messageId, 'REJECTED')}
                              />
                            </div>
                          </div>
                        );
                      }

                      // TEXT message
                      return (
                        <div key={msg.id || idx}>
                          {TimeDiv}
                          <div className={`flex items-end gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0 border border-gray-100 mb-0.5">
                                {getPartnerName(activeConv).charAt(0)}
                              </div>
                            )}
                            <div className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-green-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef}/>
                  </div>

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 outline-none text-sm bg-gray-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || sending}
                      className="p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-all flex-shrink-0 shadow-sm"
                    >
                      {sending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </Container>
    </div>
  );
}
