import type { FocusSession, AppLanguage } from '../types';
import { isToday, isYesterday, isSameDay, getStartOfWeek } from './dates';

export const getPomodoroSessions = (sessions: FocusSession[]): FocusSession[] => {
  return sessions.filter((s) => s.mode === 'pomodoro');
};

export const getTotalFocusMinutes = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).reduce((acc, s) => acc + s.durationMinutes, 0);
};

export const formatTotalFocusTime = (totalMinutes: number, lang: 'en' | 'tr' = 'en'): string => {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (lang === 'tr') {
    if (hrs === 0) return `${mins} dk`;
    if (mins === 0) return `${hrs} saat`;
    return `${hrs} saat ${mins} dk`;
  }
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export const getPomodoroCount = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).length;
};

// Returns unique YYYY-MM-DD date strings sorted ascending
const getUniqueFocusDates = (sessions: FocusSession[]): string[] => {
  const poms = getPomodoroSessions(sessions);
  const dateSet = new Set<string>();
  poms.forEach((s) => {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
      .getDate()
      .toString()
      .padStart(2, '0')}`;
    dateSet.add(key);
  });
  return Array.from(dateSet).sort();
};

export const getCurrentStreak = (sessions: FocusSession[]): number => {
  const poms = getPomodoroSessions(sessions);
  if (poms.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const hasToday = poms.some((s) => isToday(s.timestamp));
  const hasYesterday = poms.some((s) => isYesterday(s.timestamp));

  if (!hasToday && !hasYesterday) return 0;

  let checkDate = hasToday ? new Date(today) : new Date(yesterday);
  let streak = 0;

  while (true) {
    const found = poms.some((s) => isSameDay(s.timestamp, checkDate.getTime()));
    if (found) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export const getBestStreak = (sessions: FocusSession[]): number => {
  const dates = getUniqueFocusDates(sessions);
  if (dates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);

    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
};

export interface BestDayResult {
  dayName: string;
  dateLabel: string;
  minutes: number;
  pomodoros: number;
}

export const getBestDay = (sessions: FocusSession[]): BestDayResult | null => {
  const poms = getPomodoroSessions(sessions);
  if (poms.length === 0) return null;

  const dayMap = new Map<string, { fullDate: Date; minutes: number; pomodoros: number }>();

  poms.forEach((s) => {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = dayMap.get(key) || { fullDate: d, minutes: 0, pomodoros: 0 };
    dayMap.set(key, {
      fullDate: d,
      minutes: existing.minutes + s.durationMinutes,
      pomodoros: existing.pomodoros + 1,
    });
  });

  const dayEntries = Array.from(dayMap.values());
  if (dayEntries.length === 0) return null;

  let best = dayEntries[0];
  for (let i = 1; i < dayEntries.length; i++) {
    const val = dayEntries[i];
    if (val.minutes > best.minutes || (val.minutes === best.minutes && val.fullDate > best.fullDate)) {
      best = val;
    }
  }

  const dayName = best.fullDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = best.fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    dayName,
    dateLabel,
    minutes: best.minutes,
    pomodoros: best.pomodoros,
  };
};

export interface DayWeeklyStat {
  dayName: string;
  fullDate: Date;
  minutes: number;
  pomodoros: number;
  isToday: boolean;
}

export const getWeeklyStats = (sessions: FocusSession[]): DayWeeklyStat[] => {
  const poms = getPomodoroSessions(sessions);
  const startOfWeek = getStartOfWeek();
  const days: DayWeeklyStat[] = [];
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);

    const daySessions = poms.filter((s) => isSameDay(s.timestamp, d.getTime()));
    const minutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    days.push({
      dayName: dayLabels[i],
      fullDate: d,
      minutes,
      pomodoros: daySessions.length,
      isToday: isToday(d.getTime()),
    });
  }

  return days;
};

export interface DayMonthlyStat {
  dateNumber: number;
  fullDate: Date;
  minutes: number;
  pomodoros: number;
  intensity: 0 | 1 | 2 | 3;
}

export const getMonthlyStats = (sessions: FocusSession[]): DayMonthlyStat[] => {
  const poms = getPomodoroSessions(sessions);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const totalDays = new Date(year, month + 1, 0).getDate();
  const result: DayMonthlyStat[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const daySessions = poms.filter((s) => isSameDay(s.timestamp, d.getTime()));
    const minutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    let intensity: 0 | 1 | 2 | 3 = 0;
    if (minutes > 0 && minutes < 50) intensity = 1;
    else if (minutes >= 50 && minutes < 100) intensity = 2;
    else if (minutes >= 100) intensity = 3;

    result.push({
      dateNumber: day,
      fullDate: d,
      minutes,
      pomodoros: daySessions.length,
      intensity,
    });
  }

  return result;
};

export interface AllTimeStats {
  totalMinutes: number;
  totalPomodoros: number;
  daysFocused: number;
  avgMinutesPerFocusDay: number;
}

export const getAllTimeStats = (sessions: FocusSession[]): AllTimeStats => {
  const poms = getPomodoroSessions(sessions);
  const totalMinutes = poms.reduce((acc, s) => acc + s.durationMinutes, 0);
  const uniqueDates = getUniqueFocusDates(sessions);
  const daysFocused = uniqueDates.length;
  const avgMinutesPerFocusDay = daysFocused > 0 ? Math.round(totalMinutes / daysFocused) : 0;

  return {
    totalMinutes,
    totalPomodoros: poms.length,
    daysFocused,
    avgMinutesPerFocusDay,
  };
};

export interface GroupedSessionHistory {
  dateKey: string; // e.g. YYYY-MM-DD
  dateLabel: string; // e.g. Today, Yesterday, Sep 7
  totalMinutes: number;
  pomodoros: number;
  sessions: FocusSession[];
}

export const getGroupedRecentSessions = (sessions: FocusSession[], lang: AppLanguage = 'en'): GroupedSessionHistory[] => {
  const poms = getPomodoroSessions(sessions);
  if (poms.length === 0) return [];

  const map = new Map<string, { dateLabel: string; timestamp: number; sessions: FocusSession[] }>();

  poms.forEach((s) => {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
      .getDate()
      .toString()
      .padStart(2, '0')}`;

    if (!map.has(key)) {
      let label = lang === 'tr' ? 'Bugün' : 'Today';
      if (isToday(s.timestamp)) label = lang === 'tr' ? 'Bugün' : 'Today';
      else if (isYesterday(s.timestamp)) label = lang === 'tr' ? 'Dün' : 'Yesterday';
      else label = d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' });

      map.set(key, { dateLabel: label, timestamp: s.timestamp, sessions: [] });
    }

    map.get(key)!.sessions.push(s);
  });

  const sortedGroups = Array.from(map.entries())
    .map(([dateKey, val]) => {
      const totalMinutes = val.sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return {
        dateKey,
        dateLabel: val.dateLabel,
        totalMinutes,
        pomodoros: val.sessions.length,
        sessions: val.sessions.sort((a, b) => b.timestamp - a.timestamp),
        timestamp: val.timestamp,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return sortedGroups;
};

