import React from 'react';
import { useState, useRef, useEffect } from 'react';
import Chatbot from './Chatbot';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import aiPhoto from '../ai-photo.png';

const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Auto-open on /support page
  useEffect(() => {
    if (window.location.pathname === '/support') {
      setOpen(true);
    }
    setMounted(true);
  }, []);

  // ESC key closes chat
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Outside click closes chat
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      {/* Animated Floating Launcher Button */}
      {!open && (
        <motion.button
          ref={launcherRef}
          aria-label={open ? 'Close chat' : 'Open chat'}
          onClick={() => setOpen((v) => !v)}
          tabIndex={0}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08, boxShadow: '0 8px 32px 0 rgba(80,80,180,0.18)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-primary to-accent text-white rounded-2xl w-16 h-16 flex items-center justify-center shadow-2xl focus:outline-none"
        >
          <img 
            src={aiPhoto} 
            alt="Open Chatbot" 
            className="w-12 h-12 object-contain" 
            aria-hidden="true" 
          />
        </motion.button>
      )}

      {/* Floating Chat Popup (no iframe, just your real chatbot UI) */}
      <AnimatePresence>
        {mounted && open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              ref={chatRef}
              tabIndex={-1}
              className="pointer-events-auto outline-none w-full max-w-md max-h-[80vh] rounded-3xl shadow-2xl bg-white dark:bg-gray-900 fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden"
              initial={{ scale: 0.95, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              aria-modal="true"
              role="dialog"
            >
              {/* Render your full chatbot UI here (no iframe) */}
              <Chatbot />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotWidget; 