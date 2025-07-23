import React, { useState, useRef, useEffect } from 'react';
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);


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

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Utility to convert ArrayBuffer to Base64
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      let chunkBinary = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkBinary += String.fromCharCode(chunk[j]);
      }
      binary += chunkBinary;
    }
    return btoa(binary);
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn('webm/opus not supported, falling back to default');
        mediaRecorderRef.current = new MediaRecorder(stream);
      } else {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      }

      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);
      console.log('Sending voice data:', base64Audio.slice(0, 50) + '...');

      const response = await axios.post('http://localhost:5004/api/voice-chat', {
        audio: base64Audio,
        sessionId: 'frontend-session',
        languageCode: selectedLang === 'auto' ? 'en-US' : selectedLang,
      });

      console.log('Voice API Response:', response.data);

      const { transcript, botText, audioBase64 } = response.data;

      // Add user message (transcript)
      if (transcript?.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            text: transcript,
            sender: 'user',
            timestamp: new Date(),
            avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You',
          },
        ]);
      }

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 2,
          text: botText || "Sorry, I couldn't process your voice message.",
          sender: 'bot',
          timestamp: new Date(),
          avatar: '/Global Cleantech Directory_logo.png',
        },
      ]);

      // Play bot response audio
      if (audioBase64 && audioRef.current) {
        const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
        audioRef.current.src = audioUrl;
        setIsBotSpeaking(true); // bot is speaking now
        audioRef.current.onended = () => setIsBotSpeaking(false);
        await audioRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, couldn't process your voice message.",
          sender: 'bot',
          timestamp: new Date(),
          avatar: '/Global Cleantech Directory_logo.png',
        },
      ]);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleMicClick = () => {
    if (isBotSpeaking && audioRef.current) {
      audioRef.current.pause();       // stop bot from talking
      audioRef.current.currentTime = 0;
      setIsBotSpeaking(false);
      startRecording();               // start recording immediately
      return;
    }

    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.src = ""; // Clear audio
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date(),
      avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5004/api/chat', {
        message: input,
        sessionId: 'frontend-session',
      });

      const botMessage: Message = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png',
        language: response.data.detectedLanguage,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
          sender: 'bot',
          timestamp: new Date(),
          avatar: '/Global Cleantech Directory_logo.png',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-4 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-full p-2">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="18" fill="#E0F2FE" />
                <path d="M18 20c-3.5 0-6.5 2-6.5 4.5V27h13v-2.5c0-2.5-3-4.5-6.5-4.5z" fill="#93C5FD" />
                <circle cx="18" cy="14" r="5" fill="#38BDF8" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-800">AI Assistant</span>
          </div>
          <div className="relative">
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 cursor-pointer select-none flex items-center gap-1"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {languageOptions.find((opt) => opt.code === selectedLang)?.label.slice(0, 3).toUpperCase() || 'ENG'}
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
                {languageOptions.map((opt) => (
                  <div
                    key={opt.code}
                    className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${
                      selectedLang === opt.code ? 'font-bold bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedLang(opt.code);
                      setDropdownOpen(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <div className="w-full bg-green-100 text-green-900 rounded-xl px-3 py-2 mb-4 text-center text-base font-medium">
          Talk or Message to me in your Language!
        </div>

        <div className="flex justify-center items-center mb-4 gap-2">
          {/* Mic Button */}
          <button
            onClick={handleMicClick}
            disabled={isProcessingVoice}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : isProcessingVoice
                ? 'bg-yellow-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white shadow-lg`}
          >
            {/* mic icon */}
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <rect x="7" y="14" width="10" height="4" rx="5" fill="currentColor" fillOpacity="0.6" />
              <rect x="11" y="18" width="2" height="3" rx="1" fill="currentColor" />
            </svg>
          </button>

          {/* Stop Talking Button */}
          <button
            onClick={handleStopVoice}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" fill="currentColor" />
            </svg>
          </button>
        </div>


        {/* Recording & Processing Indicators */}
        {isRecording && (
          <div className="text-red-600 text-sm mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Recording... Click to stop
          </div>
        )}
        {isProcessingVoice && (
          <div className="text-yellow-600 text-sm mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            Processing voice...
          </div>
        )}

        {/* Messages */}
        <div className="w-full flex-1 overflow-y-auto mb-2 max-h-48 space-y-2 pr-1" style={{ minHeight: '48px' }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  {message.sender === 'user' ? (
                    <div className="bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold text-gray-500">U</div>
                  ) : (
                    <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="18" fill="#E0F2FE" />
                        <path d="M18 20c-3.5 0-6.5 2-6.5 4.5V27h13v-2.5c0-2.5-3-4.5-6.5-4.5z" fill="#93C5FD" />
                        <circle cx="18" cy="14" r="5" fill="#38BDF8" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className={`rounded-xl px-3 py-2 text-sm ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <div>{message.text}</div>
                  {message.language && <div className="text-xs text-gray-400 mt-1">{message.language}</div>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input */}
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
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M3 20l18-8-18-8v6l12 2-12 2v6z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
