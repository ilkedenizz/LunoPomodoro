import React, { useState, useMemo } from 'react';
import { X, TrendingUp, Sparkles, Award } from 'lucide-react';
import { PeriodSelector } from './PeriodSelector';
import type { PeriodType } from './PeriodSelector';
import { StatsOverview } from './StatsOverview';
import { FocusChart } from './FocusChart';
import { SessionHistory } from './SessionHistory';
import type { FocusSession, AppLanguage } from '../types';
import {
  getTotalFocusMinutes,
  getPomodoroCount,
  getCurrentStreak,
  getBestDay,
  getWeeklyStats,
  getMonthlyStats,
  getAllTimeStats,
  getGroupedRecentSessions,
} from '../utils/statistics';
import { formatDuration } from '../utils/dates';
import { getTranslations } from '../utils/translations';

interface FocusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: FocusSession[];
  language?: AppLanguage;
}

export const FocusHistoryModal: React.FC<FocusHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  sessions,
  language = 'en',
}) => {
  const [period, setPeriod] = useState<PeriodType>('week');
  const t = getTranslations(language);

  const totalMinutes = useMemo(() => getTotalFocusMinutes(sessions), [sessions]);
  const totalPomodoros = useMemo(() => getPomodoroCount(sessions), [sessions]);
  const currentStreak = useMemo(() => getCurrentStreak(sessions), [sessions]);
  const bestDay = useMemo(() => getBestDay(sessions, language), [sessions, language]);

  const weeklyStats = useMemo(() => getWeeklyStats(sessions, language), [sessions, language]);
  const monthlyStats = useMemo(() => getMonthlyStats(sessions), [sessions]);
  const allTimeStats = useMemo(() => getAllTimeStats(sessions), [sessions]);
  const groupedSessions = useMemo(() => getGroupedRecentSessions(sessions, language), [sessions, language]);

  if (!isOpen) return null;

  const hasHistory = totalPomodoros > 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal text-white shadow-2xl border border-white/15 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden cursor-default"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl glass-panel text-indigo-300 border border-white/15">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="history-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {t.historyTitle}
              </h2>
              <p className="text-xs text-white/60 font-medium">{t.historySubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {!hasHistory ? (
            /* Peaceful Empty State */
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-white/5 border border-white/10 text-indigo-300 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                {t.journeyStartsHere}
              </h3>
              <p className="text-xs text-white/60 max-w-sm">
                {t.journeyDesc}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all cursor-pointer"
              >
                {t.startFocusing}
              </button>
            </div>
          ) : (
            <>
              {/* Period Selector */}
              <div className="flex items-center justify-center">
                <PeriodSelector period={period} onChangePeriod={setPeriod} language={language} />
              </div>

              {/* Stats Summary Overview Cards */}
              <StatsOverview
                totalMinutes={totalMinutes}
                pomodoros={totalPomodoros}
                currentStreak={currentStreak}
                bestDay={bestDay}
                language={language}
              />

              {/* Weekly Bar Chart / Monthly Heatmap */}
              <FocusChart
                period={period}
                weeklyStats={weeklyStats}
                monthlyStats={monthlyStats}
                language={language}
              />

              {/* All Time Statistics */}
              <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
                <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                  <Award className="w-4 h-4 text-amber-300" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    {t.allTimeStats}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      {t.totalFocus}
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {formatDuration(allTimeStats.totalMinutes, language)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      {t.pomodorosSessions}
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {allTimeStats.totalPomodoros}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      {t.daysFocused}
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {allTimeStats.daysFocused}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      {t.avgPerFocusDay}
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {formatDuration(allTimeStats.avgMinutesPerFocusDay, language)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Grouped Session History */}
              <SessionHistory groupedSessions={groupedSessions} language={language} />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

FocusHistoryModal.displayName = 'FocusHistoryModal';
