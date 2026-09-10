import React, { useState } from 'react';
import type { AtmospherePreset, AtmosphereTheme, SoundMixerState } from '../types';
import { Bookmark, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface PresetsManagerProps {
  currentAtmosphere: AtmosphereTheme;
  currentMixerState: SoundMixerState;
  presets: AtmospherePreset[];
  onApplyPreset: (preset: AtmospherePreset) => void;
  onSavePreset: (preset: AtmospherePreset) => void;
  onDeletePreset: (presetId: string) => void;
}

export const PresetsManager: React.FC<PresetsManagerProps> = ({
  currentAtmosphere,
  currentMixerState,
  presets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: AtmospherePreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      atmosphereId: currentAtmosphere.id,
      soundMixer: currentMixerState,
      createdAt: Date.now(),
    };

    onSavePreset(newPreset);
    setNewPresetName('');
    setIsCreating(false);
  };

  const handleApply = (preset: AtmospherePreset) => {
    onApplyPreset(preset);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 1500);
  };

  return (
    <div className="space-y-4 text-white">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Atmosphere & Sound Presets</h4>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Setup</span>
          </button>
        )}
      </div>

      {/* Save Preset Form */}
      {isCreating && (
        <form onSubmit={handleSave} className="p-3.5 rounded-xl bg-white/5 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300">Name Your Atmosphere Preset</span>
            <span className="text-[11px] text-white/50">{currentAtmosphere.name}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Deep Focus Rain & Lo-Fi"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={!newPresetName.trim()}
              className="px-4 py-2 text-xs font-medium bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Preset List */}
      {presets.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-white/5 border border-white/10">
          <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-xs text-white/60">No custom presets saved yet.</p>
          <p className="text-[11px] text-white/40 mt-1">
            Mix your favorite background and sounds, then save it as a quick preset!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((preset) => {
            const activeTracks = Object.entries(preset.soundMixer.tracks)
              .filter(([, track]) => track.volume > 0 && !track.muted)
              .map(([id]) => id);

            const isCurrentlyApplied = appliedPresetId === preset.id;

            return (
              <div
                key={preset.id}
                className="group relative p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 transition flex items-center justify-between gap-3"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleApply(preset)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                      {preset.name}
                    </span>
                    {isCurrentlyApplied && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>{preset.atmosphereId}</span>
                    {activeTracks.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{activeTracks.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApply(preset)}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-indigo-500 text-white hover:text-white rounded-lg transition"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onDeletePreset(preset.id)}
                    className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
