import React from 'react';
import type { TimerMode } from '../types';

interface TimerModeSelectorProps {
  currentMode: TimerMode;
  onSelectMode: (mode: TimerMode) => void;
}

export const TimerModeSelector: React.FC<TimerModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const modes: { id: TimerMode; label: string }[] = [
    { id: 'pomodoro', label: 'Pomodoro' },
    { id: 'shortBreak', label: 'Short Break' },
    { id: 'longBreak', label: 'Long Break' },
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
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-md border border-white/30 font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
