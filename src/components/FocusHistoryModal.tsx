import React, { useState } from 'react';
import { X, TrendingUp, Sparkles, Award } from 'lucide-react';
import { PeriodSelector } from './PeriodSelector';
import type { PeriodType } from './PeriodSelector';
import { StatsOverview } from './StatsOverview';
import { FocusChart } from './FocusChart';
import { SessionHistory } from './SessionHistory';
import type { FocusSession } from '../types';
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

interface FocusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: FocusSession[];
}

export const FocusHistoryModal: React.FC<FocusHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
}) => {
  const [period, setPeriod] = useState<PeriodType>('week');

  if (!isOpen) return null;

  const totalMinutes = getTotalFocusMinutes(sessions);
  const totalPomodoros = getPomodoroCount(sessions);
  const currentStreak = getCurrentStreak(sessions);
  const bestDay = getBestDay(sessions);

  const weeklyStats = getWeeklyStats(sessions);
  const monthlyStats = getMonthlyStats(sessions);
  const allTimeStats = getAllTimeStats(sessions);
  const groupedSessions = getGroupedRecentSessions(sessions);

  const hasHistory = totalPomodoros > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md">
      <div
        className="relative w-full max-w-4xl p-5 sm:p-8 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl glass-panel text-indigo-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="history-title" className="text-xl font-bold text-white tracking-tight">
                Focus History
              </h2>
              <p className="text-xs text-white/60 font-medium">Your focus, over time.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Focus History"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          {!hasHistory ? (
            /* Peaceful Empty State */
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-white/5 border border-white/10 text-indigo-300 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Your Focus Journey Starts Here
              </h3>
              <p className="text-xs text-white/60 max-w-sm">
                Complete your first Pomodoro session to start building your statistics and streak history.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all"
              >
                Start Focusing
              </button>
            </div>
          ) : (
            <>
              {/* Period Selector */}
              <div className="flex items-center justify-center">
                <PeriodSelector period={period} onChangePeriod={setPeriod} />
              </div>

              {/* Stats Summary Overview Cards */}
              <StatsOverview
                totalMinutes={totalMinutes}
                pomodoros={totalPomodoros}
                currentStreak={currentStreak}
                bestDay={bestDay}
              />

              {/* Weekly Bar Chart / Monthly Heatmap */}
              <FocusChart
                period={period}
                weeklyStats={weeklyStats}
                monthlyStats={monthlyStats}
              />

              {/* All Time Statistics */}
              <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
                <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                  <Award className="w-4 h-4 text-amber-300" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    All-Time Stats
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      Total Focus
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {formatDuration(allTimeStats.totalMinutes)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      Pomodoros
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {allTimeStats.totalPomodoros}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      Days Focused
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {allTimeStats.daysFocused}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block mb-1">
                      Avg / Focus Day
                    </span>
                    <span className="font-timer text-lg font-bold text-white">
                      {allTimeStats.avgMinutesPerFocusDay}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Grouped Session History */}
              <SessionHistory groupedSessions={groupedSessions} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

