import type { TimerSettings, FocusSession } from '../types';

const SETTINGS_KEY = 'pomodoro_settings_v1';
const SESSIONS_KEY = 'pomodoro_sessions_v1';
const BACKGROUND_KEY = 'pomodoro_background_v1';

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
