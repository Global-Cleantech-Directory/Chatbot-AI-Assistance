import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon, ArrowLeftIcon, FaceSmileIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { PhotoIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

interface Message {
  id: number;
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  avatar?: string;
  imageUrl?: string;
  fileName?: string;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your Cleantech Directory assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      avatar: '/Global Cleantech Directory_logo.png'
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: input,
      });

      const botMessage: Message = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png'
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIconClick = (iconName: string) => {
    console.log(`${iconName} icon clicked`);
    // Add more specific functionality here later
  };

  const handlePhotoIconClick = () => {
    photoInputRef.current?.click();
  };

  const handleAttachmentIconClick = () => {
    attachmentInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      console.log('Selected file:', selectedFile);

      const reader = new FileReader();

      reader.onload = (e) => {
        const fileMessage: Message = {
          id: messages.length + 1,
          sender: 'user',
          timestamp: new Date(),
          avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You'
        };

        if (selectedFile.type.startsWith('image/')) {
          // Handle image file
          fileMessage.imageUrl = e.target?.result as string;
          fileMessage.text = `Image: ${selectedFile.name}`;
        } else {
          // Handle other file types
          fileMessage.fileName = selectedFile.name;
          fileMessage.text = `File: ${selectedFile.name}`;
        }

        setMessages(prev => [...prev, fileMessage]);
      };

      // Read the file as a data URL for images, or just process info for others
      if (selectedFile.type.startsWith('image/')) {
         reader.readAsDataURL(selectedFile);
      } else {
         reader.readAsText(selectedFile.slice(0, 1));
      }

      // Clear the file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-sm mx-auto rounded-lg shadow-lg overflow-hidden md:max-w-md lg:max-w-lg">
      <header className="bg-green-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftIcon className="h-6 w-6 cursor-pointer" />
          <div className="flex items-center gap-3">
            <img src="/Global Cleantech Directory_logo.png" alt="Bot Avatar" className="h-10 w-10 rounded-full" />
            <div>
              <h1 className="text-lg font-semibold">Global Cleantech Directory AI</h1>
              <p className="text-xs opacity-90">Bot</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <img src={message.avatar} alt="Bot Avatar" className="h-10 w-10 rounded-full" />
                )}
                <div className={`flex flex-col max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}>
                  {message.imageUrl ? (
                    <img src={message.imageUrl} alt="User Upload" className="max-w-full h-auto rounded" />
                  ) : message.fileName ? (
                    <p>📁 {message.fileName}</p>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <span className={`text-xs opacity-90 mt-1 ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.sender === 'user' && (
                  <img src={message.avatar} alt="User Avatar" className="h-10 w-10 rounded-full" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex items-center gap-2">
        <PhotoIcon className="h-6 w-6 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={handlePhotoIconClick} />
        <FaceSmileIcon className="h-6 w-6 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleIconClick('Emoji')} />
        <PaperClipIcon className="h-6 w-6 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={handleAttachmentIconClick} />

        <input
          type="file"
          accept="image/*"
          ref={photoInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <input
          type="file"
          ref={attachmentInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a reply..."
          className="flex-1 p-3 rounded-lg bg-gray-100 border-none focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`bg-blue-600 text-white p-3 rounded-full transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
          disabled={isLoading}
        >
          <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
        </button>
      </form>
    </div>
  );
};

export default Chatbot; 