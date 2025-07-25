import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Home, MessageSquare, HelpCircle, Upload, Mic as MicIcon, Send, Trash2, X, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  audioBase64?: string;
  isAudioPlaying?: boolean;
  currentTime?: number; // Add this
  duration?: number;    // Add this
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
}

// FAQ Accordion Component
const faqs = [
  {
    q: 'How do I create an account?',
    a: 'Creating an account on Global Cleantech Directory is simple and FREE. Click the “sign in” button at the top of the page, fill out your basic info, and confirm your email. You’re now ready to explore clean technology listings, connect with others, and start promoting your business.'
  },
  {
    q: 'How do I list my company or service?',
    a: 'After creating your account, click “Add Listing” in the main menu. Choose your category, add your business details, upload your logo, and highlight your services. All listings are reviewed and approved by our admin team to ensure high quality and trust.'
  },
  {
    q: 'Can I try the platform before paying?',
    a: 'Yes! We offer a free trial so you can explore features, add your company, and see the value before choosing a membership. This way, you can experience how Global Cleantech Directory helps you grow your network and visibility worldwide.'
  },
  {
    q: 'Which membership option is the best?',
    a: "Membership Plans & Start Date Our membership plans are available in 6-month and 1-year options, with the 1-year plan offering the best value. Your selected plan begins only when you submit it, so you can upgrade when you're ready — with no pressure and full flexibility."
  },
  {
    q: 'Can I track my performance?',
    a: 'Yes! Your dashboard shows real-time stats like views, leads, and reviews — updated weekly and monthly. It’s a simple way to measure impact and see the results of being on a platform built for visibility and growth. We’re proud to give our members clear insights that reflect real engagement.'
  },
  {
    q: 'How can visitors contact me?',
    a: 'Each member has a professional listing page with a built-in contact form. Visitors can message you directly through your page, and all replies will go straight to your email. It’s a simple, direct way to connect with potential clients, partners, or collaborators — right through the directory.'
  },
  {
    q: 'How do I update or Cancel my plan?',
    a: 'You can manage everything related to your plans right from your dashboard. Just click on “Billing” to update your payment method, upgrade or downgrade your plan, or cancel it anytime. There are no hidden fees, and you’re always in control of your membership.'
  },
  {
    q: 'When will my membership renew?',
    a: 'Memberships are not renewed automatically without notice. Before we renew your plan, you’ll receive an email letting you know your current membership is about to end. This gives you time to review, make changes, or confirm your renewal.'
  },
  {
    q: 'Can I add pictures and videos?',
    a: 'Yes! You can upload product photos and a short video to showcase your solutions in action. Visuals help visitors quickly understand what you offer and build stronger trust. Whether it’s a product demo, installation process, or company intro, adding media gives your listing a more professional and engaging presence. Just head to your dashboard, open your listing, and upload your files in the media section.'
  },
  {
    q: 'Can I add a Q&A to support visitor?',
    a: 'Absolutely. The Q&A section is your space to answer the most common questions about your products or services. It helps visitors feel informed, confident, and ready to reach out — especially if they’re comparing different providers. Our team is here to support you. We’ll help you shape clear, helpful answers that speak directly to your audience and improve your listing’s quality and visibility.'
  },
  {
    q: 'How do I create an event?',
    a: 'You can easily create and share events through your listing to highlight upcoming trade shows, workshops, or in-person opportunities. Events help you stay active on the platform and give visitors a reason to engage with your business. Once submitted, your event will be reviewed by our team to ensure quality and accuracy. After approval, it will be visible on your listing for others to discover and attend.'
  },
  {
    q: 'How do categories & subcategories work?',
    a: 'Selecting the right categories and subcategories helps your listing appear in the most relevant searches across the platform. Categories represent broad cleantech sectors like AgriTech, while subcategories focus on specific solutions like LED Grow Lights . Choosing the best fit makes it easier for users to find your business.'
  },
];

const FAQAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {faqs.map((faq, idx) => (
        <div key={idx} className="rounded-xl border border-[#E3F0FA] bg-white overflow-hidden">
          <button
            className={`w-full text-left py-2 px-3 flex items-center justify-between focus:outline-none transition-colors ${openIndex === idx ? 'bg-[#E3F0FA]' : 'hover:bg-[#F5F8FA]'}`}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <span className="font-semibold text-[#145DA0] text-sm">{faq.q}</span>
            <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${openIndex === idx ? 'rotate-90 text-[#145DA0]' : 'text-[#B3DAF7]'}`} />
          </button>
          {openIndex === idx && (
            <div className="px-4 pb-3 pt-1 bg-[#E3F0FA] text-[#333] text-xs rounded-b-xl">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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
  // Change default selectedLang from 'auto' to 'en'
  const [selectedLang, setSelectedLang] = useState('en');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'settings'>('home');
  const [currentView, setCurrentView] = useState<'main' | 'chat'>('main');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  // Search state for chat sessions
  const [searchQuery, setSearchQuery] = useState('');
  // Admin view state
  const [adminView, setAdminView] = useState(false);

  // Find the active session (move this above useEffects that use it)
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    { code: 'ar', label: 'Arabic' }, // <-- Added Arabic
  ];

  // Continent options for home page
  const continentOptions = [
    { image: '/africa-globe.png', title: 'Africa' },
    { image: '/asia-globe.png', title: 'Asia' },
    { image: '/europe-globe.png', title: 'Europe' },
    { image: '/north-america-globe.png', title: 'North America' },
    { image: '/south-america-globe.png', title: 'South America' },
    { image: '/australia-globe.png', title: 'Australia' },
  ];

  // Categories for dropdown
  const categories = [
    'Agritech Sustainable Agriculture',
    'Artificial Intelligence AI',
    'Environmental Sustainability Association',
    'Environmental Monitoring Analysis',
    'Environmental Sustainability Education',
    'Food Sustainability Solutions',
    'Forest Sustainable Development',
    'Green Building Sustainability',
    'Green Economy Trade',
    'Green Manufacturing Sustainability',
    'Green Sustainable Chemistry',
    'Land Sustainable Development',
    'Ocean Sustainable Development',
    'Professional Service Environment',
    'Renewable Energy Sustainability',
    'Smart City Sustainable',
    'Space Sustainability Solutions',
    'Sustainable Transportation Solutions',
    'Waste Management Sustainable',
    'Water Management Sustainable',
  ];
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Scroll to bottom when messages change, but only if user is at bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize audio
  useEffect(() => {
    // audioRef.current = new Audio(); // Removed audioRef
    return () => {
      // if (audioRef.current) { // Removed audioRef
      //   audioRef.current.pause();
      //   audioRef.current = null;
      // }
    };
  }, []);

  // Helper functions
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Track user scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 60; // px from bottom
    setIsUserAtBottom(target.scrollHeight - target.scrollTop - target.clientHeight < threshold);
  };

  // Scroll to bottom only if user is at bottom
  const scrollToBottom = () => {
    if (isUserAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Helper to get language label from code
  const getLanguageLabel = (code: string) => {
    if (!code) return '';
    const found = languageOptions.find(opt => opt.code.toLowerCase() === code.toLowerCase());
    return found ? found.label : code;
  };

  // Session management
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'AI Assistant', // Changed from 'New Chat' to 'AI Assistant'
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

  function cleanTitle(text: string): string {
    return text
      .replace(/[\*`~_|\[\](){}<>#>]/g, '') // Remove markdown and special chars
      .replace(/\s{2,}/g, ' ')              // Collapse multiple spaces
      .replace(/\n/g, ' ')                  // Remove newlines
      .trim();
  }

  // Add a function to generate a chat title using Gemini
  const generateChatTitle = async (sessionId: string, firstBotMessage: string) => {
    try {
      const response = await axios.post('http://localhost:5004/api/ai', {
        prompt: `Generate a short, descriptive chat title for this conversation based on the following assistant response: "${firstBotMessage}". The title should be concise and relevant to the topic.`,
        context: 'chat title generation',
        sessionId,
      });
      // Use the response text as the title, fallback to the first bot message if not available
      return cleanTitle((response.data.response || firstBotMessage).split('\n')[0].substring(0, 40));
    } catch (e) {
      return cleanTitle(firstBotMessage.substring(0, 40));
    }
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
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, updatedMessages);
        // If this is the first bot message, generate a chat title using Gemini
        const isFirstBotMessage =
          newMessage.sender === 'bot' &&
          updatedMessages.filter(m => m.sender === 'bot').length === 1;
        if (isFirstBotMessage && newMessage.text) {
          generateChatTitle(activeSessionId, newMessage.text).then((title) => {
            setSessions(prev =>
              prev.map(session =>
                session.id === activeSessionId
                  ? { ...session, title }
                  : session
              )
            );
          });
        }
      }
      return updatedMessages;
    });
  };

  // Clear functions
  const clearAllChatHistory = () => {
    localStorage.removeItem('chatSessions');
    setSessions([]);
    createNewSession();
    setActiveTab('home'); // Highlight Home tab after clearing
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

  const stopAllAudio = () => {
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const toggleAudio = async (messageId: string) => {
    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === messageId) {
          const isPlaying = !msg.isAudioPlaying;
          
          // Stop all audio when playing a new one
          if (isPlaying) {
            stopAllAudio();
          }

          return {
            ...msg,
            isAudioPlaying: isPlaying
          };
        }
        return {
          ...msg,
          isAudioPlaying: false // Pause other audio
        };
      });
      
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, updatedMessages);
      }
      
      return updatedMessages;
    });
  };

  // Process voice input
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

      const { transcript, botText, audioBase64, detectedLanguage } = response.data;

      if (transcript?.trim()) {
        addMessage({
          text: transcript,
          sender: 'user',
          avatar: 'https://via.placeholder.com/40/cccccc/ffffff?text=You',
        });
      }

      // Add bot response with audio
      const botMessage: Message = {
        id: generateId(),
        text: botText || "Sorry, I couldn't process your voice message.",
        sender: 'bot',
        timestamp: new Date(),
        avatar: '/Global Cleantech Directory_logo.png',
        audioBase64: audioBase64 || undefined,
        isAudioPlaying: true, // Set to true to auto-play through the audio element
        time: getCurrentTime(),
        date: getDateLabel(),
        language: detectedLanguage,
      };
      addMessage(botMessage);

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

  // Chat functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message (typed) to chat
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleAudioTimeUpdate = (messageId: string, currentTime: number, duration: number) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, currentTime, duration }
          : msg
      )
    );
  };

  const handleSeek = (messageId: string, newTime: number) => {
    const audioElement = document.querySelector(`audio[data-message-id="${messageId}"]`) as HTMLAudioElement;
    if (audioElement) {
      audioElement.currentTime = newTime;
      // If audio is paused, update the message state so when play is pressed, it resumes from the new position
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, currentTime: newTime }
            : msg
        )
      );
    }
  };

  // Helper to determine if this is a new chat (no bot messages yet)
  const isNewChat = messages.filter(m => m.sender === 'bot').length === 0;
  // Track the chat title for the current session
  const [chatTitle, setChatTitle] = useState('Chat Topic');

  // Update chatTitle when the session changes or when a new title is generated
  useEffect(() => {
    // Only set to 'New Chat' if there is no title yet for this session
    if (activeSession?.title && activeSession.title !== 'AI Assistant') {
      setChatTitle(cleanTitle(activeSession.title));
    } else if (!activeSession?.title || activeSession.title === 'AI Assistant') {
      setChatTitle('Chat Topic');
    }
    // Do not reset chatTitle to 'New Chat' if a title has already been set
    // This ensures the title stays once generated
  }, [activeSessionId]);

  // Update session title and chatTitle when the first bot message is added
  useEffect(() => {
    if (!isNewChat && activeSession && activeSession.title === 'AI Assistant') {
      // Find the first bot message
      const firstBotMsg = messages.find(m => m.sender === 'bot' && m.text);
      if (firstBotMsg && firstBotMsg.text) {
        generateChatTitle(activeSessionId, firstBotMsg.text).then((title) => {
          setSessions(prev =>
            prev.map(session =>
              session.id === activeSessionId
                ? { ...session, title }
                : session
            )
          );
          setChatTitle(title); // This will only set once per session
        });
      }
    }
  }, [isNewChat, messages, activeSession, activeSessionId]);

  // When the chatbot is opened, always create a new chat and show the new chat menu
  useEffect(() => {
    if (open) {
      createNewSession();
      setCurrentView('chat');
      setActiveTab('home'); // Only Home tab is selected
    }
  }, [open]);

  if (!open) return null;

  const handleMicClick = () => {
    // Stop all audio if any is playing before starting recording
    stopAllAudio();
    // Also update message state so all isAudioPlaying are false
    setMessages(prevMessages => prevMessages.map(msg => ({ ...msg, isAudioPlaying: false })));

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-md h-[600px] bg-[#f5f8fa] rounded-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="bg-white px-6 py-4 border-b-2 border-[#e0e0e0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[72px] h-[72px] flex items-center justify-center overflow-visible bg-white p-0 m-0">
                <img src="/ai-leaf-logo.png" alt="AI Leaf Logo" className="w-[72px] h-[72px] object-contain" />
              </div>
              <div>
                <h1 className="text-[#333333] text-lg font-semibold">
                  AI Assistant
                </h1>
                <p className="text-[#333333]/60 text-xs">Global CleanTech Directory</p>
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
              
              <button 
                onClick={() => setOpen(false)}
                className="text-[#333333] hover:text-[#145DA0] transition-colors text-2xl"
                title="Close chat"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Subtitle */}
          {currentView === 'chat' && (
            <div className="w-full rounded-xl px-3 py-2 mt-2 text-center text-base font-medium" style={{ background: '#E3F0FA', color: chatTitle === 'Chat Topic' ? '#5C6F81' : '#145DA0' }}>
              {chatTitle}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Home Tab */}
          {activeTab === 'home' && currentView === 'main' && (
            // Show the new chat screen only (same as empty chat view)
            <div className="flex flex-col items-center justify-center text-center h-full w-full p-8">
              <button
                onClick={handleMicClick}
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-lg transition-all duration-200 focus:outline-none border border-[#145DA0] hover:scale-105 hover:shadow-xl ${isRecording ? 'animate-pulse' : ''}`}
                style={isRecording
                  ? { background: 'linear-gradient(135deg, #B3DAF7 0%, #E3F0FA 100%)' }
                  : { background: '#B3DAF7' }}
                title={isRecording ? 'Stop recording' : 'Start voice message'}
                type="button"
                aria-label={isRecording ? 'Stop recording' : 'Start voice message'}
                disabled={isProcessingVoice}
              >
                <MicIcon className={`w-10 h-10 ${isRecording ? 'text-green-500' : ''}`} style={!isRecording ? { color: '#145DA0' } : { color: '#22c55e' }} />
              </button>
              <p className="text-2xl font-semibold leading-snug tracking-tight" style={{ color: '#145DA0', lineHeight: '2.1rem', letterSpacing: '-0.01em' }}>
                Talk or Message to me <br />in your Language!
              </p>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && currentView === 'main' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[#145DA0] text-lg font-bold">Multiple Chats</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      createNewSession();
                      setCurrentView('chat'); // Go to chat view
                      setActiveTab('home'); // Highlight Home tab
                    }}
                    className="bg-[#145DA0] hover:bg-[#145DA0]/90 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    + New Chat
                  </button>
                </div>
              </div>
              {/* Search input for chat sessions */}
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full mb-3 px-3 py-2 rounded-lg border border-[#E3F0FA] bg-[#F5F8FA] text-[#145DA0] placeholder-[#145DA0]/50 focus:outline-none focus:ring-2 focus:ring-[#145DA0] text-sm"
                type="text"
              />
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions
                    .filter(session => {
                      const q = searchQuery.toLowerCase();
                      return (
                        session.title.toLowerCase().includes(q) ||
                        session.messages.some(m => (m.text || '').toLowerCase().includes(q))
                      );
                    })
                    .map(session => (
                    <div 
                      key={session.id}
                      className={`group relative p-3 rounded-lg cursor-pointer hover:bg-[#E3F0FA] transition-colors ${
                        activeSessionId === session.id ? 'bg-[#E3F0FA]' : 'bg-white'
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
                  <div className="w-16 h-16 bg-[#B3DAF7] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-[#145DA0]" />
                  </div>
                  <p className="text-[#333333]/60 text-sm">No chat history yet</p>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={clearAllChatHistory}
                  className="flex items-center gap-1 p-2 rounded-full hover:bg-red-50 transition-colors text-red-500 border border-transparent hover:border-red-200"
                  title="Clear All Chat History"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-xs font-medium text-red-500 ml-1">Clear all chat history</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && currentView === 'main' && (
            <div className="p-6 space-y-6">
              <h2 className="text-[#145DA0] text-lg font-bold">Help</h2>
              <div className="space-y-4">
                {/* About Section */}
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-2">🌱 About Global Clean Tech</h3>
                  <p className="text-[#333333]/70 text-sm">
                    Leading provider of clean technology solutions, renewable energy consulting, 
                    and sustainable living guidance.
                  </p>
                </div>
                {/* FAQ Accordion */}
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-3">💬 Frequently Asked Questions</h3>
                  <FAQAccordion />
                </div>
                {/* Support Contact */}
                <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0]">
                  <h3 className="text-[#333333] font-semibold text-sm mb-2">📩 Support Contact</h3>
                  <p className="text-[#333333]/70 text-sm mb-2">Need help? Contact our sustainability experts:</p>
                  <a href="mailto:support@globalcleantech.com" className="text-[#145DA0] text-sm font-medium">
                    support@globalcleantech.com
                  </a>
                </div>
                {/* Admin Button (subtle/hidden) */}
                <div className="flex justify-center items-center mt-2">
                  <button
                    onClick={() => {
                      setAdminView(v => !v);
                    }}
                    className="w-fit py-1 px-2 text-xs text-[#145DA0] opacity-30 hover:opacity-60 bg-transparent border-none shadow-none font-normal rounded transition-opacity"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Continents/Categories Page (only for adminView) */}
          {adminView && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-[#333333] text-xl font-bold leading-tight">
                  Welcome to <br />
                  Global CleanTech Directory!
                </h2>
                <p className="text-[#333333]/70 text-sm mt-2">Your AI assistant for sustainable living and clean technology</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-[#145DA0] font-bold text-base">Explore by Continent:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {continentOptions.map((option, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-2xl border border-[#e0e0e0] flex flex-col items-center justify-center text-center"
                    >
                      <img src={option.image} alt={option.title} className="w-16 h-16 object-contain mb-2 rounded-full border-2 border-[#145DA0] bg-white shadow-lg p-1" />
                      <div className="text-[#145DA0] font-medium text-sm">{option.title}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-6"></div>
              {/* Categories Dropdown Section */}
              <div className="space-y-2 text-left">
                <h3 className="text-[#145DA0] font-bold text-base">Browse by Category:</h3>
                <div className="relative w-full max-w-[240px]">
                  <button
                    onClick={() => setCategoryDropdownOpen((open) => !open)}
                    className="w-full flex justify-between items-center px-4 py-2 bg-white border border-[#E3F0FA] rounded-lg shadow-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#145DA0] text-sm"
                  >
                    {selectedCategory || 'Select a Category'}
                    <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${categoryDropdownOpen ? 'rotate-90 text-[#145DA0]' : 'text-[#B3DAF7]'}`} />
                  </button>
                  {categoryDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-[#E3F0FA] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`px-4 py-2 cursor-pointer hover:bg-[#E3F0FA] text-black text-sm ${selectedCategory === cat ? 'bg-[#E3F0FA] font-semibold' : ''}`}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat View */}
          {currentView === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6" style={{ minHeight: 0, maxHeight: '100%', overscrollBehavior: 'contain' }} onScroll={handleScroll}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full w-full">
                    <button
                      onClick={handleMicClick}
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-lg transition-all duration-200 focus:outline-none border border-[#145DA0] hover:scale-105 hover:shadow-xl ${isRecording ? 'animate-pulse' : ''}`}
                      style={isRecording
                        ? { background: 'linear-gradient(135deg, #B3DAF7 0%, #E3F0FA 100%)' }
                        : { background: '#B3DAF7' }}
                      title={isRecording ? 'Stop recording' : 'Start voice message'}
                      type="button"
                      aria-label={isRecording ? 'Stop recording' : 'Start voice message'}
                      disabled={isProcessingVoice}
                    >
                      <MicIcon className={`w-10 h-10 ${isRecording ? 'text-green-500' : ''}`} style={!isRecording ? { color: '#145DA0' } : { color: '#22c55e' }} />
                    </button>
                    <p className="text-xl font-semibold leading-snug tracking-tight" style={{ color: '#145DA0', lineHeight: '1.75rem', letterSpacing: '-0.01em' }}>
                      Talk or Message to me <br />in your Language!
                    </p>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([date, msgs]: [string, Message[]]) => (
                    <div key={date}>
                      <div className="text-center mb-4">
                        <span className="text-xs text-[#333333] bg-[#e0e0e0] px-3 py-1 rounded-full">
                          {date === getDateLabel() ? 'Today' : date}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {msgs.map((message: Message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%]`}>
                              <div
                                className={`px-4 py-3 rounded-2xl ${
                                  message.sender === 'user' 
                                    ? 'bg-[#B3DAF7] ml-auto' 
                                    : 'bg-[#E3F0FA]'
                                }`}
                              >
                                <div className="prose prose-sm text-black">
                                  <ReactMarkdown>
                                    {message.text || ''}
                                  </ReactMarkdown>
                                </div>
                                {message.audioBase64 && (
                                  <div className="mt-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleAudio(message.id)}
                                        className="p-1 bg-white rounded-full shadow"
                                      >
                                        {message.isAudioPlaying ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 19h4V5H6v14zM14 5v14h4V5h-4z" fill="#333333"/>
                                          </svg>
                                        ) : (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 5v14l11-7z" fill="#333333"/>
                                          </svg>
                                        )}
                                      </button>
                                      <div className="flex-1 flex items-center gap-2">
                                        <input
                                          type="range"
                                          min={0}
                                          max={message.duration || 0}
                                          value={message.currentTime || 0}
                                          onChange={(e) => handleSeek(message.id, parseFloat(e.target.value))}
                                          className="flex-1 h-1.5 bg-[#E3F0FA] rounded-lg appearance-none cursor-pointer custom-audio-range"
                                          style={{
                                            background: message.duration
                                              ? `linear-gradient(to right, #3B82F6 0%, #145DA0 ${((message.currentTime || 0) / message.duration) * 100}%, #E3F0FA ${((message.currentTime || 0) / message.duration) * 100}%, #E3F0FA 100%)`
                                              : '#E3F0FA'
                                          }}
                                        />
                                        <span className="text-xs text-gray-500 min-w-[60px] text-right">
                                          {formatTime(message.currentTime || 0)} / {formatTime(message.duration || 0)}
                                        </span>
                                      </div>
                                    </div>
                                    <audio
                                      data-message-id={message.id}
                                      src={`data:audio/mp3;base64,${message.audioBase64}`}
                                      onEnded={() => toggleAudio(message.id)}
                                      onTimeUpdate={(e) => {
                                        const audio = e.currentTarget;
                                        handleAudioTimeUpdate(message.id, audio.currentTime, audio.duration);
                                      }}
                                      onLoadedMetadata={(e) => {
                                        const audio = e.currentTarget;
                                        handleAudioTimeUpdate(message.id, 0, audio.duration);
                                      }}
                                      onError={(e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
                                        console.error('Audio playback error:', e);
                                        toggleAudio(message.id);
                                      }}
                                      ref={(audioElement: HTMLAudioElement | null) => {
                                        if (audioElement) {
                                          try {
                                            if (message.isAudioPlaying) {
                                              const playPromise = audioElement.play();
                                              if (playPromise !== undefined) {
                                                playPromise.catch(() => {
                                                  // Ignore play interruption errors
                                                });
                                              }
                                            } else {
                                              audioElement.pause();
                                            }
                                          } catch (error) {
                                            console.error('Audio control error:', error);
                                          }
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </div>
                                )}
                                {message.language && (
                                  <p className="text-xs text-[#333333]/60 mt-1">
                                    Detected language: {getLanguageLabel(message.language)}
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
                    <div className="bg-[#E3F0FA] px-4 py-3 rounded-2xl">
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
                    isRecording ? 'text-green-600' : 'text-green-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isRecording ? 'bg-green-500' : 'bg-green-500'
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
                    <Upload className="w-5 h-5 text-[#333333] group-hover:text-[#145DA0]" />
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="24/7 support in your language"
                    className="flex-1 bg-[#f5f8fa] rounded-full px-4 py-2 text-[#145DA0] placeholder-[#145DA0]/50 focus:outline-none focus:ring-2 focus:ring-[#145DA0]"
                    disabled={isProcessingVoice}
                  />

                  <button 
                    onClick={handleMicClick}
                    disabled={isProcessingVoice}
                    className={`p-2 rounded-full transition-colors group ${
                      isRecording
                        ? 'bg-green-100 animate-pulse text-green-500'
                        : isProcessingVoice
                        ? 'bg-green-100 cursor-not-allowed text-green-500'
                        : 'hover:bg-[#B3DAF7] text-[#145DA0]'
                    }`}
                    title={isRecording ? "Stop recording" : "Voice message"}
                  >
                    <MicIcon className={`w-5 h-5 ${isRecording ? 'text-green-500' : ''} group-hover:text-[#145DA0]`} />
                  </button>

                  <button 
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || isProcessingVoice}
                    className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                      input.trim() && !isProcessingVoice
                        ? 'bg-[#145DA0] hover:bg-[#145DA0]/90 text-white' 
                        : 'bg-[#e0e0e0] text-[#145DA0]/50 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
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
              onClick={() => {
                createNewSession();
                setCurrentView('chat');
                setActiveTab('home'); // Highlight Home tab
              }}
              className="flex flex-col items-center gap-1 p-2 bg-transparent group"
              title="Home"
            >
              <Home className={`w-6 h-6 transition-colors ${activeTab === 'home' ? 'fill-[#F3F8FF] stroke-[#145DA0]' : 'fill-none stroke-[#888888] group-hover:stroke-[#145DA0]'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'home' ? 'font-bold text-[#145DA0]' : 'text-[#888888] group-hover:text-[#145DA0]'}`}>Home</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('messages'); // Highlight Chats tab
                setCurrentView('main'); // Show chat history
              }}
              className="flex flex-col items-center gap-1 p-2 bg-transparent group"
              title="Chats"
            >
              <MessageSquare className={`w-6 h-6 transition-colors ${activeTab === 'messages' ? 'fill-[#F3F8FF] stroke-[#145DA0]' : 'fill-none stroke-[#888888] group-hover:stroke-[#145DA0]'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'messages' ? 'font-bold text-[#145DA0]' : 'text-[#888888] group-hover:text-[#145DA0]'}`}>Chats</span>
            </button>
            <button 
              onClick={handleSettings}
              className="flex flex-col items-center gap-1 p-2 bg-transparent group"
              title="Help"
            >
              <HelpCircle className={`w-6 h-6 transition-colors ${activeTab === 'settings' ? 'fill-[#F3F8FF] stroke-[#145DA0]' : 'fill-none stroke-[#888888] group-hover:stroke-[#145DA0]'}`} />
              <span className={`text-xs transition-colors ${activeTab === 'settings' ? 'font-bold text-[#145DA0]' : 'text-[#888888] group-hover:text-[#145DA0]'}`}>Help</span>
            </button>
          </div>
        </div>
      </div>
      {/* Custom audio progress bar thumb color */}
      <style>
        {`
        .custom-audio-range::-webkit-slider-thumb {
          background: #333333;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(51,51,51,0.15);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .custom-audio-range:focus::-webkit-slider-thumb {
          outline: 2px solid #3B82F6;
        }
        .custom-audio-range::-moz-range-thumb {
          background: #333333;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(51,51,51,0.15);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .custom-audio-range:focus::-moz-range-thumb {
          outline: 2px solid #3B82F6;
        }
        .custom-audio-range::-ms-thumb {
          background: #333333;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(51,51,51,0.15);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .custom-audio-range:focus::-ms-thumb {
          outline: 2px solid #3B82F6;
        }
        .custom-audio-range {
          outline: none;
        }
      `}
      </style>
    </div>
  );
};

export default Chatbot;