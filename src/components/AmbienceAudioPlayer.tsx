import React from 'react';
import { X, Sliders } from 'lucide-react';
import type { SoundMixerState, AppLanguage } from '../types';
import { SoundMixer } from './SoundMixer';
import { getTranslations } from '../utils/translations';

interface AmbienceAudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  mixerState: SoundMixerState;
  onChangeMixerState: (state: SoundMixerState) => void;
  language?: AppLanguage;
}

export const AmbienceAudioPlayer: React.FC<AmbienceAudioPlayerProps> = ({
  isOpen,
  onClose,
  mixerState,
  onChangeMixerState,
  language = 'en',
}) => {
  if (!isOpen) return null;
  const t = getTranslations(language);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl p-6 sm:p-8 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col cursor-default"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-mixer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="audio-mixer-title" className="text-lg font-bold text-white">
                {t.multiTrackMixerTitle}
              </h2>
              <p className="text-xs text-white/60">
                {t.multiTrackMixerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Track Mixer Component */}
        <div className="py-4 overflow-y-auto pr-1 flex-1">
          <SoundMixer mixerState={mixerState} onChange={onChangeMixerState} language={language} />
        </div>
      </div>
    </div>
  );
};
