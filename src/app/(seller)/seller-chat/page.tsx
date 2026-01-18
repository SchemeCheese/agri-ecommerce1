// src/app/(seller)/seller-chat/page.tsx
"use client";

import React, { useState } from 'react';
import { CHAT_LIST } from '@/data/seller';
import { Search, Send, Bot, User, FileText } from 'lucide-react';

export default function SellerChatPage() {
  const [activeChat, setActiveChat] = useState(CHAT_LIST[0].id);
  const [activeTab, setActiveTab] = useState<'buyer' | 'ai'>('buyer');

  const filteredList = CHAT_LIST.filter(c => c.type === activeTab);
  const currentChatUser = CHAT_LIST.find(c => c.id === activeChat);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-100px)] flex overflow-hidden">

      {/* Sidebar Chat List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('buyer')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'buyer' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Khách hàng
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'ai' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              Trợ lý AI
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm kiếm..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredList.map(chat => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 transition ${activeChat === chat.id ? 'bg-green-50 border-r-4 border-green-500' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${chat.type === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                {chat.type === 'ai' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{chat.name}</h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${chat.unread > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                  {chat.lastMsg}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentChatUser?.type === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
              {currentChatUser?.type === 'ai' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{currentChatUser?.name}</h3>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
              </p>
            </div>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto space-y-4">
          {/* Demo Message */}
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-tl-none max-w-md shadow-sm text-sm">
              {currentChatUser?.lastMsg}
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-green-600 text-white p-3 rounded-lg rounded-tr-none max-w-md shadow-sm text-sm">
              Chào bạn, mình có thể giúp gì không?
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
            <button className="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 transition">
              <Send size={18} />
            </button>

            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Gửi báo giá riêng">
              <FileText size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}