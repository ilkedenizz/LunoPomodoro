import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Start / Pause Timer' },
    { key: 'R', desc: 'Reset Timer' },
    { key: 'S', desc: 'Skip Current Session' },
    { key: 'M', desc: 'Toggle Ambient Audio' },
    { key: 'Esc', desc: 'Close Modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="relative w-full max-w-sm p-6 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-white/80" />
            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 py-4">
          {shortcuts.map((item) => (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <span className="text-white/70">{item.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 font-mono text-xs text-white">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
