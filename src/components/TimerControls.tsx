import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import type { TimerState } from '../types';

interface TimerControlsProps {
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  timerState,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
}) => {
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';

  return (
    <div className="flex items-center justify-center space-x-4 md:space-x-6 z-20">
      {/* Reset Button */}
      <button
        onClick={onReset}
        aria-label="Reset timer"
        className="p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover text-white/70 hover:text-white transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        title="Reset Timer (R)"
      >
        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Main Start / Pause / Resume Button */}
      {!isRunning ? (
        <button
          onClick={isPaused ? onResume : onStart}
          aria-label={isPaused ? 'Resume timer' : 'Start timer'}
          className="px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl bg-white text-black font-semibold text-base sm:text-lg shadow-2xl hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPaused ? 'RESUME' : 'START'}</span>
        </button>
      ) : (
        <button
          onClick={onPause}
          aria-label="Pause timer"
          className="px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl bg-white/20 backdrop-blur-md text-white font-semibold text-base sm:text-lg border border-white/40 shadow-2xl hover:bg-white/30 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <Pause className="w-5 h-5 fill-current" />
          <span>PAUSE</span>
        </button>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        aria-label="Skip to next session"
        className="p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover text-white/70 hover:text-white transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        title="Skip Session (S)"
      >
        <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
};
