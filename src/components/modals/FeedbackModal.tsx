'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  UploadCloud,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { useFeedback } from '@/context/FeedbackContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { showFeedback } = useFeedback();

  const [type, setType] = useState<'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'GENERAL'>('BUG');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setType('BUG');
      setTitle('');
      setMessage('');
      setScreenshot(null);
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compress & convert file to Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showFeedback('Please select an image file (PNG, JPG, WebP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1400; // max dimension

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setScreenshot(compressed);
          showFeedback('Screenshot attached!', 'success');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  // Support pasting screenshots directly with Ctrl+V
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showFeedback('Please describe the issue or feedback', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim() || undefined,
          message: message.trim(),
          screenshot,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        showFeedback('Thank you! Your feedback has been sent to our team.', 'success');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Failed to submit feedback', 'warning');
      }
    } catch {
      showFeedback('Network error. Please try again.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-[#0b1329] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Feedback & Report Issues</h3>
              <p className="text-xs text-slate-400">Help us improve your family finance experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Feedback Submitted!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Our engineering team has received your message and attached details. Thank you for helping us make Family Finance Tracker better!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Feedback Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'BUG', label: 'Bug Report', icon: Bug, color: 'text-rose-400 border-rose-500/40 bg-rose-950/20' },
                  { id: 'FEATURE_REQUEST', label: 'Feature Idea', icon: Lightbulb, color: 'text-amber-400 border-amber-500/40 bg-amber-950/20' },
                  { id: 'IMPROVEMENT', label: 'Improvement', icon: Sparkles, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20' },
                  { id: 'GENERAL', label: 'General', icon: HelpCircle, color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/20' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? `${item.color} ring-1 ring-white/30 shadow-md`
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Title / Short Summary (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Calculation issue in September ledger"
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Description / Details <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe what happened, what you expected, or any suggestion you have in mind... (Tip: You can press Ctrl+V anywhere in this window to paste a screenshot!)"
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Screenshot Attachment */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Screenshot (Optional)</span>
                <span className="text-[11px] text-indigo-400 lowercase font-normal">Supports file upload or Ctrl+V paste</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {screenshot ? (
                <div className="relative group border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950 p-2">
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="max-h-48 rounded-lg mx-auto object-contain"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="p-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg shadow-md transition-all active:scale-90"
                      title="Remove screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-950/10 p-5 rounded-xl text-center flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-7 h-7 text-indigo-400" />
                  <p className="text-xs font-semibold">Click to upload image or drag & drop</p>
                  <p className="text-[11px] text-slate-500">PNG, JPG, WebP (or paste directly from clipboard)</p>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
