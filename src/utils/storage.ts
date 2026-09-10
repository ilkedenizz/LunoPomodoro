import type { TimerSettings, FocusSession, Task, DailyGoal } from '../types';

const SETTINGS_KEY = 'pomodoro_settings_v1';
const SESSIONS_KEY = 'pomodoro_sessions_v1';
const BACKGROUND_KEY = 'pomodoro_background_v1';
const TASKS_KEY = 'luno_tasks_v1';
const DAILY_GOAL_KEY = 'luno_daily_goal_v1';
const ACTIVE_TASK_KEY = 'luno_active_task_id_v1';

export const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  soundVolume: 0.8,
  notificationsEnabled: true,
  tickingEnabled: false,
};

export const DEFAULT_DAILY_GOAL: DailyGoal = {
  targetPomodoros: 4,
  targetMinutes: 100,
};

export const loadSettings = (): TimerSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (err) {
    console.error('Failed to load settings from storage', err);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: TimerSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to storage', err);
  }
};

export const loadSessions = (): FocusSession[] => {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load sessions', err);
    return [];
  }
};

export const saveSession = (session: FocusSession): FocusSession[] => {
  const current = loadSessions();
  const updated = [session, ...current];
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save session', err);
  }
  return updated;
};

export const loadSavedBackground = (): string => {
  try {
    return localStorage.getItem(BACKGROUND_KEY) || 'tokyo';
  } catch {
    return 'tokyo';
  }
};

export const saveBackground = (id: string): void => {
  try {
    localStorage.setItem(BACKGROUND_KEY, id);
  } catch (err) {
    console.error('Failed to save background choice', err);
  }
};

// Phase 2 Storage Extensions
export const loadTasks = (): Task[] => {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load tasks', err);
    return [];
  }
};

export const saveTasks = (tasks: Task[]): void => {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks', err);
  }
};

export const loadDailyGoal = (): DailyGoal => {
  try {
    const data = localStorage.getItem(DAILY_GOAL_KEY);
    if (!data) return DEFAULT_DAILY_GOAL;
    return { ...DEFAULT_DAILY_GOAL, ...JSON.parse(data) };
  } catch (err) {
    console.error('Failed to load daily goal', err);
    return DEFAULT_DAILY_GOAL;
  }
};

export const saveDailyGoal = (goal: DailyGoal): void => {
  try {
    localStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(goal));
  } catch (err) {
    console.error('Failed to save daily goal', err);
  }
};

export const loadActiveTaskId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_TASK_KEY);
  } catch {
    return null;
  }
};

export const saveActiveTaskId = (id: string | null): void => {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_TASK_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TASK_KEY);
    }
  } catch (err) {
    console.error('Failed to save active task ID', err);
  }
};

