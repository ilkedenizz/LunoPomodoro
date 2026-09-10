import React from 'react';
import { X, Volume2, VolumeX, CloudRain, Coffee, Waves, Flame, Music, Disc } from 'lucide-react';
import type { AmbientSoundId } from '../types';

interface AmbienceAudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrack: AmbientSoundId;
  volume: number;
  onSelectTrack: (track: AmbientSoundId) => void;
  onChangeVolume: (vol: number) => void;
}

export const AmbienceAudioPlayer: React.FC<AmbienceAudioPlayerProps> = ({
  isOpen,
  onClose,
  activeTrack,
  volume,
  onSelectTrack,
  onChangeVolume,
}) => {
  if (!isOpen) return null;

  const tracks: { id: AmbientSoundId; name: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'off', name: 'Mute', icon: VolumeX },
    { id: 'rain', name: 'Rainfall', icon: CloudRain },
    { id: 'cafe', name: 'Café Murmur', icon: Coffee },
    { id: 'waves', name: 'Ocean Waves', icon: Waves },
    { id: 'fire', name: 'Fireplace', icon: Flame },
    { id: 'lofi', name: 'Lo-Fi Ambient', icon: Music },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="relative w-full max-w-md p-6 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Disc className="w-5 h-5 text-indigo-300 animate-spin-slow" />
            <h2 id="audio-title" className="text-lg font-bold text-white">
              Ambient Sounds
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sound menu"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracks List */}
        <div className="grid grid-cols-2 gap-3 py-4">
          {tracks.map((t) => {
            const Icon = t.icon;
            const isActive = activeTrack === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTrack(t.id)}
                className={`flex items-center space-x-3 p-3 rounded-2xl text-left border transition-all ${
                  isActive
                    ? 'bg-white/25 border-white text-white font-semibold shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm">{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Volume Slider */}
        <div className="pt-4 border-t border-white/10 flex items-center space-x-3">
          <Volume2 className="w-4 h-4 text-white/60 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
            aria-label="Ambient sound volume"
          />
          <span className="text-xs font-mono text-white/60 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
