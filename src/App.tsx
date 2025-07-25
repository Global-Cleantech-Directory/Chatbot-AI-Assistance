import React, { useState } from "react";
import Chatbot from "./components/Chatbot";
import aiPhoto from "./ai-photo.png";

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
          <img
            src="/images/1st.png"
            alt="Chat Logo"
            className="object-contain w-full h-full rounded-full"
          />
        </button>
      )}
    </div>
  );
}