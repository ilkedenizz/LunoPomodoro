import React from 'react';
import { X, Volume2, Bell, RefreshCw, Zap } from 'lucide-react';
import type { TimerSettings } from '../types';

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

  const handleStepper = (key: 'pomodoroDuration' | 'shortBreakDuration' | 'longBreakDuration', delta: number) => {
    const current = settings[key];
    const updated = Math.max(1, Math.min(120, current + delta));
    handleChange(key, updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
      <div
        className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl glass-modal text-white overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 id="settings-title" className="text-xl font-bold text-white flex items-center gap-2">
            Timer Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Time Durations */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
              Timer Durations (minutes)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Pomodoro */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs text-white/70 font-medium mb-2">Pomodoro</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStepper('pomodoroDuration', -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.pomodoroDuration}</span>
                  <button
                    onClick={() => handleStepper('pomodoroDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
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
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.shortBreakDuration}</span>
                  <button
                    onClick={() => handleStepper('shortBreakDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
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
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-timer text-lg font-bold">{settings.longBreakDuration}</span>
                  <button
                    onClick={() => handleStepper('longBreakDuration', 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Toggles */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Automation
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-sm text-white/90">Auto-start Breaks</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                  className="w-5 h-5 accent-white rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-sm text-white/90">Auto-start Pomodoros</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartPomodoros}
                  onChange={(e) => handleChange('autoStartPomodoros', e.target.checked)}
                  className="w-5 h-5 accent-white rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Sounds & Notifications */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Audio & Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/90">Completion Alarm Sound</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                  className="w-5 h-5 accent-white rounded cursor-pointer"
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
                  className="w-5 h-5 accent-white rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset today statistics?')) {
                onResetStats();
              }
            }}
            className="text-xs text-red-400/80 hover:text-red-300 flex items-center gap-1 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Today's Stats
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
