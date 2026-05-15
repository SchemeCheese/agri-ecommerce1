'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bot, Send, Loader2, AlertCircle, History, Plus } from 'lucide-react';
import { SOCKET_BASE_URL } from '@/lib/runtime-config';
import api from '@/lib/axios';

// ── Types ────────────────────────────────────────────────────────────────────
type AIMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  pending?: boolean; // true khi đang stream từ server
  error?: boolean;
  created_at?: string;
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

  const socketRef = useRef<Socket | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    socket.on('ai:token', (payload: { chunk: string; sessionId: string }) => {
      if (thinkingLabel) setThinkingLabel(null);
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
    streamingMsgIdRef.current = null;
    setShowHistory(false);
  }, []);

  // ── Gửi câu hỏi ────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || !socketRef.current?.connected || thinking) return;

    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: 'USER',
      content,
    };
    const placeholderId = `a-${Date.now()}`;
    streamingMsgIdRef.current = placeholderId;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: 'ASSISTANT', content: '', pending: true },
    ]);
    setDraft('');
    setError(null);

    socketRef.current.emit('ai:ask', {
      content,
      sessionId: sessionId ?? undefined,
      mode,
      context,
    });
  }, [draft, thinking, sessionId, mode, context]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header tools */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Bot size={16} className="text-green-600" />
          <span>AgriBot · {mode === 'BUYER' ? 'Người mua' : 'Người bán'}</span>
        </div>
        <div className="flex items-center gap-1">
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
              {m.role === 'ASSISTANT' && m.pending && !m.content && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Loader2 className="animate-spin" size={12} />
                  {thinkingLabel ?? 'đang soạn...'}
                </span>
              )}
              {m.content}
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
        <div className="flex items-center gap-2 bg-gray-50 rounded-full border border-gray-200 p-1">
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
            disabled={!draft.trim() || connecting || thinking}
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

export default AIAssistantPanel;
