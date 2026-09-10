import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import type { TimerState, AppTheme } from '../types';

interface TimerControlsProps {
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  theme?: AppTheme;
}

export const TimerControls: React.FC<TimerControlsProps> = React.memo(({
  timerState,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  theme = 'dark',
}) => {
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isLight = theme === 'light';

  return (
    <div className="flex items-center justify-center space-x-4 sm:space-x-6 z-20 my-2">
      {/* Reset Button */}
      <button
        onClick={onReset}
        aria-label="Reset timer"
        className={`min-w-[48px] min-h-[48px] p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 ${
          isLight
            ? 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
            : 'text-white/70 hover:text-white focus-visible:ring-white/60'
        }`}
        title="Reset Timer (R)"
      >
        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Main Primary Action Button: START / PAUSE / RESUME */}
      {!isRunning ? (
        <button
          onClick={isPaused ? onResume : onStart}
          aria-label={isPaused ? 'Resume timer' : 'Start timer'}
          className={`min-h-[48px] px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 cursor-pointer ${
            isLight
              ? 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400'
              : 'bg-white text-black hover:bg-white/90 focus-visible:ring-white/60'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPaused ? 'RESUME' : 'START'}</span>
        </button>
      ) : (
        <button
          onClick={onPause}
          aria-label="Pause timer"
          className={`min-h-[48px] px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg border shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 cursor-pointer ${
            isLight
              ? 'bg-slate-900/10 backdrop-blur-md text-slate-900 border-slate-900/25 hover:bg-slate-900/20 focus-visible:ring-slate-400'
              : 'bg-white/20 backdrop-blur-md text-white border-white/40 hover:bg-white/30 focus-visible:ring-white/60'
          }`}
        >
          <Pause className="w-5 h-5 fill-current" />
          <span>PAUSE</span>
        </button>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        aria-label="Skip to next session"
        className={`min-w-[48px] min-h-[48px] p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 ${
          isLight
            ? 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
            : 'text-white/70 hover:text-white focus-visible:ring-white/60'
        }`}
        title="Skip Session (S)"
      >
        <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
});

TimerControls.displayName = 'TimerControls';
