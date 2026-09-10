import React from 'react';
import type { SoundMixerState, AmbientSoundId } from '../types';
import { Volume2, VolumeX, CloudRain, Coffee, Flame, Waves, Music, SlidersHorizontal } from 'lucide-react';

interface SoundMixerProps {
  mixerState: SoundMixerState;
  onChange: (newState: SoundMixerState) => void;
}

const TRACK_CONFIG: {
  id: Exclude<AmbientSoundId, 'off'>;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'rain', label: 'Rainfall', icon: CloudRain },
  { id: 'cafe', label: 'Café Murmur', icon: Coffee },
  { id: 'fire', label: 'Cozy Fireplace', icon: Flame },
  { id: 'waves', label: 'Ocean Waves', icon: Waves },
  { id: 'lofi', label: 'Lo-Fi Chords', icon: Music },
];

export const SoundMixer: React.FC<SoundMixerProps> = ({ mixerState, onChange }) => {
  const handleMasterVolumeChange = (vol: number) => {
    onChange({
      ...mixerState,
      masterVolume: vol,
    });
  };

  const handleTrackVolumeChange = (trackId: Exclude<AmbientSoundId, 'off'>, vol: number) => {
    onChange({
      ...mixerState,
      tracks: {
        ...mixerState.tracks,
        [trackId]: {
          ...mixerState.tracks[trackId],
          volume: vol,
          muted: vol === 0 ? false : mixerState.tracks[trackId].muted,
        },
      },
    });
  };

  const handleTrackMuteToggle = (trackId: Exclude<AmbientSoundId, 'off'>) => {
    onChange({
      ...mixerState,
      tracks: {
        ...mixerState.tracks,
        [trackId]: {
          ...mixerState.tracks[trackId],
          muted: !mixerState.tracks[trackId].muted,
        },
      },
    });
  };

  const handleResetMixer = () => {
    onChange({
      masterVolume: 0.5,
      tracks: {
        rain: { volume: 0, muted: false },
        cafe: { volume: 0, muted: false },
        fire: { volume: 0, muted: false },
        waves: { volume: 0, muted: false },
        lofi: { volume: 0, muted: false },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Volume Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Master Sound Volume</h4>
            <p className="text-xs opacity-60">Overall audio output level</p>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[200px]">
          <button
            onClick={() => handleMasterVolumeChange(mixerState.masterVolume === 0 ? 0.5 : 0)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition"
            title="Toggle Master Mute"
          >
            {mixerState.masterVolume === 0 ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={mixerState.masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-black/20 dark:bg-white/20 rounded-lg appearance-none"
          />

          <span className="text-xs font-mono w-10 text-right opacity-70">
            {Math.round(mixerState.masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Individual Sound Tracks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs opacity-60 px-1">
          <span>AMBIENT SOUND TRACKS</span>
          <button
            onClick={handleResetMixer}
            className="hover:opacity-100 transition underline cursor-pointer"
          >
            Reset Mix
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRACK_CONFIG.map(({ id, label, icon: Icon }) => {
            const trackState = mixerState.tracks[id];
            const isActive = trackState.volume > 0 && !trackState.muted;

            return (
              <div
                key={id}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-black/5 dark:bg-white/10 opacity-60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>

                  <button
                    onClick={() => handleTrackMuteToggle(id)}
                    className={`p-1.5 rounded-lg text-xs font-medium transition ${
                      trackState.muted
                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        : isActive
                        ? 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20'
                        : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {trackState.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={trackState.muted ? 0 : trackState.volume}
                    onChange={(e) => handleTrackVolumeChange(id, parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-black/20 dark:bg-white/20 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono w-8 text-right opacity-60">
                    {trackState.muted ? 'Mute' : `${Math.round(trackState.volume * 100)}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
