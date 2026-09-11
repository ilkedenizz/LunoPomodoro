import React, { useState } from 'react';
import type { DayWeeklyStat, DayMonthlyStat } from '../utils/statistics';
import type { PeriodType } from './PeriodSelector';
import type { AppLanguage } from '../types';
import { formatDuration } from '../utils/dates';
import { getTranslations } from '../utils/translations';

interface FocusChartProps {
  period: PeriodType;
  weeklyStats: DayWeeklyStat[];
  monthlyStats: DayMonthlyStat[];
  language?: AppLanguage;
}

export const FocusChart: React.FC<FocusChartProps> = ({
  period,
  weeklyStats,
  monthlyStats,
  language = 'en',
}) => {
  const [hoveredWeekItem, setHoveredWeekItem] = useState<DayWeeklyStat | null>(null);
  const [hoveredMonthItem, setHoveredMonthItem] = useState<DayMonthlyStat | null>(null);
  const t = getTranslations(language);
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  if (period === 'today') {
    return null; // Handled separately in Today view
  }

  if (period === 'week') {
    const maxMinutes = Math.max(1, ...weeklyStats.map((d) => d.minutes));

    return (
      <div className="w-full p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 flex flex-col">
        {/* Graph Title & Tooltip Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
            {t.weeklyActivity}
          </h3>
          <div className="h-5 text-xs text-indigo-200 font-medium">
            {hoveredWeekItem ? (
              <span>
                {hoveredWeekItem.fullDate.toLocaleDateString(locale, { weekday: 'long' })}: {' '}
                <strong className="text-white">{hoveredWeekItem.pomodoros} {t.pomodoro}</strong> ({formatDuration(hoveredWeekItem.minutes)})
              </span>
            ) : (
              <span className="text-white/40">{t.hoverForDetailsWeek}</span>
            )}
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2 px-2 border-b border-white/10">
          {weeklyStats.map((item) => {
            const heightPercent = Math.max(8, Math.round((item.minutes / maxMinutes) * 100));
            const dayLabel = item.fullDate.toLocaleDateString(locale, { weekday: 'short' });

            return (
              <div
                key={item.dayName}
                onMouseEnter={() => setHoveredWeekItem(item)}
                onMouseLeave={() => setHoveredWeekItem(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                tabIndex={0}
                aria-label={`${dayLabel}: ${item.pomodoros} pomodoros, ${formatDuration(item.minutes)} focused`}
              >
                {/* Bar Element */}
                <div className="w-full max-w-[36px] flex flex-col items-center justify-end h-full relative">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-500 ease-out ${
                      item.isToday
                        ? 'bg-gradient-to-t from-indigo-500 to-white shadow-glow'
                        : item.minutes > 0
                        ? 'bg-white/70 group-hover:bg-white'
                        : 'bg-white/10'
                    }`}
                    style={{ height: item.minutes > 0 ? `${heightPercent}%` : '6px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Days X-Axis Labels */}
        <div className="flex justify-between px-2 pt-2 text-[11px] font-mono text-white/50">
          {weeklyStats.map((item) => {
            const dayLabel = item.fullDate.toLocaleDateString(locale, { weekday: 'short' });
            return (
              <span
                key={item.dayName}
                className={`flex-1 text-center font-medium capitalize ${
                  item.isToday ? 'text-white font-bold' : ''
                }`}
              >
                {dayLabel}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Monthly Overview Heatmap
  return (
    <div className="w-full p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {t.monthlyDistribution}
        </h3>
        <div className="h-5 text-xs text-indigo-200 font-medium">
          {hoveredMonthItem ? (
            <span>
              {hoveredMonthItem.fullDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}: {' '}
              <strong className="text-white">{hoveredMonthItem.pomodoros} {t.pomodoro}</strong> ({formatDuration(hoveredMonthItem.minutes)})
            </span>
          ) : (
            <span className="text-white/40">{t.hoverForDetailsMonth}</span>
          )}
        </div>
      </div>

      {/* Heatmap Days Grid */}
      <div className="grid grid-cols-7 gap-2 py-2">
        {monthlyStats.map((item) => {
          let bgClass = 'bg-white/5 border-white/5 text-white/40';
          if (item.intensity === 1) bgClass = 'bg-indigo-500/25 border-indigo-400/30 text-white/80';
          else if (item.intensity === 2) bgClass = 'bg-indigo-500/60 border-indigo-300/50 text-white font-semibold';
          else if (item.intensity === 3) bgClass = 'bg-white text-black font-bold shadow-glow';

          return (
            <button
              key={item.dateNumber}
              onMouseEnter={() => setHoveredMonthItem(item)}
              onMouseLeave={() => setHoveredMonthItem(null)}
              className={`aspect-square rounded-xl flex items-center justify-center text-xs transition-all border hover:scale-110 focus:outline-none ${bgClass}`}
              aria-label={`Day ${item.dateNumber}: ${item.pomodoros} pomodoros, ${formatDuration(item.minutes)}`}
            >
              {item.dateNumber}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10 text-[10px] text-white/50">
        <span>{t.less}</span>
        <span className="w-2.5 h-2.5 rounded bg-white/5 border border-white/10" />
        <span className="w-2.5 h-2.5 rounded bg-indigo-500/30" />
        <span className="w-2.5 h-2.5 rounded bg-indigo-500/70" />
        <span className="w-2.5 h-2.5 rounded bg-white" />
        <span>{t.more}</span>
      </div>
    </div>
  );
};
 
