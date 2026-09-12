import React from 'react';
import {
  Music,
  Image as ImageIcon,
  Settings,
  Maximize2,
  Minimize2,
  Keyboard,
  TrendingUp,
  Moon,
  Sun,
  Cloud,
  Users,
} from 'lucide-react';
import type { AtmosphereTheme, AppTheme, UserProfile, SyncStatus, AppLanguage } from '../types';
import { getTranslations, formatDurationHoursMinutes } from '../utils/translations';

interface HeaderProps {
  currentAtmosphere: AtmosphereTheme;
  todayPomodoros: number;
  todayMinutes: number;
  onOpenBackgrounds: () => void;
  onOpenSettings: () => void;
  onOpenAudio: () => void;
  onOpenShortcuts: () => void;
  onOpenHistory: () => void;
  onOpenFriends: () => void;
  incomingRequestsCount?: number;
  isAudioPlaying: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  timerRunning: boolean;
  theme?: AppTheme;
  language?: AppLanguage;
  onToggleTheme?: () => void;
  user: UserProfile | null;
  syncStatus?: SyncStatus;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  currentAtmosphere,
  todayPomodoros,
  todayMinutes,
  onOpenBackgrounds,
  onOpenSettings,
  onOpenAudio,
  onOpenShortcuts,
  onOpenHistory,
  onOpenFriends,
  incomingRequestsCount = 0,
  isAudioPlaying,
  isFullscreen,
  onToggleFullscreen,
  timerRunning,
  theme = 'dark',
  language = 'en',
  onToggleTheme,
  user,
  syncStatus,
  onOpenAuth,
}) => {
  const isLight = theme === 'light';
  const t = getTranslations(language);

  return (
    <header className="relative z-20 w-full px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex items-center justify-between shrink-0">
      {/* Brand & Atmosphere Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-panel p-1.5 shadow-sm shrink-0">
          <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle
              cx="32"
              cy="32"
              r="21"
              stroke={isLight ? '#4f46e5' : '#ffffff'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="98 34"
              transform="rotate(-90 32 32)"
              opacity="0.9"
            />
            <path
              d="M32 19 C32 27.5 32 27.5 23.5 32 C32 32 32 32 32 45 C32 36.5 32 36.5 40.5 32 C32 32 32 32 32 19 Z"
              fill={isLight ? '#4f46e5' : '#ec4899'}
            />
            <circle cx="32" cy="32" r="2.5" fill="#ffffff" />
          </svg>
          {timerRunning && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className={`text-sm sm:text-base font-bold tracking-wider uppercase font-sans leading-none sm:leading-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Luno
          </h1>
          <p className={`text-[10px] sm:text-xs font-medium truncate max-w-[75px] xs:max-w-[120px] sm:max-w-[200px] ${
            isLight ? 'text-slate-600' : 'text-white/60'
          }`}>
            {currentAtmosphere.name}
          </p>
        </div>
      </div>

      {/* Today Stats Pill - Centered at Viewport Horizontal Center */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center justify-center z-10">
        <button
          onClick={onOpenHistory}
          aria-label={t.focusHistoryTooltip}
          className={`pointer-events-auto flex items-center space-x-2 px-4 py-1.5 rounded-full glass-pill glass-panel-hover text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 whitespace-nowrap transition-all ${
            isLight
              ? 'text-slate-800 focus-visible:ring-slate-400'
              : 'text-white/90 focus-visible:ring-white/50'
          }`}
          title={t.focusHistoryTooltip}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className={isLight ? 'text-slate-500' : 'text-white/60'}>{t.today}:</span>
          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {todayPomodoros} {todayPomodoros === 1 ? t.todayPomodoroSingle : t.todayPomodoroPlural}
          </span>
          <span className={isLight ? 'text-slate-400' : 'text-white/40'}>•</span>
          <span className={isLight ? 'text-slate-700' : 'text-white/80'}>
            {formatDurationHoursMinutes(todayMinutes, language)} {t.todayFocused}
          </span>
        </button>
      </div>

      {/* Action Control Buttons */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 shrink-0">
        {/* Quick Theme Switcher Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            aria-label={isLight ? t.themeDark : t.themeLight}
            className={`p-1.5 xs:p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 flex items-center justify-center min-w-[30px] min-h-[30px] xs:min-w-[34px] xs:min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
              isLight
                ? 'text-amber-600 hover:text-amber-700 focus-visible:ring-slate-400'
                : 'text-white/80 hover:text-white focus-visible:ring-white/50'
            }`}
            title={isLight ? t.themeDark : t.themeLight}
          >
            {isLight ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        )}

        {/* Focus History Button */}
        <button
          onClick={onOpenHistory}
          aria-label={t.focusHistoryTooltip}
          className={`p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.focusHistoryTooltip}
        >
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Ambient Studio / Sound Mixer Toggle Button */}
        <button
          onClick={onOpenAudio}
          aria-label={t.soundMixerTooltip}
          className={`relative p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
            isAudioPlaying
              ? isLight
                ? 'ring-1 ring-indigo-500 bg-indigo-50 text-indigo-600'
                : 'ring-1 ring-indigo-400/60 bg-indigo-500/20 text-white'
              : isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.soundMixerTooltip}
        >
          <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {isAudioPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Background Selector Button */}
        <button
          onClick={onOpenBackgrounds}
          aria-label={t.atmosphereStudioTooltip}
          className={`p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.atmosphereStudioTooltip}
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Shortcuts Button - Hidden on mobile */}
        <button
          onClick={onOpenShortcuts}
          aria-label={t.shortcutsTooltip}
          className={`hidden md:flex p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 items-center justify-center min-w-[40px] min-h-[40px] ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.shortcutsTooltip}
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Friends & Community Button */}
        <button
          onClick={onOpenFriends}
          aria-label={`${t.friendsCommunityTooltip} ${incomingRequestsCount > 0 ? `(${incomingRequestsCount})` : ''}`}
          className={`relative p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 cursor-pointer flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
            incomingRequestsCount > 0
              ? isLight
                ? 'text-indigo-600 bg-indigo-50/80 border-indigo-200'
                : 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30'
              : isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={incomingRequestsCount > 0 ? `${t.friendsCommunityTooltip} (${incomingRequestsCount} ${t.newRequest})` : t.friendsCommunityTooltip}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {incomingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 sm:h-4 sm:min-w-4 sm:px-1 items-center justify-center rounded-full bg-indigo-500 text-[9px] sm:text-[10px] font-bold text-white shadow-md animate-pulse">
              {incomingRequestsCount}
            </span>
          )}
        </button>

        {/* Account / Sync Button */}
        <button
          onClick={onOpenAuth}
          aria-label={user ? `${t.account} (${user.nickname ? `@${user.nickname}` : user.email})` : t.signIn}
          className={`relative flex items-center space-x-1 sm:space-x-1.5 px-2 py-1.5 sm:px-3 sm:py-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 min-h-[34px] sm:min-h-[40px] ${
            user
              ? isLight
                ? 'text-indigo-600 bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100/70'
                : 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30 hover:bg-indigo-500/30'
              : isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={
            user
              ? syncStatus?.state === 'syncing'
                ? `${t.syncing}: ${user.nickname ? `@${user.nickname}` : user.email}`
                : syncStatus?.state === 'offline'
                ? `${t.offline}: ${user.nickname ? `@${user.nickname}` : user.email}`
                : (syncStatus?.pendingCount ?? 0) > 0
                ? `${t.savedLocally}: ${user.nickname ? `@${user.nickname}` : user.email}`
                : `${t.cloudSynced}: ${user.nickname ? `@${user.nickname}` : user.email}`
              : t.signIn
          }
        >
          {user ? (
            <>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Profile"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full object-cover shrink-0 border border-white/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-indigo-500/30 flex items-center justify-center text-[8px] sm:text-[9px] font-bold uppercase shrink-0">
                  {(user.nickname || user.displayName || user.email).slice(0, 1)}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-semibold max-w-[110px] truncate">
                {user.nickname ? `@${user.nickname}` : user.displayName || user.email.split('@')[0]}
              </span>
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                  syncStatus?.state === 'syncing'
                    ? 'bg-amber-400 animate-spin'
                    : syncStatus?.state === 'offline'
                    ? 'bg-slate-400'
                    : (syncStatus?.pendingCount ?? 0) > 0
                    ? 'bg-amber-300'
                    : 'bg-emerald-400'
                }`}
              />
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden md:inline text-xs font-medium">{t.signIn}</span>
            </>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          aria-label={t.settings}
          className={`p-2 sm:p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.settings}
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Fullscreen Button - Hidden on mobile */}
        <button
          onClick={onToggleFullscreen}
          aria-label={t.toggleFullscreen}
          className={`hidden md:flex p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 items-center justify-center min-w-[40px] min-h-[40px] ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title={t.toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
