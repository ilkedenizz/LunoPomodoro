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
} from 'lucide-react';
import type { AtmosphereTheme, AppTheme, UserProfile, SyncStatus } from '../types';

interface HeaderProps {
  currentAtmosphere: AtmosphereTheme;
  todayPomodoros: number;
  todayMinutes: number;
  onOpenBackgrounds: () => void;
  onOpenSettings: () => void;
  onOpenAudio: () => void;
  onOpenShortcuts: () => void;
  onOpenHistory: () => void;
  isAudioPlaying: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  timerRunning: boolean;
  theme?: AppTheme;
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
  isAudioPlaying,
  isFullscreen,
  onToggleFullscreen,
  timerRunning,
  theme = 'dark',
  onToggleTheme,
  user,
  syncStatus,
  onOpenAuth,
}) => {
  const isLight = theme === 'light';

  const formatHoursMinutes = (totalMinutes: number) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <header className="relative z-20 w-full px-4 md:px-8 py-3 sm:py-3.5 flex items-center justify-between shrink-0">
      {/* Brand & Atmosphere Title */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl glass-panel p-1.5 shadow-sm">
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
        <div>
          <h1 className={`text-base font-bold tracking-wider uppercase font-sans ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Luno
          </h1>
          <p className={`text-xs font-medium line-clamp-1 ${
            isLight ? 'text-slate-600' : 'text-white/60'
          }`}>
            {currentAtmosphere.name}
          </p>
        </div>
      </div>

      {/* Today Stats Pill - Desktop */}
      <button
        onClick={onOpenHistory}
        aria-label="View focus history and statistics"
        className={`hidden md:flex items-center space-x-2 px-4 py-1.5 rounded-full glass-pill glass-panel-hover text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 ${
          isLight
            ? 'text-slate-800 focus-visible:ring-slate-400'
            : 'text-white/90 focus-visible:ring-white/50'
        }`}
        title="View Focus History"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className={isLight ? 'text-slate-500' : 'text-white/60'}>Today:</span>
        <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {todayPomodoros} {todayPomodoros === 1 ? 'pomodoro' : 'pomodoros'}
        </span>
        <span className={isLight ? 'text-slate-400' : 'text-white/40'}>•</span>
        <span className={isLight ? 'text-slate-700' : 'text-white/80'}>
          {formatHoursMinutes(todayMinutes)} focused
        </span>
      </button>

      {/* Action Control Buttons */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Quick Theme Switcher Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
            className={`p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
              isLight
                ? 'text-amber-600 hover:text-amber-700 focus-visible:ring-slate-400'
                : 'text-white/80 hover:text-white focus-visible:ring-white/50'
            }`}
            title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          >
            {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Focus History Button */}
        <button
          onClick={onOpenHistory}
          aria-label="Open Focus History"
          className={`p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Focus History & Stats"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {/* Ambient Studio / Sound Mixer Toggle Button */}
        <button
          onClick={onOpenAudio}
          aria-label="Toggle ambient music and sound mixer"
          className={`relative p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isAudioPlaying
              ? isLight
                ? 'ring-1 ring-indigo-500 bg-indigo-50 text-indigo-600'
                : 'ring-1 ring-indigo-400/60 bg-indigo-500/20 text-white'
              : isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Ambient Sound Mixer (M)"
        >
          <Music className="w-4 h-4" />
          {isAudioPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Background Selector Button */}
        <button
          onClick={onOpenBackgrounds}
          aria-label="Select atmosphere background"
          className={`p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Atmosphere Studio"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          aria-label="View keyboard shortcuts"
          className={`hidden sm:flex p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Account / Sync Button */}
        <button
          onClick={onOpenAuth}
          aria-label={user ? `Account (${user.nickname ? `@${user.nickname}` : user.email})` : 'Sign in or create account'}
          className={`relative flex items-center space-x-1.5 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
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
                ? `Syncing: ${user.nickname ? `@${user.nickname}` : user.email}`
                : syncStatus?.state === 'offline'
                ? `Offline: ${user.nickname ? `@${user.nickname}` : user.email}`
                : (syncStatus?.pendingCount ?? 0) > 0
                ? `Saved locally (sync will retry): ${user.nickname ? `@${user.nickname}` : user.email}`
                : `Synced: ${user.nickname ? `@${user.nickname}` : user.email}`
              : 'Sign in to sync your focus data'
          }
        >
          {user ? (
            <>
              <div className="w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] font-bold uppercase">
                {(user.nickname || user.displayName || user.email).slice(0, 1)}
              </div>
              <span className="hidden lg:inline text-xs font-semibold max-w-[110px] truncate">
                {user.nickname ? `@${user.nickname}` : user.displayName || user.email.split('@')[0]}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
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
              <Cloud className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs font-medium">Sign In</span>
            </>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          aria-label="Timer settings"
          className={`p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen mode"
          className={`hidden sm:flex p-2.5 rounded-xl glass-panel glass-panel-hover transition-all focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-700 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/80 hover:text-white focus-visible:ring-white/50'
          }`}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
