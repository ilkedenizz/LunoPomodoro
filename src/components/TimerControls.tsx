import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Coffee, Sparkles } from 'lucide-react';
import type { TimerState, AppTheme, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

interface TimerControlsProps {
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  onStartBreak?: () => void;
  onContinueFocus?: () => void;
  breakType?: 'shortBreak' | 'longBreak';
  theme?: AppTheme;
  language?: AppLanguage;
}

export const TimerControls: React.FC<TimerControlsProps> = React.memo(({
  timerState,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onStartBreak,
  onContinueFocus,
  breakType = 'shortBreak',
  theme = 'dark',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isCompleted = timerState === 'completed';
  const isLight = theme === 'light';

  const breakLabel =
    breakType === 'longBreak'
      ? language === 'tr'
        ? 'Uzun Molayı Başlat'
        : 'Start Long Break'
      : t.startBreak;

  if (isCompleted) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 z-20 my-2 animate-in fade-in zoom-in-95 duration-200">
        {/* Reset Button */}
        <button
          onClick={onReset}
          aria-label={t.reset}
          className={`min-w-[48px] min-h-[48px] p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
              : 'text-white/70 hover:text-white focus-visible:ring-white/60'
          }`}
          title={`${t.reset} (R)`}
        >
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Start Break Button */}
        {onStartBreak && (
          <button
            onClick={onStartBreak}
            aria-label={breakLabel}
            className={`min-h-[48px] px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base border shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center space-x-2 focus:outline-none focus-visible:ring-2 cursor-pointer ${
              isLight
                ? 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100/80 focus-visible:ring-teal-400'
                : 'bg-teal-500/20 border-teal-500/40 text-teal-200 hover:bg-teal-500/30 focus-visible:ring-teal-400'
            }`}
          >
            <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0" />
            <span>{breakLabel}</span>
          </button>
        )}

        {/* Continue Focus Button */}
        {onContinueFocus && (
          <button
            onClick={onContinueFocus}
            aria-label={t.continueFocus}
            className={`min-h-[48px] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center space-x-2.5 focus:outline-none focus-visible:ring-4 cursor-pointer ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400'
                : 'bg-white text-black hover:bg-white/90 focus-visible:ring-white/60'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-400" />
            <span>{t.continueFocus}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-4 sm:space-x-6 z-20 my-2">
      {/* Reset Button */}
      <button
        onClick={onReset}
        aria-label={t.reset}
        className={`min-w-[48px] min-h-[48px] p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 ${
          isLight
            ? 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
            : 'text-white/70 hover:text-white focus-visible:ring-white/60'
        }`}
        title={`${t.reset} (R)`}
      >
        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Main Primary Action Button: START / PAUSE / RESUME */}
      {!isRunning ? (
        <button
          onClick={isPaused ? onResume : onStart}
          aria-label={isPaused ? t.resume : t.start}
          className={`min-h-[48px] px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 cursor-pointer ${
            isLight
              ? 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400'
              : 'bg-white text-black hover:bg-white/90 focus-visible:ring-white/60'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="uppercase">{isPaused ? t.resume : t.start}</span>
        </button>
      ) : (
        <button
          onClick={onPause}
          aria-label={t.pause}
          className={`min-h-[48px] px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg border shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center space-x-3 focus:outline-none focus-visible:ring-4 cursor-pointer ${
            isLight
              ? 'bg-slate-900/10 backdrop-blur-md text-slate-900 border-slate-900/25 hover:bg-slate-900/20 focus-visible:ring-slate-400'
              : 'bg-white/20 backdrop-blur-md text-white border-white/40 hover:bg-white/30 focus-visible:ring-white/60'
          }`}
        >
          <Pause className="w-5 h-5 fill-current" />
          <span className="uppercase">{t.pause}</span>
        </button>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        aria-label={t.skip}
        className={`min-w-[48px] min-h-[48px] p-3.5 sm:p-4 rounded-2xl glass-panel glass-panel-hover transition-all transform active:scale-95 focus:outline-none focus-visible:ring-2 ${
          isLight
            ? 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
            : 'text-white/70 hover:text-white focus-visible:ring-white/60'
        }`}
        title={`${t.skip} (S)`}
      >
        <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
});

TimerControls.displayName = 'TimerControls';
