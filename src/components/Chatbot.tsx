import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Home, MessageSquare, Settings, Upload, Mic as MicIcon, Send, Trash2, X } from 'lucide-react';

interface ChatbotProps {
  open?: boolean;
  setOpen?: (v: boolean) => void;
}

interface Message {
  id: string;
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  avatar?: string;
  imageUrl?: string;
  fileName?: string;
  language?: string;
  time?: string;
  date?: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
}

const Chatbot: React.FC<ChatbotProps> = ({ open = true, setOpen = () => {} }) => {
  // Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'settings'>('home');
  const [currentView, setCurrentView] = useState<'main' | 'chat'>('main');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  

  // Language options
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

  // Quick chat options
  const quickChatOptions = [
    { icon: '🌞', title: 'Solar Energy', text: 'Tell me about solar panel installation and benefits' },
    { icon: '♻️', title: 'Recycling Guide', text: 'How can I improve my recycling practices?' },
    { icon: '🚗', title: 'Electric Vehicles', text: 'What are the best electric vehicle options?' },
    { icon: '🏠', title: 'Green Buildings', text: 'Show me sustainable building materials and practices' },
    { icon: '💡', title: 'Energy Efficiency', text: 'How can I reduce my energy consumption at home?' },
    { icon: '🌱', title: 'Carbon Footprint', text: 'Help me calculate and reduce my carbon footprint' }
  ];

  const deleteChatSession = (sessionId: string) => {
    const newSessions = sessions.filter(session => session.id !== sessionId);
    setSessions(newSessions);
    
    if (newSessions.length === 0) {
      createNewSession();
    } else if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id);
    }
  };

  // Initialize sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      })));
      
      if (parsed.length > 0) {
        setActiveSessionId(parsed[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Update messages when session changes
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        setMessages(session.messages);
      }
    }
  }, [activeSessionId, sessions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Helper functions
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getDateLabel = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
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
  };

  // Session management
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      createdAt: new Date(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([]);
    setCurrentView('chat');
    setActiveTab('messages');
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, messages: newMessages } 
          : session
      )
    );
  };

  // Message handling
  const addMessage = (message: Partial<Message>) => {
    const newMessage: Message = {
      id: generateId(),
      text: message.text || '',
      sender: message.sender || 'user',
      timestamp: new Date(),
      avatar: message.avatar,
      language: message.language,
      time: getCurrentTime(),
      date: getDateLabel(),
      ...message
    };
    
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    if (activeSessionId) {
      updateSessionMessages(activeSessionId, updatedMessages);
      
      // Update session title if first message
      if (updatedMessages.length === 1 && message.text) {
        setSessions(prev => 
          prev.map(session => 
            session.id === activeSessionId 
              ? { ...session, title: message.text!.substring(0, 30) + (message.text!.length > 30 ? '...' : '') } 
              : session
          )
        );
      }
    }
  };

  // Clear functions
  const clearAllChatHistory = () => {
    localStorage.removeItem('chatSessions');
    setSessions([]);
    createNewSession();
  };

  const clearCurrentChat = () => {
    if (activeSessionId) {
      updateSessionMessages(activeSessionId, []);
      setMessages([]);
    }
  };

  // Voice recording functions
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

      const response = await axios.post('http://localhost:5004/api/voice-chat', {
        audio: base64Audio,
        sessionId: activeSessionId,
        languageCode: selectedLang === 'auto' ? 'en-US' : selectedLang,
      });

      const { transcript, botText, audioBase64 } = response.data;

      // Add user message (transcript)
      if (transcript?.trim()) {
        addMessage({
          text: transcript,
          sender: 'user',
          avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You',
        });
      }

      // Add bot response
      addMessage({
        text: botText || "Sorry, I couldn't process your voice message.",
        sender: 'bot',
        avatar: '/Global Cleantech Directory_logo.png',
      });

      // Play bot response audio
      if (audioBase64 && audioRef.current) {
        const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
        audioRef.current.src = audioUrl;
        
        // Set up audio event listeners
        audioRef.current.onloadedmetadata = () => {
          setAudioDuration(audioRef.current?.duration || 0);
        };
        
        audioRef.current.ontimeupdate = () => {
          setCurrentAudioTime(audioRef.current?.currentTime || 0);
        };
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setIsBotSpeaking(false);
        };
        
        await audioRef.current.play();
        setIsPlaying(true);
        setIsBotSpeaking(true);
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      addMessage({
        text: "Sorry, couldn't process your voice message.",
        sender: 'bot',
        avatar: '/Global Cleantech Directory_logo.png',
      });
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentAudioTime(newTime);
    }
  };

  const handleMicClick = () => {
    if (isBotSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsBotSpeaking(false);
      startRecording();
      return;
    }

    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
  };

  // Chat functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    addMessage({
      text: input,
      sender: 'user',
      avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You',
    });
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5004/api/chat', {
        message: input,
        sessionId: activeSessionId,
      });

      addMessage({
        text: response.data.response,
        sender: 'bot',
        avatar: '/Global Cleantech Directory_logo.png',
        language: response.data.detectedLanguage,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
        sender: 'bot',
        avatar: '/Global Cleantech Directory_logo.png',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // UI handlers
  const handleQuickChat = (optionText: string) => {
    setInput(optionText);
    setTimeout(() => handleSubmit({ preventDefault: () => {} } as React.FormEvent), 100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addMessage({
        text: `File uploaded: ${file.name}`,
        sender: 'user',
        fileName: file.name,
      });
      console.log('File selected for upload:', file.name);
    }
  };

  const handleHome = () => {
    setActiveTab('home');
    setCurrentView('main');
  };

  const handleMessages = () => {
    setActiveTab('messages');
    setCurrentView('main');
  };

  const handleSettings = () => {
    setActiveTab('settings');
    setCurrentView('main');
  };

  const startNewChat = () => {
    createNewSession();
  };

  // Group messages by date for display
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = msg.date || getDateLabel();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-md h-[600px] bg-[#f5f7f4] rounded-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="bg-white px-6 py-4 border-b-2 border-[#e0e0e0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d5e8d4] rounded-full flex items-center justify-center">
                <span className="text-[#a3c9a8] text-xl">🌱</span>
              </div>
              <div>
                <h1 className="text-[#333333] text-lg font-semibold">Global Clean Tech</h1>
                <p className="text-[#333333]/60 text-xs">Eco Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language selector */}
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
              
              {currentView === 'chat' && messages.length > 0 && (
                <button
                  onClick={clearCurrentChat}
                  className="text-[#333333] hover:text-[#a3c9a8] transition-colors p-1"
                  title="Clear current chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => setOpen(false)}
                className="text-[#333333] hover:text-[#a3c9a8] transition-colors text-2xl"
                title="Close chat"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Subtitle */}
          {currentView === 'chat' && (
            <div className="w-full bg-green-100 text-green-900 rounded-xl px-3 py-2 mt-2 text-center text-base font-medium">
              Talk or Message to me in your Language!
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Home Tab */}
          {activeTab === 'home' && currentView === 'main' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#d5e8d4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#a3c9a8] text-2xl">🌍</span>
                </div>
                <h2 className="text-[#333333] text-xl font-bold">Welcome to Global Clean Tech!</h2>
                <p className="text-[#333333]/70 text-sm mt-2">Your AI assistant for sustainable living and clean technology</p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-[#333333] font-semibold text-sm">Quick Chat Options:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickChatOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickChat(option.text)}
                      className="p-3 bg-white rounded-2xl border border-[#e0e0e0] hover:bg-[#d5e8d4] transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="text-[#333333] font-medium text-xs">{option.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && currentView === 'main' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[#333333] text-lg font-bold">Chat History</h2>
                <button
                  onClick={startNewChat}
                  className="bg-[#a3c9a8] hover:bg-[#a3c9a8]/90 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
                >
                  + New Chat
                </button>
              </div>
              
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div 
                      key={session.id}
                      className={`group relative p-3 rounded-lg cursor-pointer hover:bg-[#d5e8d4] transition-colors ${
                        activeSessionId === session.id ? 'bg-[#d5e8d4]' : 'bg-white'
                      }`}
                    >
                      <div 
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setCurrentView('chat');
                        }}
                        className="pr-6" // Add padding to prevent overlap with delete button
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm truncate">{session.title}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {session.messages.length > 0 && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {session.messages[0].text}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-500"
                        title="Delete this chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#d5e8d4] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-[#a3c9a8]" />
                  </div>
                  <p className="text-[#333333]/60 text-sm">No chat history yet</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && currentView === 'main' && (
            <div className="p-6 space-y-6">
              <h2 className="text-[#333333] text-lg font-bold">Settings</h2>
              
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-2">📧 Support Contact</h3>
                  <p className="text-[#333333]/70 text-sm mb-2">Need help? Contact our sustainability experts:</p>
                  <a href="mailto:support@globalcleantech.com" className="text-[#a3c9a8] text-sm font-medium">
                    support@globalcleantech.com
                  </a>
                </div>
                
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-2">🌱 About Global Clean Tech</h3>
                  <p className="text-[#333333]/70 text-sm">
                    Leading provider of clean technology solutions, renewable energy consulting, 
                    and sustainable living guidance.
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-2">⚙️ Preferences</h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-[#333333]/70">Energy efficiency tips</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-[#333333]/70">Renewable energy updates</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-[#333333]/70">Weekly sustainability newsletter</span>
                    </label>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-3">🗑️ Data Management</h3>
                  <div className="space-y-2">
                    <button
                      onClick={clearAllChatHistory}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                    >
                      Delete ALL Chat History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat View */}
          {currentView === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-[#d5e8d4] rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-[#a3c9a8] text-3xl">🌱</span>
                      </div>
                      <p className="text-[#333333] text-lg font-medium">Start chatting about sustainability!</p>
                    </div>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="text-center mb-4">
                        <span className="text-xs text-[#333333] bg-[#e0e0e0] px-3 py-1 rounded-full">
                          {date === getDateLabel() ? 'Today' : date}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {msgs.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%]`}>
                              <div
                                className={`px-4 py-3 rounded-2xl ${
                                  message.sender === 'user' 
                                    ? 'bg-[#fdf6ec] ml-auto' 
                                    : 'bg-[#d5e8d4]'
                                }`}
                              >
                                <p className="text-[#333333] text-sm">{message.text}</p>
                                {message.language && (
                                  <p className="text-xs text-[#333333]/60 mt-1">
                                    Detected language: {message.language}
                                  </p>
                                )}
                              </div>
                              <p className={`text-xs text-[#333333] opacity-60 mt-1 ${
                                message.sender === 'user' ? 'text-right' : 'text-left'
                              }`}>
                                {message.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                
                {(isLoading || isProcessingVoice) && (
                  <div className="flex justify-start">
                    <div className="bg-[#d5e8d4] px-4 py-3 rounded-2xl">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-[#333333]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#333333]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#333333]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Section */}
              <div className="bg-white border-t-2 border-[#e0e0e0] px-4 py-3">
                {(isRecording || isProcessingVoice) && (
                  <div className={`text-sm mb-2 flex items-center gap-2 justify-center ${
                    isRecording ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isRecording ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    {isRecording ? 'Recording... Click to stop' : 'Processing voice...'}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-[#d5e8d4] transition-colors group"
                    title="Upload file"
                  >
                    <Upload className="w-5 h-5 text-[#333333] group-hover:text-[#a3c9a8]" />
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about sustainability..."
                    className="flex-1 bg-[#f5f7f4] rounded-full px-4 py-2 text-[#333333] placeholder-[#333333]/50 focus:outline-none focus:ring-2 focus:ring-[#a3c9a8]"
                    disabled={isProcessingVoice}
                  />

                  <button 
                    onClick={handleMicClick}
                    disabled={isProcessingVoice}
                    className={`p-2 rounded-full transition-colors group ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                        : isProcessingVoice
                        ? 'bg-yellow-500 cursor-not-allowed text-white'
                        : 'hover:bg-[#d5e8d4] text-[#333333]'
                    }`}
                    title={isRecording ? "Stop recording" : "Voice message"}
                  >
                    <MicIcon className="w-5 h-5 group-hover:text-[#a3c9a8]" />
                  </button>

                  <button 
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || isProcessingVoice}
                    className={`p-2 rounded-full transition-colors ${
                      input.trim() && !isProcessingVoice
                        ? 'bg-[#a3c9a8] hover:bg-[#a3c9a8]/90 text-white' 
                        : 'bg-[#e0e0e0] text-[#333333]/50 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-[#e0e0e0] px-6 py-2">
          <div className="flex justify-around items-center">
            <button 
              onClick={handleHome}
              className={`p-2 rounded-lg hover:bg-[#d5e8d4] transition-colors group ${
                activeTab === 'home' ? 'bg-[#d5e8d4]' : ''
              }`}
              title="Home - Welcome & Quick Options"
            >
              <Home className={`w-5 h-5 ${
                activeTab === 'home' ? 'text-[#a3c9a8]' : 'text-[#333333] group-hover:text-[#a3c9a8]'
              }`} />
            </button>
            <button 
              onClick={handleMessages}
              className={`p-2 rounded-lg hover:bg-[#d5e8d4] transition-colors group ${
                activeTab === 'messages' ? 'bg-[#d5e8d4]' : ''
              }`}
              title="Messages - Chat History"
            >
              <MessageSquare className={`w-5 h-5 ${
                activeTab === 'messages' ? 'text-[#a3c9a8]' : 'text-[#333333] group-hover:text-[#a3c9a8]'
              }`} />
            </button>
            <button 
              onClick={handleSettings}
              className={`p-2 rounded-lg hover:bg-[#d5e8d4] transition-colors group ${
                activeTab === 'settings' ? 'bg-[#d5e8d4]' : ''
              }`}
              title="Settings - Support & Preferences"
            >
              <Settings className={`w-5 h-5 ${
                activeTab === 'settings' ? 'text-[#a3c9a8]' : 'text-[#333333] group-hover:text-[#a3c9a8]'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;