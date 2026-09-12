import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  Heart,
  Sliders,
  Sparkles,
  Image as ImageIcon,
  Bookmark,
  Upload,
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  getAtmospheres,
  ATMOSPHERES,
  createCustomAtmosphere,
  processBackgroundImage,
  getAtmosphereDisplayName,
  getAtmosphereDisplayTagline,
} from '../utils/backgrounds';
import {
  loadCustomBackground,
  saveCustomBackground,
  removeCustomBackground,
} from '../utils/storage';
import type { AtmosphereTheme, SoundMixerState, AtmospherePreset, AppTheme, AppLanguage } from '../types';
import { SoundMixer } from './SoundMixer';
import { PresetsManager } from './PresetsManager';
import { getTranslations } from '../utils/translations';

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
  theme?: AppTheme;
  language?: AppLanguage;
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
  theme = 'dark',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const [activeTab, setActiveTab] = useState<TabType>('atmospheres');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [customImage, setCustomImage] = useState<string | null>(() => loadCustomBackground());
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);
  const [customUploadError, setCustomUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isLight = theme === 'light';
  const availableAtmospheres = getAtmospheres(theme);
  const currentAtmosphereObj = ATMOSPHERES.find((a) => a.id === activeId) || availableAtmospheres[0];

  const handleCustomFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingCustom(true);
    setCustomUploadError(null);

    try {
      const optimizedUrl = await processBackgroundImage(file);
      saveCustomBackground(optimizedUrl);
      setCustomImage(optimizedUrl);
      const customAtmo = createCustomAtmosphere(optimizedUrl, theme);
      onSelect(customAtmo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image.';
      setCustomUploadError(msg);
    } finally {
      setIsUploadingCustom(false);
    }
  };

  const handleRemoveCustom = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomBackground();
    setCustomImage(null);
    if (activeId === 'custom') {
      const defaultAtmo = availableAtmospheres[0];
      onSelect(defaultAtmo);
    }
  };

  const displayedAtmospheres = availableAtmospheres.filter((item) => {
    if (categoryFilter === 'favorites') return favoriteIds.includes(item.id);
    return true;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl p-4 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col cursor-default pb-[max(1.25rem,var(--sab))] ${
          isLight ? 'text-slate-900 border-slate-200/80' : 'text-white border-white/20'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atmosphere-2-title"
      >
        {/* Header & Tabs */}
        <div className={`flex flex-col gap-4 pb-4 border-b shrink-0 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${
                isLight
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 id="atmosphere-2-title" className={`text-lg sm:text-xl font-bold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {t.atmosphereStudioTitle}
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                  {isLight ? t.atmosphereStudioSubtitleLight : t.atmosphereStudioSubtitleDark}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label={t.close}
              className={`p-2 rounded-xl transition-all ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={`flex items-center gap-2 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <button
              onClick={() => setActiveTab('atmospheres')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'atmospheres'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'bg-indigo-500 text-white shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{t.atmospheresTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('mixer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'mixer'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'bg-indigo-500 text-white shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{t.soundMixerTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition ${
                activeTab === 'presets'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'bg-indigo-500 text-white shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>{t.presetsTab} ({presets.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Atmosphere Selection */}
        {activeTab === 'atmospheres' && (
          <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Custom Upload Error Alert */}
            {customUploadError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{customUploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomUploadError(null)}
                  className="text-xs underline hover:text-white cursor-pointer"
                >
                  {t.dismiss}
                </button>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'all'
                      ? isLight
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white/20 text-white border border-white/30'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t.all} ({availableAtmospheres.length + (customImage ? 1 : 0)})
                </button>
                <button
                  onClick={() => setCategoryFilter('favorites')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'favorites'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
                  <span>{t.favorites} ({favoriteIds.filter(id => availableAtmospheres.some(a => a.id === id)).length})</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            {displayedAtmospheres.length === 0 && (categoryFilter === 'favorites' || !customImage) ? (
              <div className={`p-8 text-center rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <Heart className="w-8 h-8 text-rose-400/40 mx-auto mb-2" />
                <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-white/70'}`}>{t.noFavoritesYet}</p>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                  {t.noFavoritesHint}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* 0. Custom Wallpaper Upload Card */}
                {categoryFilter === 'all' && (
                  <div
                    className={`group relative h-44 rounded-2xl overflow-hidden text-left transition-all duration-300 border flex flex-col justify-between ${
                      activeId === 'custom' && customImage
                        ? isLight
                          ? 'ring-2 ring-indigo-600 border-indigo-600 scale-[1.02] shadow-xl'
                          : 'ring-2 ring-indigo-400 border-indigo-400 scale-[1.02] shadow-2xl'
                        : customImage
                        ? isLight
                          ? 'border-slate-200 hover:border-slate-400 hover:scale-[1.01] shadow-sm'
                          : 'border-white/15 hover:border-white/40 hover:scale-[1.01]'
                        : isLight
                        ? 'border-dashed border-2 border-indigo-300/80 bg-indigo-50/40 hover:bg-indigo-50/80 hover:border-indigo-500'
                        : 'border-dashed border-2 border-indigo-400/40 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400/80'
                    }`}
                  >
                    {customImage ? (
                      <>
                        {/* Background Visual Layer */}
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{
                            backgroundImage: `url(${customImage})`,
                          }}
                        />

                        {/* Vignette Overlay */}
                        <div
                          className={`absolute inset-0 ${
                            isLight
                              ? 'bg-gradient-to-t from-white/95 via-white/40 to-transparent'
                              : 'bg-gradient-to-t from-black/85 via-black/40 to-black/20'
                          }`}
                        />

                        {/* Top Header: Change / Delete / Active */}
                        <div className="relative z-10 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              disabled={isUploadingCustom}
                              className={`p-1.5 px-2.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer ${
                                isLight
                                  ? 'bg-white/90 text-slate-800 hover:bg-white border border-slate-200 shadow-xs'
                                  : 'bg-black/50 text-white hover:bg-black/70 border border-white/15'
                              }`}
                              title={t.changeWallpaper}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{t.changeWallpaper}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleRemoveCustom}
                              disabled={isUploadingCustom}
                              className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 bg-black/40 hover:bg-black/60 border border-rose-500/30 backdrop-blur-md transition-all cursor-pointer"
                              title={t.removeCustomBg}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {activeId === 'custom' && (
                            <span
                              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md ${
                                isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white shadow-lg'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" /> {t.activeBadge}
                            </span>
                          )}
                        </div>

                        {/* Bottom Info & Clickable Select */}
                        <button
                          type="button"
                          onClick={() => {
                            if (customImage) {
                              const customAtmo = createCustomAtmosphere(customImage, theme);
                              onSelect(customAtmo);
                            }
                          }}
                          className={`relative z-10 p-3.5 text-left w-full h-full flex flex-col justify-end transition cursor-pointer ${
                            isLight ? 'group-hover:bg-black/[0.02]' : 'group-hover:bg-white/5'
                          }`}
                        >
                          <span
                            className={`font-semibold text-sm transition ${
                              isLight
                                ? 'text-slate-900 group-hover:text-indigo-600'
                                : 'text-white drop-shadow-md group-hover:text-indigo-300'
                            }`}
                          >
                            {t.customWallpaper}
                          </span>
                          <span className={`text-[11px] line-clamp-1 mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/70'}`}>
                            {t.yourUploadedPhoto}
                          </span>
                        </button>
                      </>
                    ) : (
                      /* Empty Upload Prompt */
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingCustom}
                        className="relative z-10 w-full h-full p-4 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer"
                      >
                        <div
                          className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${
                            isLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {isUploadingCustom ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <span
                            className={`text-xs font-bold block ${
                              isLight ? 'text-indigo-950' : 'text-white'
                            }`}
                          >
                            {isUploadingCustom ? t.optimizingImage : t.uploadWallpaper}
                          </span>
                          <span
                            className={`text-[10px] block mt-0.5 ${
                              isLight ? 'text-slate-500' : 'text-white/60'
                            }`}
                          >
                            JPG, PNG, WebP
                          </span>
                        </div>
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleCustomFileChange}
                      className="hidden"
                    />
                  </div>
                )}
                {displayedAtmospheres.map((item) => {
                  const isActive = item.id === activeId;
                  const isFavorite = favoriteIds.includes(item.id);
                  const bgStyle = item.cssBackground || item.fallbackGradient || '';

                  return (
                    <div
                      key={item.id}
                      className={`group relative h-44 rounded-2xl overflow-hidden text-left transition-all duration-300 border flex flex-col justify-between ${
                        isActive
                          ? isLight
                            ? 'ring-2 ring-indigo-600 border-indigo-600 scale-[1.02] shadow-xl'
                            : 'ring-2 ring-indigo-400 border-indigo-400 scale-[1.02] shadow-2xl'
                          : isLight
                          ? 'border-slate-200 hover:border-slate-400 hover:scale-[1.01] shadow-sm'
                          : 'border-white/15 hover:border-white/40 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Background Visual Layer */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{
                          background: bgStyle,
                          backgroundImage: !isLight && item.imageUrl ? `url(${item.imageUrl}), ${bgStyle}` : bgStyle,
                        }}
                      />

                      {/* Vignette Overlay */}
                      <div className={`absolute inset-0 ${
                        isLight
                          ? 'bg-gradient-to-t from-white/95 via-white/40 to-transparent'
                          : 'bg-gradient-to-t from-black/85 via-black/40 to-black/20'
                      }`} />

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
                              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                              : isLight
                              ? 'bg-white/80 text-slate-500 hover:text-slate-900 hover:bg-white border border-slate-200'
                              : 'bg-black/30 text-white/50 hover:text-white hover:bg-black/50 border border-white/10'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        {isActive && (
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md ${
                            isLight
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-500 text-white shadow-lg'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" /> {t.activeBadge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Info & Clickable Select */}
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className={`relative z-10 p-3.5 text-left w-full h-full flex flex-col justify-end transition ${
                          isLight ? 'group-hover:bg-black/[0.02]' : 'group-hover:bg-white/5'
                        }`}
                      >
                        <span className={`font-semibold text-sm transition ${
                          isLight
                            ? 'text-slate-900 group-hover:text-indigo-600'
                            : 'text-white drop-shadow-md group-hover:text-indigo-300'
                        }`}>
                          {getAtmosphereDisplayName(item, language)}
                        </span>
                        <span className={`text-[11px] line-clamp-1 mt-0.5 ${
                          isLight ? 'text-slate-500' : 'text-white/70'
                        }`}>
                          {getAtmosphereDisplayTagline(item, language)}
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
            <SoundMixer mixerState={mixerState} onChange={onMixerChange} language={language} />
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
              language={language}
            />
          </div>
        )}
      </div>
    </div>
  );
};
