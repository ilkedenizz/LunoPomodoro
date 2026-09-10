import type { TimerSettings, FocusSession, Task, DailyGoal, SoundMixerState, AtmospherePreset, AppTheme } from '../types';

const SETTINGS_KEY = 'pomodoro_settings_v1';
const SESSIONS_KEY = 'pomodoro_sessions_v1';
const BACKGROUND_KEY = 'pomodoro_background_v1';
const TASKS_KEY = 'luno_tasks_v1';
const DAILY_GOAL_KEY = 'luno_daily_goal_v1';
const ACTIVE_TASK_KEY = 'luno_active_task_id_v1';
const FAVORITES_KEY = 'luno_favorite_atmospheres_v1';
const SOUND_MIXER_KEY = 'luno_sound_mixer_v1';
const PRESETS_KEY = 'luno_atmosphere_presets_v1';

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
  theme: 'dark',
  timerColor: 'default',
};

export const DEFAULT_DAILY_GOAL: DailyGoal = {
  targetPomodoros: 4,
  targetMinutes: 100,
};

export const DEFAULT_SOUND_MIXER: SoundMixerState = {
  masterVolume: 0.8,
  tracks: {
    rain: { volume: 0, muted: false },
    cafe: { volume: 0, muted: false },
    fire: { volume: 0, muted: false },
    waves: { volume: 0, muted: false },
    lofi: { volume: 0, muted: false },
  },
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

const BACKGROUND_DARK_KEY = 'luno_background_dark_v1';
const BACKGROUND_LIGHT_KEY = 'luno_background_light_v1';

export const loadSavedBackground = (theme: AppTheme = 'dark'): string => {
  try {
    if (theme === 'light') {
      return localStorage.getItem(BACKGROUND_LIGHT_KEY) || 'soft-ivory';
    }
    return localStorage.getItem(BACKGROUND_DARK_KEY) || localStorage.getItem(BACKGROUND_KEY) || 'tokyo';
  } catch {
    return theme === 'light' ? 'soft-ivory' : 'tokyo';
  }
};

export const saveBackground = (id: string, theme: AppTheme = 'dark'): void => {
  try {
    if (theme === 'light') {
      localStorage.setItem(BACKGROUND_LIGHT_KEY, id);
    } else {
      localStorage.setItem(BACKGROUND_DARK_KEY, id);
      localStorage.setItem(BACKGROUND_KEY, id);
    }
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

// Phase 4 Storage Extensions
export const loadFavoriteAtmospheres = (): string[] => {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    if (!data) return ['tokyo', 'rain'];
    return JSON.parse(data);
  } catch {
    return ['tokyo', 'rain'];
  }
};

export const saveFavoriteAtmospheres = (ids: string[]): void => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save favorite atmospheres', err);
  }
};

export const loadSoundMixerState = (): SoundMixerState => {
  try {
    const data = localStorage.getItem(SOUND_MIXER_KEY);
    if (!data) return DEFAULT_SOUND_MIXER;
    return { ...DEFAULT_SOUND_MIXER, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SOUND_MIXER;
  }
};

export const saveSoundMixerState = (state: SoundMixerState): void => {
  try {
    localStorage.setItem(SOUND_MIXER_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save sound mixer state', err);
  }
};

export const loadAtmospherePresets = (): AtmospherePreset[] => {
  try {
    const data = localStorage.getItem(PRESETS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveAtmospherePresets = (presets: AtmospherePreset[]): void => {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save atmosphere presets', err);
  }
};


