import React, { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';

interface Message {
  id: number;
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  avatar?: string;
  imageUrl?: string;
  fileName?: string;
  language?: string;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const languageOptions = [
    { code: 'auto', label: 'Auto' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'de', label: 'German' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'ru', label: 'Russian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'it', label: 'Italian' },
    { code: 'nl', label: 'Dutch' },
  ];
  const [selectedLang, setSelectedLang] = useState('auto');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date(),
      avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You'
    };
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5003/api/chat', {
        message: input,
      });

      const botMessage: Message = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png',
        language: response.data.detectedLanguage // Make sure language is included
      };
      setMessages((prev: Message[]) => [...prev, botMessage]);

      if (response.data.detectedLanguage) {
        const langMap: { [key: string]: string } = {
          english: 'en', french: 'fr', hindi: 'hi', spanish: 'es', german: 'de', chinese: 'zh', japanese: 'ja', korean: 'ko', russian: 'ru', portuguese: 'pt', italian: 'it', dutch: 'nl'
        };
        const detected: string = response.data.detectedLanguage as string;
        if (langMap[detected]) {
          setSelectedLang(langMap[detected]);
        } else {
          setSelectedLang('auto');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png'
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-4 flex flex-col items-center">
        {/* Avatar and Title Row */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Simple SVG Avatar */}
            <div className="bg-blue-100 rounded-full p-2">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="18" fill="#E0F2FE"/>
                <path d="M18 20c-3.5 0-6.5 2-6.5 4.5V27h13v-2.5c0-2.5-3-4.5-6.5-4.5z" fill="#93C5FD"/>
                <circle cx="18" cy="14" r="5" fill="#38BDF8"/>
                <path d="M18 13c.8 0 1.5-.7 1.5-1.5S18.8 10 18 10s-1.5.7-1.5 1.5S17.2 13 18 13z" fill="#fff"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-800">Global Trade Assistance™</span>
          </div>
          {/* Language Selector */}
          <div className="relative">
            <button type="button" className="text-sm font-semibold text-gray-600 cursor-pointer select-none flex items-center gap-1" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {languageOptions.find(opt => opt.code === selectedLang)?.label.slice(0,3).toUpperCase() || 'ENG'}
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
                {languageOptions.map(opt => (
                  <div key={opt.code} className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${selectedLang === opt.code ? 'font-bold bg-blue-50' : ''}`} onClick={() => { setSelectedLang(opt.code); setDropdownOpen(false); }}>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Subtitle */}
        <div className="w-full bg-green-100 text-green-900 rounded-xl px-3 py-2 mb-4 text-center text-base font-medium">
          Talk to me: I'm your smart assistant for global cleantech.
        </div>
        {/* Microphone Icon */}
        <div className="flex justify-center items-center mb-4">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="text-blue-500">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="#38BDF8"/>
            <rect x="7" y="14" width="10" height="4" rx="5" fill="#bae6fd"/>
            <rect x="11" y="18" width="2" height="3" rx="1" fill="#38BDF8"/>
          </svg>
        </div>
        {/* Chat Messages */}
        <div className="w-full flex-1 overflow-y-auto mb-2 max-h-48 space-y-2 pr-1" style={{ minHeight: '48px' }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}> 
              <div className={`flex items-end gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.sender === 'user' ? (
                    <div className="bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold text-gray-500">U</div>
                  ) : (
                    <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="18" fill="#E0F2FE"/>
                        <path d="M18 20c-3.5 0-6.5 2-6.5 4.5V27h13v-2.5c0-2.5-3-4.5-6.5-4.5z" fill="#93C5FD"/>
                        <circle cx="18" cy="14" r="5" fill="#38BDF8"/>
                        <path d="M18 13c.8 0 1.5-.7 1.5-1.5S18.8 10 18 10s-1.5.7-1.5 1.5S17.2 13 18 13z" fill="#fff"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* Message bubble */}
                <div className={`rounded-xl px-3 py-2 text-sm ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}> 
                  <div>{message.text}</div>
                  {message.language && (
                    <div className="text-xs text-gray-400 mt-1">{message.language}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2 mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`bg-blue-500 text-white p-3 rounded-full transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            disabled={isLoading}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M3 20l18-8-18-8v6l12 2-12 2v6z" fill="currentColor"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;