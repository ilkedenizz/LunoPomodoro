import React from 'react';
import { Clock, Flame, Trophy, Calendar } from 'lucide-react';
import { formatDuration } from '../utils/dates';
import type { BestDayResult } from '../utils/statistics';

interface StatsOverviewProps {
  totalMinutes: number;
  pomodoros: number;
  currentStreak: number;
  bestDay: BestDayResult | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  pomodoros,
  currentStreak,
  bestDay,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {/* 1. Total Focus Time */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Clock className="w-4 h-4 text-indigo-300" />
          <span className="text-xs font-medium uppercase tracking-wider">Total Focus</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">
            {formatDuration(totalMinutes)}
          </div>
          <span className="text-[10px] text-white/50">focused time</span>
        </div>
      </div>

      {/* 2. Completed Pomodoros */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-medium uppercase tracking-wider">Pomodoros</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">{pomodoros}</div>
          <span className="text-[10px] text-white/50">sessions completed</span>
        </div>
      </div>

      {/* 3. Current Streak */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-medium uppercase tracking-wider">Current Streak</span>
        </div>
        <div>
          <div className="font-timer text-xl sm:text-2xl font-bold text-white">
            {currentStreak} <span className="text-xs font-normal text-white/70">days</span>
          </div>
          <span className="text-[10px] text-white/50">consecutive focus</span>
        </div>
      </div>

      {/* 4. Best Day */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between">
        <div className="flex items-center space-x-2 text-white/60 mb-2">
          <Calendar className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-medium uppercase tracking-wider">Best Day</span>
        </div>
        <div>
          <div className="font-sans text-base sm:text-lg font-bold text-white truncate">
            {bestDay ? bestDay.dayName : 'None yet'}
          </div>
          <span className="text-[10px] text-white/50">
            {bestDay ? `${formatDuration(bestDay.minutes)} focused` : 'no sessions yet'}
          </span>
        </div>
      </div>
    </div>
  );
};
 
