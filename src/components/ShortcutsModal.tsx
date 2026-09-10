import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Start / Pause / Resume Timer' },
    { key: 'R', desc: 'Reset Current Timer' },
    { key: 'S', desc: 'Skip Current Session' },
    { key: 'M', desc: 'Toggle Ambient Sound Studio' },
    { key: 'Esc', desc: 'Close Active Overlay / Modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all">
      <div
        className="relative w-full max-w-sm p-5 sm:p-7 rounded-t-3xl sm:rounded-3xl glass-modal text-white shadow-2xl border border-white/15 animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white border border-white/15">
              <Keyboard className="w-4 h-4" />
            </div>
            <h2 id="shortcuts-title" className="text-lg font-bold text-white tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 py-4">
          {shortcuts.map((item) => (
            <div key={item.key} className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-white/70">{item.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 font-mono text-xs font-semibold text-white">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
