import React, { useState } from 'react';
import { X, Check, Heart, Sliders, Sparkles, Image as ImageIcon, Bookmark } from 'lucide-react';
import { ATMOSPHERES } from '../utils/backgrounds';
import type { AtmosphereTheme, SoundMixerState, AtmospherePreset } from '../types';
import { SoundMixer } from './SoundMixer';
import { PresetsManager } from './PresetsManager';

interface BackgroundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeId: string;
  onSelect: (atmosphere: AtmosphereTheme) => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  mixerState: SoundMixerState;
  onMixerChange: (state: SoundMixerState) => void;
  presets: AtmospherePreset[];
  onApplyPreset: (preset: AtmospherePreset) => void;
  onSavePreset: (preset: AtmospherePreset) => void;
  onDeletePreset: (presetId: string) => void;
}

type TabType = 'atmospheres' | 'mixer' | 'presets';
type CategoryFilter = 'all' | 'favorites';

export const BackgroundSelectorModal: React.FC<BackgroundSelectorModalProps> = ({
  isOpen,
  onClose,
  activeId,
  onSelect,
  favoriteIds,
  onToggleFavorite,
  mixerState,
  onMixerChange,
  presets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('atmospheres');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  if (!isOpen) return null;

  const currentAtmosphereObj = ATMOSPHERES.find((a) => a.id === activeId) || ATMOSPHERES[0];

  const displayedAtmospheres = ATMOSPHERES.filter((item) => {
    if (categoryFilter === 'favorites') return favoriteIds.includes(item.id);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all">
      <div
        className="relative w-full max-w-3xl p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="atmosphere-2-title"
      >
        {/* Header & Tabs */}
        <div className="flex flex-col gap-4 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 id="atmosphere-2-title" className="text-lg sm:text-xl font-bold text-white">
                  Atmosphere & Ambient Sound Studio
                </h2>
                <p className="text-xs text-white/60">
                  Craft your custom study backdrop, ambient audio mix, and focus environment
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close studio modal"
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('atmospheres')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'atmospheres'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Atmospheres</span>
            </button>

            <button
              onClick={() => setActiveTab('mixer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'mixer'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Sound Mixer</span>
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'presets'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Presets ({presets.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Atmosphere Selection */}
        {activeTab === 'atmospheres' && (
          <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Filter Pills */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'all'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  All ({ATMOSPHERES.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('favorites')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'favorites'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
                  <span>Favorites ({favoriteIds.length})</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            {displayedAtmospheres.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                <Heart className="w-8 h-8 text-rose-400/40 mx-auto mb-2" />
                <p className="text-sm text-white/70">No favorite atmospheres yet.</p>
                <p className="text-xs text-white/40 mt-1">
                  Click the heart icon on any atmosphere card to add it to your favorites!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedAtmospheres.map((item) => {
                  const isActive = item.id === activeId;
                  const isFavorite = favoriteIds.includes(item.id);
                  const bgStyle = item.cssBackground || item.fallbackGradient || '';

                  return (
                    <div
                      key={item.id}
                      className={`group relative h-44 rounded-2xl overflow-hidden text-left transition-all duration-300 border flex flex-col justify-between ${
                        isActive
                          ? 'ring-2 ring-indigo-400 border-indigo-400 scale-[1.02] shadow-2xl'
                          : 'border-white/15 hover:border-white/40 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Background Visual Layer */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{
                          background: bgStyle,
                          backgroundImage: item.imageUrl ? `url(${item.imageUrl}), ${bgStyle}` : bgStyle,
                        }}
                      />

                      {/* Vignette Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

                      {/* Top Header: Favorite Button & Active Tag */}
                      <div className="relative z-10 p-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.id);
                          }}
                          className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                            isFavorite
                              ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50'
                              : 'bg-black/30 text-white/50 hover:text-white hover:bg-black/50 border border-white/10'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        {isActive && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold bg-indigo-500 text-white px-2.5 py-1 rounded-full shadow-lg">
                            <Check className="w-3 h-3 stroke-[3]" /> Active
                          </span>
                        )}
                      </div>

                      {/* Bottom Info & Clickable Select */}
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="relative z-10 p-3.5 text-left w-full h-full flex flex-col justify-end group-hover:bg-white/5 transition"
                      >
                        <span className="font-semibold text-sm text-white drop-shadow-md group-hover:text-indigo-300 transition">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-white/70 line-clamp-1 mt-0.5">
                          {item.tagline}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sound Mixer */}
        {activeTab === 'mixer' && (
          <div className="py-4 overflow-y-auto pr-1 flex-1">
            <SoundMixer mixerState={mixerState} onChange={onMixerChange} />
          </div>
        )}

        {/* Tab 3: Presets */}
        {activeTab === 'presets' && (
          <div className="py-4 overflow-y-auto pr-1 flex-1">
            <PresetsManager
              currentAtmosphere={currentAtmosphereObj}
              currentMixerState={mixerState}
              presets={presets}
              onApplyPreset={(preset) => {
                const targetAtmo = ATMOSPHERES.find((a) => a.id === preset.atmosphereId);
                if (targetAtmo) onSelect(targetAtmo);
                onApplyPreset(preset);
              }}
              onSavePreset={onSavePreset}
              onDeletePreset={onDeletePreset}
            />
          </div>
        )}
      </div>
    </div>
  );
};
