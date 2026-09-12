import React, { useState } from 'react';
import type { AtmospherePreset, AtmosphereTheme, SoundMixerState, AppLanguage } from '../types';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { getTranslations } from '../utils/translations';
import { getAtmosphereDisplayName } from '../utils/backgrounds';

interface PresetsManagerProps {
  currentAtmosphere: AtmosphereTheme;
  currentMixerState: SoundMixerState;
  presets: AtmospherePreset[];
  onApplyPreset: (preset: AtmospherePreset) => void;
  onSavePreset: (preset: AtmospherePreset) => void;
  onDeletePreset: (presetId: string) => void;
  language?: AppLanguage;
}

export const PresetsManager: React.FC<PresetsManagerProps> = ({
  currentAtmosphere,
  currentMixerState,
  presets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  language = 'en',
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const t = getTranslations(language);

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
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-500" />
          <h4 className="text-sm font-semibold">{t.presetsTitle}</h4>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.saveCurrentSetup}</span>
          </button>
        )}
      </div>

      {/* Save Preset Form */}
      {isCreating && (
        <form onSubmit={handleSave} className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{t.nameYourPreset}</span>
            <span className="text-[11px] opacity-50">{getAtmosphereDisplayName(currentAtmosphere, language)}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t.presetPlaceholder}
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-2 text-sm bg-black/10 dark:bg-black/30 border border-black/15 dark:border-white/15 rounded-lg placeholder:opacity-40 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newPresetName.trim()}
              className="px-4 py-2 text-xs font-medium bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition cursor-pointer"
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-2 text-xs font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 opacity-70 rounded-lg transition cursor-pointer"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Preset List */}
      {presets.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
            <Bookmark className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-semibold">{t.noPresetsYet}</p>
          <p className="text-xs opacity-60 max-w-xs leading-relaxed">
            {t.noPresetsHint}
          </p>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.saveCurrentSetup}</span>
            </button>
          )}
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
                className="group relative p-3.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 hover:border-indigo-500/40 transition flex items-center justify-between gap-3"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleApply(preset)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                      {preset.name}
                    </span>
                    {isCurrentlyApplied && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3" /> {t.activeBadge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs opacity-50">
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
                    className="px-3 py-1.5 text-xs font-medium bg-black/10 dark:bg-white/10 hover:bg-indigo-500 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    {t.applyPreset}
                  </button>
                  <button
                    onClick={() => onDeletePreset(preset.id)}
                    className="p-1.5 opacity-40 hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title={t.deletePreset}
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
