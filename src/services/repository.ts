import type {
  TimerSettings,
  Task,
  FocusSession,
  DailyGoal,
  SoundMixerState,
  AtmospherePreset,
} from '../types';
import * as storage from '../utils/storage';
import {
  SyncEngine,
  markSettingsPending,
  markDailyGoalPending,
  markSessionPending,
  markTaskPending,
} from './syncEngine';
import { getCurrentUser } from './auth';

export const repository = {
  // Settings
  getSettings: (): TimerSettings => storage.loadSettings(),
  saveSettings: async (settings: TimerSettings): Promise<void> => {
    storage.saveSettings(settings);
    const user = await getCurrentUser();
    if (user) {
      markSettingsPending();
      SyncEngine.pushSettings(settings, storage.loadFavoriteAtmospheres(), user.id);
    }
  },

  // Tasks
  getTasks: (): Task[] => storage.loadTasks(),
  saveTasks: async (tasks: Task[]): Promise<void> => {
    storage.saveTasks(tasks);
    const user = await getCurrentUser();
    if (user) {
      for (const t of tasks) {
        markTaskPending(t.id);
        SyncEngine.pushTask(t, user.id);
      }
    }
  },
  saveSingleTask: async (task: Task): Promise<void> => {
    const currentTasks = storage.loadTasks();
    const idx = currentTasks.findIndex((t) => t.id === task.id);
    let updatedTasks: Task[];
    if (idx >= 0) {
      updatedTasks = currentTasks.map((t) => (t.id === task.id ? task : t));
    } else {
      updatedTasks = [task, ...currentTasks];
    }
    storage.saveTasks(updatedTasks);
    const user = await getCurrentUser();
    if (user) {
      markTaskPending(task.id);
      SyncEngine.pushTask(task, user.id);
    }
  },
  deleteTask: async (taskId: string): Promise<void> => {
    const currentTasks = storage.loadTasks();
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    storage.saveTasks(updatedTasks);
    const user = await getCurrentUser();
    if (user) {
      SyncEngine.pushDeletedTask(taskId, user.id);
    }
  },

  // Sessions
  getSessions: (): FocusSession[] => storage.loadSessions(),
  saveSession: async (session: FocusSession): Promise<FocusSession[]> => {
    const updated = storage.saveSession(session);
    const user = await getCurrentUser();
    if (user) {
      markSessionPending(session.id);
      SyncEngine.pushSession(session, user.id);
    }
    return updated;
  },

  // Daily Goal
  getDailyGoal: (): DailyGoal => storage.loadDailyGoal(),
  saveDailyGoal: async (goal: DailyGoal): Promise<void> => {
    storage.saveDailyGoal(goal);
    const user = await getCurrentUser();
    if (user) {
      markDailyGoalPending();
      SyncEngine.pushDailyGoal(goal, user.id);
    }
  },

  // Presets & Favorites
  getPresets: (): AtmospherePreset[] => storage.loadAtmospherePresets(),
  savePresets: async (presets: AtmospherePreset[]): Promise<void> => {
    storage.saveAtmospherePresets(presets);
    const user = await getCurrentUser();
    if (user) {
      for (const p of presets) {
        SyncEngine.pushPreset(p, user.id);
      }
    }
  },
  saveSinglePreset: async (preset: AtmospherePreset): Promise<void> => {
    const current = storage.loadAtmospherePresets();
    const updated = [preset, ...current.filter((p) => p.id !== preset.id)];
    storage.saveAtmospherePresets(updated);
    const user = await getCurrentUser();
    if (user) {
      SyncEngine.pushPreset(preset, user.id);
    }
  },
  deletePreset: async (presetId: string): Promise<void> => {
    const current = storage.loadAtmospherePresets();
    const updated = current.filter((p) => p.id !== presetId);
    storage.saveAtmospherePresets(updated);
    const user = await getCurrentUser();
    if (user) {
      SyncEngine.pushDeletedPreset(presetId, user.id);
    }
  },

  getFavorites: (): string[] => storage.loadFavoriteAtmospheres(),
  saveFavorites: async (favs: string[]): Promise<void> => {
    storage.saveFavoriteAtmospheres(favs);
    const user = await getCurrentUser();
    if (user) {
      markSettingsPending();
      SyncEngine.pushSettings(storage.loadSettings(), favs, user.id);
    }
  },

  getSoundMixer: (): SoundMixerState => storage.loadSoundMixerState(),
  saveSoundMixer: (state: SoundMixerState): void => storage.saveSoundMixerState(state),
};
