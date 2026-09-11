import React from 'react';
import type { TimerMode, TimerState, AppTheme, TimerColorId, AppLanguage } from '../types';
import { getTimerColor } from '../utils/timerColors';
import { getTranslations } from '../utils/translations';

interface MainTimerDisplayProps {
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  mode: TimerMode;
  state: TimerState;
  completedPomodoros: number;
  activeTaskTitle?: string | null;
  theme?: AppTheme;
  timerColor?: TimerColorId;
  language?: AppLanguage;
}

export const MainTimerDisplay: React.FC<MainTimerDisplayProps> = React.memo(({
  timeLeftSeconds,
  totalDurationSeconds,
  mode,
  state,
  completedPomodoros,
  activeTaskTitle,
  theme = 'dark',
  timerColor = 'default',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const progress =
    totalDurationSeconds > 0
      ? ((totalDurationSeconds - timeLeftSeconds) / totalDurationSeconds) * 100
      : 0;

  const isRunning = state === 'running';
  const isPaused = state === 'paused';
  const isCompleted = state === 'completed';
  const isLight = theme === 'light';

  const colorDef = getTimerColor(timerColor);
  const activeColorHex = isCompleted
    ? isLight ? '#059669' : '#34d399'
    : isLight ? colorDef.lightHex : colorDef.darkHex;
  const activeStrokeHex = isCompleted
    ? isLight ? '#059669' : '#34d399'
    : isLight ? colorDef.lightStroke : colorDef.darkStroke;
  const activeGlowHex = isCompleted
    ? 'rgba(52, 211, 153, 0.45)'
    : isLight ? colorDef.lightGlow : colorDef.darkGlow;

  const cycleRemainder = completedPomodoros % 4;
  const completedInCycle = cycleRemainder === 0 && completedPomodoros > 0 ? 4 : cycleRemainder;
  const nextCycleIndex = cycleRemainder + 1;

  const modeTitle = isCompleted
    ? mode === 'pomodoro'
      ? t.sessionComplete
      : t.breakComplete
    : mode === 'pomodoro'
    ? t.focusSessionHeading
    : mode === 'shortBreak'
    ? t.shortBreakHeading
    : t.longBreakHeading;

  const effectiveProgress = isCompleted ? 100 : progress;

  return (
    <div
      role="timer"
      aria-label={`${modeTitle}: ${formattedTime}`}
      aria-live={isPaused || isCompleted ? 'polite' : 'off'}
      className="relative flex flex-col items-center justify-center my-2 sm:my-3 select-none w-full"
    >
      {/* Main Outer Timer Circle Container with Radial Glow */}
      <div className="relative flex items-center justify-center w-[260px] h-[260px] xs:w-72 xs:h-72 sm:w-80 sm:h-80 md:w-88 md:h-88 xl:w-96 xl:h-96">
        {/* Atmospheric Radial Light Glow behind Timer */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 pointer-events-none ${
            isCompleted
              ? 'timer-radial-glow opacity-90'
              : isRunning
              ? 'timer-radial-glow-running animate-pulse-soft'
              : isPaused
              ? 'timer-radial-glow opacity-60'
              : 'timer-radial-glow opacity-80'
          }`}
          style={{
            boxShadow: isRunning || isCompleted ? `0 0 80px ${activeGlowHex}` : undefined,
          }}
        />

        {/* Outer SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Background Track Circle */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className={isLight ? 'stroke-slate-900/10' : 'stroke-white/10'}
            strokeWidth="2.5"
            fill="none"
          />
          {/* Active Progress Ring */}
          <circle
            cx="50"
            cy="50"
            r="44"
            className="transition-all duration-1000 ease-linear"
            style={{
              stroke:
                isCompleted
                  ? isLight ? '#059669' : '#34d399'
                  : mode === 'pomodoro'
                  ? activeStrokeHex
                  : isLight
                  ? '#0d9488'
                  : '#5eead4',
            }}
            strokeWidth="3"
            strokeDasharray="276.46"
            strokeDashoffset={276.46 - (276.46 * effectiveProgress) / 100}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Central Display Content */}
        <div className="flex flex-col items-center justify-center text-center z-10 p-4 sm:p-6">
          {/* Mode Pill Label */}
          <div
            className={`px-3 py-1 mb-2 rounded-full text-[11px] tracking-widest uppercase font-medium border transition-all duration-300 ${
              isCompleted
                ? isLight
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm font-bold'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow font-bold'
                : isPaused
                ? isLight
                  ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isRunning
                ? isLight
                  ? 'bg-slate-900/10 text-slate-900 border-slate-900/20 shadow-sm'
                  : 'bg-white/15 text-white border-white/25 shadow-md'
                : isLight
                ? 'bg-slate-900/5 text-slate-600 border-slate-900/10'
                : 'bg-white/10 text-white/70 border-white/10'
            }`}
          >
            <span>{modeTitle}</span>
            {isPaused && <span className="ml-1.5 font-bold">• {language === 'tr' ? 'DURAKLATILDI' : 'PAUSED'}</span>}
            {isCompleted && <span className="ml-1.5 font-bold">• {language === 'tr' ? 'TAMAMLANDI' : 'DONE'}</span>}
          </div>

          {/* Large Monospace Timer Display */}
          <div
            className="font-timer text-5xl xs:text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight drop-shadow-2xl my-1 select-none transition-colors duration-300"
            style={{ color: activeColorHex }}
          >
            {formattedTime}
          </div>

          {/* 4-Pomodoro Cycle Dots */}
          <div
            className="flex items-center space-x-2 mt-3"
            aria-label={
              language === 'tr'
                ? `Döngü ilerlemesi: 4 oturumdan ${completedInCycle} tanesi tamamlandı`
                : `Cycle progress: ${completedInCycle} of 4 sessions completed`
            }
          >
            {[1, 2, 3, 4].map((step) => {
              const isDone = isCompleted && mode === 'pomodoro'
                ? step <= completedInCycle
                : step <= cycleRemainder;
              const isCurrent = !isCompleted && step === nextCycleIndex && mode === 'pomodoro';

              return (
                <div
                  key={step}
                  title={language === 'tr' ? `Oturum ${step} / 4` : `Session ${step} of 4`}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isCurrent
                      ? isLight
                        ? 'w-6 bg-slate-900 shadow-sm'
                        : 'w-6 bg-white shadow-glow'
                      : isDone
                      ? isLight
                        ? 'w-3.5 bg-emerald-600 shadow-sm'
                        : 'w-3.5 bg-emerald-400 shadow-glow'
                      : isLight
                      ? 'w-2 bg-slate-400/25'
                      : 'w-2 bg-white/20'
                  }`}
                />
              );
            })}
          </div>
          <span
            className={`text-[11px] mt-1 font-mono ${
              isLight ? 'text-slate-500' : 'text-white/50'
            }`}
          >
            {isCompleted && mode === 'pomodoro'
              ? language === 'tr'
                ? `${completedInCycle} / 4 Tamamlandı`
                : `${completedInCycle} of 4 Completed`
              : language === 'tr'
              ? `Oturum ${nextCycleIndex} / 4`
              : `Session ${nextCycleIndex} of 4`}
          </span>
        </div>
      </div>

      {/* Active Task Floating Pill below Timer */}
      {activeTaskTitle && (
        <div
          className={`mt-3 px-4 py-1.5 rounded-full glass-pill flex items-center space-x-2 text-xs font-medium max-w-[280px] sm:max-w-sm md:max-w-md transition-all duration-300 animate-fadeIn ${
            isLight
              ? 'border-slate-300/60 text-slate-800'
              : 'border-white/20 text-white'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${isLight ? 'bg-indigo-600' : 'bg-indigo-400'}`} />
          <span
            className={`uppercase tracking-widest text-[9px] font-mono shrink-0 ${
              isLight ? 'text-slate-500' : 'text-white/50'
            }`}
          >
            {language === 'tr' ? 'ODAKLANILAN GÖREV:' : 'FOCUSING ON:'}
          </span>
          <span className="truncate font-semibold">{activeTaskTitle}</span>
        </div>
      )}
    </div>
  );
});

MainTimerDisplay.displayName = 'MainTimerDisplay';
