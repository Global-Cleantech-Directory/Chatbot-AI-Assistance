import React, { useState } from "react";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <Chatbot open={chatOpen} setOpen={setChatOpen} />
      {!chatOpen && (
        <button
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-[#A8D5BA] hover:bg-[#A8D5BA]/90 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white"
          onClick={() => setChatOpen(true)}
          aria-label="Open Global Clean Tech Chat"
        >
          {/* Eco-friendly plant/chat icon */}
          <div className="flex flex-col items-center">
            <span className="text-white text-2xl mb-1">🌱</span>
            <div className="w-4 h-4 bg-white/80 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 text-[#A8D5BA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}