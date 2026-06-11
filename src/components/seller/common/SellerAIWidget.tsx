"use client";

import React, { useState } from "react";
import { Bot, Maximize2, Minimize2, X } from "lucide-react";

import AIAssistantPanel from "@/components/ai/AIAssistantPanel";

/**
 * Nút nổi trợ lý AI dành riêng cho workspace người bán.
 *
 * Khác ChatWidget của buyer: seller chỉ cần kênh AI (mode=SELLER) — không có
 * "Chat với Shop". Vì vậy bấm nút là mở thẳng AgriBot, không qua menu chọn loại.
 * AIAssistantPanel tự lo JWT/session nên ở đây chỉ quản lý mở/đóng + full-screen.
 */
export const SellerAIWidget = () => {
  const [activeChat, setActiveChat] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const closeChat = () => {
    setActiveChat(false);
    setIsFullScreen(false);
  };

  return (
    <>
      {/* Khung chat (cửa sổ nhỏ / full-screen) */}
      {activeChat && (
        <div
          className={`fixed bg-white shadow-2xl border border-gray-200 transition-all duration-300 z-50 flex flex-col overflow-hidden ${
            isFullScreen
              ? "inset-0 w-full h-full rounded-none"
              : "bottom-24 right-6 w-[350px] h-[500px] rounded-2xl"
          }`}
          role="dialog"
          aria-label="Trợ lý AI AgriBot"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-green-600 text-white">
            <div className="flex items-center gap-2 font-semibold">
              <Bot size={20} />
              Trợ lý AI AgriBot
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFullScreen((v) => !v)}
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

          {/* Panel trợ lý — mode SELLER: tư vấn quản lý shop, đơn, tồn kho... */}
          <AIAssistantPanel mode="SELLER" className="flex-1" />
        </div>
      )}

      {/* Nút nổi mở chat */}
      {!activeChat && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setActiveChat(true)}
            className="group flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-green-200"
            aria-label="Mở trợ lý AI"
            title="Trợ lý AI AgriBot"
          >
            <Bot size={28} />
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      )}
    </>
  );
};

export default SellerAIWidget;
