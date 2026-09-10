import React from 'react';
import { X, Volume2, Bell, RefreshCw, Zap, Sliders, Moon, Sun, Palette, Check } from 'lucide-react';
import type { TimerSettings, AppTheme, TimerColorId } from '../types';
import { TIMER_COLORS } from '../utils/timerColors';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onSaveSettings: (newSettings: TimerSettings) => void;
  onResetStats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof TimerSettings, value: unknown) => {
    onSaveSettings({ ...settings, [key]: value });
  };

  const handleStepper = (
    key: 'pomodoroDuration' | 'shortBreakDuration' | 'longBreakDuration',
    delta: number
  ) => {
    const current = settings[key];
    const updated = Math.max(1, Math.min(120, current + delta));
    handleChange(key, updated);
  };

  const isLight = settings.theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all">
      <div
        className="relative w-full max-w-md p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal text-white overflow-hidden shadow-2xl border border-white/15 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white border border-white/15">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 id="settings-title" className="text-lg sm:text-xl font-bold tracking-tight">
              Timer Settings
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6 py-4 overflow-y-auto pr-1 flex-1">
          {/* Appearance / Theme Mode */}
          <div>
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" /> Appearance / Theme
            </h3>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => handleChange('theme', 'dark' as AppTheme)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  settings.theme !== 'light'
                    ? 'bg-white/20 text-white shadow-md border border-white/25 font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Theme</span>
              </button>

              <button
                type="button"
                onClick={() => handleChange('theme', 'light' as AppTheme)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  settings.theme === 'light'
                    ? 'bg-amber-100 text-slate-900 shadow-md border border-amber-300 font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
              </button>
            </div>
          </div>

          {/* Timer Color Picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Timer Color
              </h3>
              <span className="text-[11px] font-medium text-white/70">
                {TIMER_COLORS.find((c) => c.id === (settings.timerColor || 'default'))?.name}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
                {TIMER_COLORS.map((color) => {
                  const isSelected = (settings.timerColor || 'default') === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleChange('timerColor', color.id as TimerColorId)}
                      aria-label={`Select ${color.name} timer color`}
                      title={`${color.name} (${color.nameTr})`}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                        isSelected
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/50 shadow-lg'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: color.swatchHex,
                      }}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Durations */}
          <div>
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3">
              Timer Durations (Minutes)
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Pomodoro */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs text-white/70 font-medium mb-2">Pomodoro</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStepper('pomodoroDuration', -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.pomodoroDuration}</span>
                  <button
                    onClick={() => handleStepper('pomodoroDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Short Break */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs text-white/70 font-medium mb-2">Short Break</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStepper('shortBreakDuration', -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.shortBreakDuration}</span>
                  <button
                    onClick={() => handleStepper('shortBreakDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Long Break */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs text-white/70 font-medium mb-2">Long Break</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStepper('longBreakDuration', -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.longBreakDuration}</span>
                  <button
                    onClick={() => handleStepper('longBreakDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Toggles */}
          <div>
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Automation
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-sm text-white/90">Auto-start Breaks</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                  className="w-5 h-5 accent-indigo-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-sm text-white/90">Auto-start Pomodoros</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartPomodoros}
                  onChange={(e) => handleChange('autoStartPomodoros', e.target.checked)}
                  className="w-5 h-5 accent-indigo-400 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Audio & Notifications */}
          <div>
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Audio & Notifications
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/90">Completion Sound Chime</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                  className="w-5 h-5 accent-indigo-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/90">Browser Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => {
                    if (e.target.checked && Notification.permission !== 'granted') {
                      Notification.requestPermission();
                    }
                    handleChange('notificationsEnabled', e.target.checked);
                  }}
                  className="w-5 h-5 accent-indigo-400 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset today statistics?')) {
                onResetStats();
              }
            }}
            className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Today's Stats
          </button>

          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
