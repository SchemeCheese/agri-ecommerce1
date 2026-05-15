"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Maximize2,
  MessageCircle,
  Minimize2,
  Store,
  TicketPercent,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import LoginRequiredDialog from "@/components/common/LoginRequiredDialog";
import BuyerChatWidgetPanel from "@/components/chat/BuyerChatWidgetPanel";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";

type ChatType = "none" | "human" | "bot";

export const ChatWidget = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // UI state (giữ nguyên giao diện cũ, chỉ thêm logic)
  const [isOpen, setIsOpen] = useState(false); // mở/đóng menu
  const [activeChat, setActiveChat] = useState<ChatType>("none"); // loại chat đang mở
  const [isFullScreen, setIsFullScreen] = useState(false); // phóng to toàn màn hình
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  const chatTitle = useMemo(() => {
    if (activeChat === "bot") return "Trợ lý AI AgriBot";
    if (activeChat === "human") return "Chat với Shop";
    return "";
  }, [activeChat]);

  const openChat = (type: Exclude<ChatType, "none">) => {
    // Cả 2 loại chat đều yêu cầu đăng nhập (AI cần JWT để tạo session, lịch sử)
    if (!isAuthenticated) {
      setIsOpen(false);
      setShowLoginRequired(true);
      return;
    }

    setActiveChat(type);
    setIsOpen(false);
    setIsFullScreen(false);
  };

  const closeChat = () => {
    setActiveChat("none");
    setIsFullScreen(false);
  };

  return (
    <>
      <LoginRequiredDialog
        open={showLoginRequired}
        onClose={() => setShowLoginRequired(false)}
        onConfirmLogin={() => {
          const returnUrl = pathname || "/";
          setShowLoginRequired(false);
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }}
      />

      {/* Khung chat (cửa sổ nhỏ / full-screen) */}
      {activeChat !== "none" && (
        <div
          className={`fixed bg-white shadow-2xl border border-gray-200 transition-all duration-300 z-50 flex flex-col overflow-hidden ${
            isFullScreen
              ? "inset-0 w-full h-full rounded-none"
              : "bottom-24 right-6 w-[350px] h-[500px] rounded-2xl"
          }`}
          role="dialog"
          aria-label={chatTitle}
        >
          {activeChat === "human" ? (
            <BuyerChatWidgetPanel
              mode={isFullScreen ? "fullscreen" : "popup"}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen((v) => !v)}
              onClose={closeChat}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-green-600 text-white">
                <div className="flex items-center gap-2 font-semibold">
                  <Bot size={20} />
                  {chatTitle}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                    title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
                    aria-label={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
                  >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                    title="Đóng"
                    aria-label="Đóng"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* AI Assistant panel — kết nối WS /ai-chat, stream token, lịch sử session */}
              <AIAssistantPanel className="flex-1" />
            </>
          )}
        </div>
      )}

      {/* Cụm Nút mở menu & Popover (giữ nguyên UI cũ) */}
      {activeChat === "none" && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {/* Menu Chat */}
          {isOpen && (
            <div className="mb-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-72 animate-in slide-in-from-bottom-5 fade-in duration-200">
              <div className="p-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">Hỗ trợ khách hàng</h4>
                <p className="text-xs text-gray-500">Chúng tôi sẵn sàng giúp đỡ bạn</p>
              </div>

              <div className="flex flex-col gap-1 p-2">
                <button
                  type="button"
                  onClick={() => openChat("bot")}
                  className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Bot size={20} />
                  </div>
                  <div>
                    <span className="block font-semibold text-sm text-gray-800">Trợ lý AI AgriBot</span>
                    <span className="text-xs text-gray-500">Hỏi đáp tự động 24/7</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openChat("human")}
                  className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="block font-semibold text-sm text-gray-800">Chat với Shop</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <TicketPercent size={12} className="text-red-500" />
                      {isAuthenticated ? "Xem tin nhắn & ưu đãi" : "Cần đăng nhập"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Nút Chat Chính */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="group flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-green-200"
            aria-label={isOpen ? "Đóng menu chat" : "Mở menu chat"}
          >
            {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            {!isOpen && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      )}
    </>
  );
};