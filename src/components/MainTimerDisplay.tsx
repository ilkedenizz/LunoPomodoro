import React from 'react';
import type { TimerMode, TimerState } from '../types';

interface MainTimerDisplayProps {
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  mode: TimerMode;
  state: TimerState;
  completedPomodoros: number;
}

export const MainTimerDisplay: React.FC<MainTimerDisplayProps> = ({
  timeLeftSeconds,
  totalDurationSeconds,
  mode,
  state,
  completedPomodoros,
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

  return (
    <div className="relative flex flex-col items-center justify-center my-6 md:my-10 select-none">
      {/* Outer SVG Smooth Progress Ring */}
      <div className="relative flex items-center justify-center w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96">
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Track Circle */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-white/10"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Active Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-white/80 transition-all duration-1000 ease-linear"
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
          <div className="px-3 py-1 mb-2 rounded-full bg-white/10 backdrop-blur-md text-xs tracking-widest text-white/80 uppercase font-medium border border-white/10">
            {modeTitle}
            {state === 'paused' && <span className="ml-1 text-amber-300">• PAUSED</span>}
          </div>

          {/* Large Legible Typography Timer */}
          <div className="font-timer text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white drop-shadow-2xl my-1">
            {formattedTime}
          </div>

          {/* 4-Pomodoro Cycle Dots */}
          <div className="flex items-center space-x-2 mt-3">
            {[1, 2, 3, 4].map((step) => {
              const isDone = step < currentCycleIndex || (step === 4 && completedPomodoros > 0 && completedPomodoros % 4 === 0);
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
          <span className="text-[11px] text-white/50 mt-1 font-medium">
            Session {currentCycleIndex} of 4
          </span>
        </div>
      </div>
    </div>
  );
};
