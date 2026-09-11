import React from 'react';
import type { AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

export type PeriodType = 'today' | 'week' | 'month';

interface PeriodSelectorProps {
  period: PeriodType;
  onChangePeriod: (p: PeriodType) => void;
  language?: AppLanguage;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ period, onChangePeriod, language = 'en' }) => {
  const t = getTranslations(language);

  const options: { id: PeriodType; label: string }[] = [
    { id: 'today', label: t.periodToday },
    { id: 'week', label: t.periodWeek },
    { id: 'month', label: t.periodMonth },
  ];

  return (
    <nav
      aria-label="Statistics Period Selector"
      className="inline-flex p-1 rounded-2xl glass-panel border border-white/10"
    >
      <div className="flex space-x-1">
        {options.map((opt) => {
          const isActive = period === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChangePeriod(opt.id)}
              aria-pressed={isActive}
              className={`px-3.5 sm:px-5 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer ${
                isActive
                  ? 'bg-white/20 text-white shadow-md border border-white/20 font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
 
