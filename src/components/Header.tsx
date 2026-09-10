import React from 'react';
import { Sparkles, Music, Image as ImageIcon, Settings, Maximize2, Minimize2, Keyboard, TrendingUp } from 'lucide-react';
import type { AtmosphereTheme } from '../types';

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
}

export const Header: React.FC<HeaderProps> = ({
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
}) => {
  const formatHoursMinutes = (totalMinutes: number) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <header className="relative z-20 w-full px-4 md:px-8 py-4 flex items-center justify-between">
      {/* Brand & Atmosphere Label */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl glass-panel">
          <Sparkles className="w-4 h-4 text-white/90" />
          {timerRunning && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wider text-white uppercase font-sans">
            Study<span className="text-white/50">Flow</span>
          </h1>
          <p className="text-xs text-white/60 font-medium">
            {currentAtmosphere.name}
          </p>
        </div>
      </div>

      {/* Today Stats Pill - Desktop */}
      <button
        onClick={onOpenHistory}
        aria-label="View focus history and statistics"
        className="hidden md:flex items-center space-x-2 px-4 py-1.5 rounded-full glass-pill glass-panel-hover text-xs font-medium text-white/90 cursor-pointer"
        title="View Focus History"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400/80 animate-pulse" />
        <span className="text-white/60">Today:</span>
        <span className="font-semibold text-white">{todayPomodoros} {todayPomodoros === 1 ? 'pomodoro' : 'pomodoros'}</span>
        <span className="text-white/40">•</span>
        <span className="text-white/80">{formatHoursMinutes(todayMinutes)} focused</span>
      </button>

      {/* Action Control Buttons */}
      <div className="flex items-center space-x-2">
        {/* Focus History Button */}
        <button
          onClick={onOpenHistory}
          aria-label="Open Focus History"
          className="p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all"
          title="Focus History & Stats"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {/* Ambience Audio Toggle Button */}
        <button
          onClick={onOpenAudio}
          aria-label="Toggle ambient music"
          className={`relative p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all ${
            isAudioPlaying ? 'ring-1 ring-white/40 bg-white/15' : ''
          }`}
          title="Ambient Sounds (M)"
        >
          <Music className="w-4 h-4" />
          {isAudioPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          )}
        </button>

        {/* Background Selector Button */}
        <button
          onClick={onOpenBackgrounds}
          aria-label="Select atmosphere background"
          className="p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all"
          title="Change Atmosphere"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          aria-label="View keyboard shortcuts"
          className="hidden sm:flex p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          aria-label="Timer settings"
          className="p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen mode"
          className="hidden sm:flex p-2.5 rounded-xl glass-panel glass-panel-hover text-white/80 hover:text-white transition-all"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
