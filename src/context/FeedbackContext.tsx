'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface FeedbackContextType {
  showFeedback: (message: string, type?: 'success' | 'info' | 'warning') => void;
  triggerHaptic: () => void;
}

const FeedbackContext = createContext<FeedbackContextType>({
  showFeedback: () => {},
  triggerHaptic: () => {},
});

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Haptic feedback for mobile devices (vibrates 12ms if supported)
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore if vibration is restricted by user agent
      }
    }
  }, []);

  const showFeedback = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
      triggerHaptic();
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]); // Keep at most 2 active

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    },
    [triggerHaptic]
  );

  // Global click ripple listener: provides immediate visual wave on any button or clickable element
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('button, a, input[type="button"], input[type="submit"], [role="button"]');
      if (!target) return;

      triggerHaptic();

      // Create a transient ripple wave
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn-click-ripple';
      
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      target.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 400);
    };

    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, [triggerHaptic]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback, triggerHaptic }}>
      {children}

      {/* Floating Interactive Toast Feedback Banner */}
      <div className="fixed bottom-20 md:bottom-6 right-1/2 translate-x-1/2 md:translate-x-0 md:right-6 z-50 flex flex-col items-center md:items-end gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl text-xs sm:text-sm font-semibold transition-all duration-300 animate-slideUp ${
              toast.type === 'success'
                ? 'bg-[#0f172a]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
                : toast.type === 'warning'
                ? 'bg-[#0f172a]/95 border-amber-500/40 text-amber-300 shadow-amber-950/50'
                : 'bg-[#0f172a]/95 border-indigo-500/40 text-indigo-300 shadow-indigo-950/50'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            
            <span className="text-slate-100">{toast.message}</span>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-1 text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
