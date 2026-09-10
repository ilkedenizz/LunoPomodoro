import React from 'react';
import type { TimerMode, TimerState } from '../types';

interface MainTimerDisplayProps {
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  mode: TimerMode;
  state: TimerState;
  completedPomodoros: number;
  activeTaskTitle?: string | null;
}

export const MainTimerDisplay: React.FC<MainTimerDisplayProps> = ({
  timeLeftSeconds,
  totalDurationSeconds,
  mode,
  state,
  completedPomodoros,
  activeTaskTitle,
}) => {
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const progress =
    totalDurationSeconds > 0
      ? ((totalDurationSeconds - timeLeftSeconds) / totalDurationSeconds) * 100
      : 0;

  const currentCycleIndex = (completedPomodoros % 4) + 1;

  const modeTitle =
    mode === 'pomodoro'
      ? 'Focus Session'
      : mode === 'shortBreak'
      ? 'Short Break'
      : 'Long Break';

  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  return (
    <div className="relative flex flex-col items-center justify-center my-2 sm:my-3 select-none w-full">
      {/* Main Outer Timer Circle Container with Radial Glow */}
      <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 md:w-88 md:h-88 xl:w-96 xl:h-96">
        {/* Atmospheric Radial Light Glow behind Timer */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 pointer-events-none ${
            isRunning
              ? 'timer-radial-glow-running animate-pulse-soft'
              : isPaused
              ? 'timer-radial-glow opacity-60'
              : 'timer-radial-glow opacity-80'
          }`}
        />

        {/* Outer SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Background Track Circle */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-white/10"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Active Progress Ring */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className={`transition-all duration-1000 ease-linear ${
              mode === 'pomodoro'
                ? 'stroke-white/90'
                : 'stroke-teal-300/90'
            }`}
            strokeWidth="3"
            strokeDasharray="276.46"
            strokeDashoffset={276.46 - (276.46 * progress) / 100}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Central Display Content */}
        <div className="flex flex-col items-center justify-center text-center z-10 p-6">
          {/* Mode Pill Label */}
          <div
            className={`px-3 py-1 mb-2 rounded-full text-[11px] tracking-widest uppercase font-medium border transition-all duration-300 ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isRunning
                ? 'bg-white/15 text-white border-white/25 shadow-md'
                : 'bg-white/10 text-white/70 border-white/10'
            }`}
          >
            <span>{modeTitle}</span>
            {isPaused && <span className="ml-1.5 font-bold">• PAUSED</span>}
          </div>

          {/* Large Monospace Timer Display */}
          <div
            aria-label={`Timer: ${formattedTime}, ${modeTitle}`}
            className="font-timer text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white drop-shadow-2xl my-1 select-none"
          >
            {formattedTime}
          </div>

          {/* 4-Pomodoro Cycle Dots */}
          <div className="flex items-center space-x-2 mt-3">
            {[1, 2, 3, 4].map((step) => {
              const isDone =
                step < currentCycleIndex ||
                (step === 4 && completedPomodoros > 0 && completedPomodoros % 4 === 0);
              const isCurrent = step === currentCycleIndex && mode === 'pomodoro';

              return (
                <div
                  key={step}
                  title={`Session ${step} of 4`}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isCurrent
                      ? 'w-6 bg-white shadow-glow'
                      : isDone
                      ? 'w-2 bg-white/80'
                      : 'w-2 bg-white/20'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-white/50 mt-1 font-mono">
            Session {currentCycleIndex} of 4
          </span>
        </div>
      </div>

      {/* Active Task Floating Pill below Timer */}
      {activeTaskTitle && (
        <div className="mt-3 px-4 py-1.5 rounded-full glass-pill border border-white/20 flex items-center space-x-2 text-xs font-medium max-w-[280px] sm:max-w-sm md:max-w-md transition-all duration-300 animate-fadeIn">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <span className="text-white/50 uppercase tracking-widest text-[9px] font-mono shrink-0">
            FOCUSING ON:
          </span>
          <span className="text-white truncate font-semibold">{activeTaskTitle}</span>
        </div>
      )}
    </div>
  );
};
