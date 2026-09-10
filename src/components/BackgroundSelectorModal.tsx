import React from 'react';
import { X, Check } from 'lucide-react';
import { ATMOSPHERES } from '../utils/backgrounds';
import type { AtmosphereTheme } from '../types';

interface BackgroundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeId: string;
  onSelect: (atmosphere: AtmosphereTheme) => void;
}

export const BackgroundSelectorModal: React.FC<BackgroundSelectorModalProps> = ({
  isOpen,
  onClose,
  activeId,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="atmosphere-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 id="atmosphere-title" className="text-xl font-bold text-white">
              Choose Atmosphere
            </h2>
            <p className="text-xs text-white/60">
              Select a soothing backdrop for your study session
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close background selector"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-6 overflow-y-auto pr-1">
          {ATMOSPHERES.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className={`group relative h-36 rounded-2xl overflow-hidden text-left transition-all duration-300 border focus:outline-none ${
                  isActive
                    ? 'ring-2 ring-white border-white scale-[1.02] shadow-2xl'
                    : 'border-white/15 hover:border-white/40 hover:scale-[1.01]'
                }`}
              >
                {/* Background Image / Fallback */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${item.imageUrl})`,
                    background: item.fallbackGradient,
                  }}
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Text Labels */}
                <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col justify-end">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white drop-shadow-md">
                      {item.name}
                    </span>
                    {isActive && (
                      <span className="p-1 rounded-full bg-white text-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/70 line-clamp-1 mt-0.5">
                    {item.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
