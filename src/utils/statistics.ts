import type { FocusSession, AppLanguage, Task, DailyGoal } from '../types';
import { isToday, isYesterday, isSameDay, getStartOfWeek } from './dates';
import { formatDurationVerbose } from './translations';

export const getSessionMinutes = (s: FocusSession): number => {
  if (typeof s.actualDurationSeconds === 'number' && s.actualDurationSeconds > 0) {
    return Math.max(1, Math.round(s.actualDurationSeconds / 60));
  }
  return typeof s.durationMinutes === 'number' && s.durationMinutes > 0 ? s.durationMinutes : 0;
};

export const getPomodoroSessions = (sessions: FocusSession[]): FocusSession[] => {
  return sessions.filter((s) => s.mode === 'pomodoro');
};

export const getTotalFocusMinutes = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).reduce((acc, s) => acc + getSessionMinutes(s), 0);
};

export const formatTotalFocusTime = (totalMinutes: number, lang: AppLanguage = 'en'): string => {
  return formatDurationVerbose(totalMinutes, lang);
};

export const getPomodoroCount = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).filter((s) => s.completed !== false).length;
};

export const getCompletedPomodoroCount = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).filter((s) => s.completed !== false).length;
};

export const getPartialPomodoroCount = (sessions: FocusSession[]): number => {
  return getPomodoroSessions(sessions).filter((s) => s.completed === false).length;
};

export const getCompletedTasksCount = (tasks?: Task[]): number => {
  if (!tasks || !Array.isArray(tasks)) return 0;
  return tasks.filter((t) => t.completed && !t.deletedAt).length;
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

export const getBestDay = (sessions: FocusSession[], lang: AppLanguage = 'en'): BestDayResult | null => {
  const poms = getPomodoroSessions(sessions);
  if (poms.length === 0) return null;

  const dayMap = new Map<string, { fullDate: Date; minutes: number; pomodoros: number }>();

  poms.forEach((s) => {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = dayMap.get(key) || { fullDate: d, minutes: 0, pomodoros: 0 };
    dayMap.set(key, {
      fullDate: d,
      minutes: existing.minutes + getSessionMinutes(s),
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

  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const dayName = best.fullDate.toLocaleDateString(locale, { weekday: 'long' });
  const dateLabel = best.fullDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

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

export const getWeeklyStats = (sessions: FocusSession[], lang: AppLanguage = 'en'): DayWeeklyStat[] => {
  const poms = getPomodoroSessions(sessions);
  const startOfWeek = getStartOfWeek();
  const days: DayWeeklyStat[] = [];
  const dayLabels = lang === 'tr'
    ? ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CTS', 'PAZ']
    : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);

    const daySessions = poms.filter((s) => isSameDay(s.timestamp, d.getTime()));
    const minutes = daySessions.reduce((acc, s) => acc + getSessionMinutes(s), 0);

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
    const minutes = daySessions.reduce((acc, s) => acc + getSessionMinutes(s), 0);

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
  const totalMinutes = poms.reduce((acc, s) => acc + getSessionMinutes(s), 0);
  const uniqueDates = getUniqueFocusDates(sessions);
  const daysFocused = uniqueDates.length;
  const avgMinutesPerFocusDay = daysFocused > 0 ? Math.round(totalMinutes / daysFocused) : 0;

  return {
    totalMinutes,
    totalPomodoros: poms.filter((s) => s.completed !== false).length,
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
      const totalMinutes = val.sessions.reduce((acc, s) => acc + getSessionMinutes(s), 0);
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

export interface TodayHourlyStat {
  hour: number; // 0..23
  hourLabel: string; // e.g. "00:00", "09:00", "14:00"
  minutes: number;
  pomodoros: number;
  completedPomodoros: number;
  partialPomodoros: number;
  sessions: FocusSession[];
  isCurrentHour: boolean;
}

export const getTodayHourlyStats = (sessions: FocusSession[]): TodayHourlyStat[] => {
  const poms = getPomodoroSessions(sessions);
  const todaySessions = poms.filter((s) => isToday(s.timestamp));
  const currentHour = new Date().getHours();

  const hourlyMap = new Map<number, FocusSession[]>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, []);
  }

  todaySessions.forEach((s) => {
    const h = new Date(s.timestamp).getHours();
    if (hourlyMap.has(h)) {
      hourlyMap.get(h)!.push(s);
    }
  });

  const result: TodayHourlyStat[] = [];
  for (let h = 0; h < 24; h++) {
    const hourSessions = hourlyMap.get(h) || [];
    const minutes = hourSessions.reduce((acc, s) => acc + getSessionMinutes(s), 0);
    const completedPomodoros = hourSessions.filter((s) => s.completed !== false).length;
    const partialPomodoros = hourSessions.filter((s) => s.completed === false).length;

    result.push({
      hour: h,
      hourLabel: `${h.toString().padStart(2, '0')}:00`,
      minutes,
      pomodoros: hourSessions.length,
      completedPomodoros,
      partialPomodoros,
      sessions: hourSessions,
      isCurrentHour: h === currentHour,
    });
  }

  return result;
};

export interface TodaySummary {
  totalMinutes: number;
  totalPomodoros: number;
  completedPomodoros: number;
  partialPomodoros: number;
  targetMinutes: number;
  targetPomodoros: number;
  goalProgressPercent: number;
}

export const getTodaySummary = (sessions: FocusSession[], dailyGoal?: DailyGoal): TodaySummary => {
  const poms = getPomodoroSessions(sessions);
  const todaySessions = poms.filter((s) => isToday(s.timestamp));

  const totalMinutes = todaySessions.reduce((acc, s) => acc + getSessionMinutes(s), 0);
  const completedPomodoros = todaySessions.filter((s) => s.completed !== false).length;
  const partialPomodoros = todaySessions.filter((s) => s.completed === false).length;
  const totalPomodoros = todaySessions.length;

  const targetPomodoros = dailyGoal?.targetPomodoros || 4;
  const targetMinutes = dailyGoal?.targetMinutes || targetPomodoros * 25;

  const goalProgressPercent = Math.min(
    100,
    Math.round((completedPomodoros / Math.max(1, targetPomodoros)) * 100)
  );

  return {
    totalMinutes,
    totalPomodoros,
    completedPomodoros,
    partialPomodoros,
    targetMinutes,
    targetPomodoros,
    goalProgressPercent,
  };
};

