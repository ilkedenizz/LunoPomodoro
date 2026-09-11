import React from 'react';
import type { TimerMode, AppTheme, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

interface TimerModeSelectorProps {
  currentMode: TimerMode;
  onSelectMode: (mode: TimerMode) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const TimerModeSelector: React.FC<TimerModeSelectorProps> = React.memo(({
  currentMode,
  onSelectMode,
  theme = 'dark',
  language = 'en',
}) => {
  const isLight = theme === 'light';
  const t = getTranslations(language);

  const modes: { id: TimerMode; label: string }[] = [
    { id: 'pomodoro', label: t.pomodoro },
    { id: 'shortBreak', label: t.shortBreak },
    { id: 'longBreak', label: t.longBreak },
  ];

  return (
    <nav
      aria-label="Timer Mode Switcher"
      className="inline-flex p-1.5 rounded-2xl glass-panel max-w-full overflow-x-auto"
    >
      <div className="flex space-x-1 sm:space-x-2">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              aria-pressed={isActive}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap focus:outline-none focus-visible:ring-2 ${
                isActive
                  ? isLight
                    ? 'bg-slate-900/10 text-slate-900 shadow-sm border border-slate-900/20 font-semibold focus-visible:ring-slate-400'
                    : 'bg-white/20 text-white shadow-lg backdrop-blur-md border border-white/30 font-semibold focus-visible:ring-white/50'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5 focus-visible:ring-slate-400'
                  : 'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white/50'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

TimerModeSelector.displayName = 'TimerModeSelector';
