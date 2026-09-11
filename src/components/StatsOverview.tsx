import React from 'react';
import { Clock, Flame, Trophy, Calendar } from 'lucide-react';
import { formatDuration } from '../utils/dates';
import type { BestDayResult } from '../utils/statistics';
import type { AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

const DAY_NAMES_TR: Record<string, string> = {
  Monday: 'Pazartesi',
  Tuesday: 'Salı',
  Wednesday: 'Çarşamba',
  Thursday: 'Perşembe',
  Friday: 'Cuma',
  Saturday: 'Cumartesi',
  Sunday: 'Pazar',
};

interface StatsOverviewProps {
  totalMinutes: number;
  pomodoros: number;
  currentStreak: number;
  bestDay: BestDayResult | null;
  language?: AppLanguage;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  pomodoros,
  currentStreak,
  bestDay,
  language = 'en',
}) => {
  const t = getTranslations(language);

  const bestDayDisplay = bestDay
    ? (language === 'tr' ? (DAY_NAMES_TR[bestDay.dayName] || bestDay.dayName) : bestDay.dayName)
    : t.noneYet;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {/* 1. Total Focus Time */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Clock className="w-4 h-4 text-indigo-300" />
          <span className="text-xs font-medium uppercase tracking-wider">{t.totalFocus}</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">
            {formatDuration(totalMinutes)}
          </div>
          <span className="text-[10px] text-white/50">{t.focusedTime}</span>
        </div>
      </div>

      {/* 2. Completed Pomodoros */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-medium uppercase tracking-wider">{t.pomodorosSessions}</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">{pomodoros}</div>
          <span className="text-[10px] text-white/50">{t.sessionsCompleted}</span>
        </div>
      </div>

      {/* 3. Current Streak */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-medium uppercase tracking-wider">{t.activeStreak}</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">
            {currentStreak} <span className="text-xs font-normal text-white/70">{t.days}</span>
          </div>
          <span className="text-[10px] text-white/50">{t.consecutiveFocus}</span>
        </div>
      </div>

      {/* 4. Best Day */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Calendar className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-medium uppercase tracking-wider">{t.bestDay}</span>
        </div>
        <div>
          <div className="font-sans text-base sm:text-lg font-bold text-white truncate">
            {bestDayDisplay}
          </div>
          <span className="text-[10px] text-white/50">
            {bestDay ? `${formatDuration(bestDay.minutes)} ${t.todayFocused}` : t.noSessionsYet}
          </span>
        </div>
      </div>
    </div>
  );
};
 
