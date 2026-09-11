import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type {
  Task,
  FocusSession,
  TimerSettings,
  DailyGoal,
  AtmospherePreset,
  SyncStatus,
  AppTheme,
  TimerColorId,
  TimerMode,
} from '../types';
import {
  loadSettings,
  saveSettings,
  loadTasks,
  saveTasks,
  loadSessions,
  loadDailyGoal,
  saveDailyGoal,
  loadAtmospherePresets,
  saveAtmospherePresets,
  loadFavoriteAtmospheres,
  saveFavoriteAtmospheres,
} from '../utils/storage';

const PENDING_QUEUE_KEY_V2 = 'luno_pending_sync_queue_v2';
const LAST_SYNCED_KEY_V2 = 'luno_last_synced_at_v2';

export const getLastSyncedAt = (): number | null => {
  try {
    const raw = localStorage.getItem(LAST_SYNCED_KEY_V2);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
};

export const setLastSyncedAt = (timestamp: number | null): void => {
  try {
    if (timestamp) {
      localStorage.setItem(LAST_SYNCED_KEY_V2, String(timestamp));
    } else {
      localStorage.removeItem(LAST_SYNCED_KEY_V2);
    }
  } catch {}
};

export interface PendingSyncQueueV2 {
  pendingTaskIds: string[];
  pendingDeletedTaskIds: string[];
  pendingSessionIds: string[];
  pendingSettings: boolean;
  pendingDailyGoal: boolean;
  pendingPresetIds: string[];
  pendingDeletedPresetIds: string[];
}

const defaultQueue: PendingSyncQueueV2 = {
  pendingTaskIds: [],
  pendingDeletedTaskIds: [],
  pendingSessionIds: [],
  pendingSettings: false,
  pendingDailyGoal: false,
  pendingPresetIds: [],
  pendingDeletedPresetIds: [],
};

export const getPendingSyncQueue = (): PendingSyncQueueV2 => {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY_V2);
    if (!raw) return { ...defaultQueue };
    const parsed = JSON.parse(raw);
    return {
      pendingTaskIds: Array.isArray(parsed.pendingTaskIds) ? parsed.pendingTaskIds : [],
      pendingDeletedTaskIds: Array.isArray(parsed.pendingDeletedTaskIds) ? parsed.pendingDeletedTaskIds : [],
      pendingSessionIds: Array.isArray(parsed.pendingSessionIds) ? parsed.pendingSessionIds : [],
      pendingSettings: Boolean(parsed.pendingSettings),
      pendingDailyGoal: Boolean(parsed.pendingDailyGoal),
      pendingPresetIds: Array.isArray(parsed.pendingPresetIds) ? parsed.pendingPresetIds : [],
      pendingDeletedPresetIds: Array.isArray(parsed.pendingDeletedPresetIds) ? parsed.pendingDeletedPresetIds : [],
    };
  } catch {
    return { ...defaultQueue };
  }
};

const savePendingQueue = (queue: PendingSyncQueueV2): void => {
  try {
    localStorage.setItem(PENDING_QUEUE_KEY_V2, JSON.stringify(queue));
  } catch {}
};

export const markTaskPending = (taskId: string): void => {
  const queue = getPendingSyncQueue();
  if (!queue.pendingTaskIds.includes(taskId)) {
    queue.pendingTaskIds.push(taskId);
    queue.pendingDeletedTaskIds = queue.pendingDeletedTaskIds.filter((id) => id !== taskId);
    savePendingQueue(queue);
  }
};

export const markTaskDeletedPending = (taskId: string): void => {
  const queue = getPendingSyncQueue();
  if (!queue.pendingDeletedTaskIds.includes(taskId)) {
    queue.pendingDeletedTaskIds.push(taskId);
    queue.pendingTaskIds = queue.pendingTaskIds.filter((id) => id !== taskId);
    savePendingQueue(queue);
  }
};

export const markSessionPending = (sessionId: string): void => {
  const queue = getPendingSyncQueue();
  if (!queue.pendingSessionIds.includes(sessionId)) {
    queue.pendingSessionIds.push(sessionId);
    savePendingQueue(queue);
  }
};

export const markSettingsPending = (): void => {
  const queue = getPendingSyncQueue();
  queue.pendingSettings = true;
  savePendingQueue(queue);
};

export const markDailyGoalPending = (): void => {
  const queue = getPendingSyncQueue();
  queue.pendingDailyGoal = true;
  savePendingQueue(queue);
};

export const markPresetPending = (presetId: string): void => {
  const queue = getPendingSyncQueue();
  if (!queue.pendingPresetIds.includes(presetId)) {
    queue.pendingPresetIds.push(presetId);
    queue.pendingDeletedPresetIds = queue.pendingDeletedPresetIds.filter((id) => id !== presetId);
    savePendingQueue(queue);
  }
};

export const markPresetDeletedPending = (presetId: string): void => {
  const queue = getPendingSyncQueue();
  if (!queue.pendingDeletedPresetIds.includes(presetId)) {
    queue.pendingDeletedPresetIds.push(presetId);
    queue.pendingPresetIds = queue.pendingPresetIds.filter((id) => id !== presetId);
    savePendingQueue(queue);
  }
};

export const clearPendingQueue = (): void => {
  try {
    localStorage.removeItem(PENDING_QUEUE_KEY_V2);
  } catch {}
};

// ==========================================
// Deterministic Merge Utilities
// ==========================================
export const mergeTasks = (localTasks: Task[], remoteTasks: Task[]): Task[] => {
  const map = new Map<string, Task>();

  localTasks.forEach((t) => {
    map.set(t.id, { ...t, updatedAt: t.updatedAt || t.createdAt });
  });

  remoteTasks.forEach((remote) => {
    const existing = map.get(remote.id);
    if (!existing) {
      map.set(remote.id, remote);
    } else {
      const existingUpdated = existing.updatedAt || existing.createdAt || 0;
      const remoteUpdated = remote.updatedAt || remote.createdAt || 0;

      if (remoteUpdated >= existingUpdated) {
        map.set(remote.id, {
          ...remote,
          pomodoros: Math.max(existing.pomodoros || 0, remote.pomodoros || 0),
        });
      } else {
        map.set(existing.id, {
          ...existing,
          pomodoros: Math.max(existing.pomodoros || 0, remote.pomodoros || 0),
        });
      }
    }
  });

  return Array.from(map.values())
    .filter((t) => !t.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const mergeSessions = (localSessions: FocusSession[], remoteSessions: FocusSession[]): FocusSession[] => {
  const map = new Map<string, FocusSession>();

  localSessions.forEach((s) => map.set(s.id || `${s.timestamp}_${s.durationMinutes}`, s));
  remoteSessions.forEach((s) => map.set(s.id || `${s.timestamp}_${s.durationMinutes}`, s));

  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
};

export const mergePresets = (local: AtmospherePreset[], remote: AtmospherePreset[]): AtmospherePreset[] => {
  const map = new Map<string, AtmospherePreset>();
  local.forEach((p) => map.set(p.id, p));
  remote.forEach((p) => map.set(p.id, p));
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

const sanitizeDuration = (val: unknown, fallback: number): number => {
  if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 180) {
    return Math.floor(val);
  }
  return fallback;
};

const sanitizeTheme = (val: unknown, fallback: AppTheme): AppTheme => {
  return val === 'light' || val === 'dark' ? val : fallback;
};

const sanitizeTimerColor = (val: unknown, fallback: TimerColorId): TimerColorId => {
  const validIds: TimerColorId[] = ['default', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
  return typeof val === 'string' && (validIds as string[]).includes(val) ? (val as TimerColorId) : fallback;
};

const sanitizeTimerMode = (val: unknown): TimerMode => {
  if (val === 'shortBreak' || val === 'longBreak') return val;
  return 'pomodoro';
};

// ==========================================
// SyncEngine Class
// ==========================================
export class SyncEngine {
  private static isSyncing = false;
  private static lastSyncedAt: number | null = getLastSyncedAt();
  private static listeners: ((status: SyncStatus) => void)[] = [];

  public static subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(status: SyncStatus): void {
    this.listeners.forEach((l) => l(status));
  }

  public static reset(): void {
    this.isSyncing = false;
    this.lastSyncedAt = null;
    setLastSyncedAt(null);
    clearPendingQueue();
    this.notify(this.getStatus());
  }

  public static getStatus(): SyncStatus {
    const queue = getPendingSyncQueue();
    const pendingCount =
      queue.pendingTaskIds.length +
      queue.pendingDeletedTaskIds.length +
      queue.pendingSessionIds.length +
      (queue.pendingSettings ? 1 : 0) +
      (queue.pendingDailyGoal ? 1 : 0) +
      queue.pendingPresetIds.length +
      queue.pendingDeletedPresetIds.length;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    return {
      state: this.isSyncing
        ? 'syncing'
        : isOffline
        ? 'offline'
        : pendingCount > 0
        ? 'idle'
        : this.lastSyncedAt
        ? 'synced'
        : 'idle',
      lastSyncedAt: this.lastSyncedAt,
      pendingCount,
    };
  }

  // Incremental: Sync a single or specific Task
  public static async pushTask(task: Task, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      const { error } = await client.from('tasks').upsert({
        id: task.id,
        user_id: userId,
        title: task.title,
        completed: task.completed,
        pomodoros: task.pomodoros || 0,
        created_at: new Date(task.createdAt).toISOString(),
        completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
        updated_at: new Date(task.updatedAt || Date.now()).toISOString(),
      });

      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingTaskIds = queue.pendingTaskIds.filter((id) => id !== task.id);
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }

  // Incremental: Delete Task from Cloud
  public static async pushDeletedTask(taskId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const { error } = await client.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingDeletedTaskIds = queue.pendingDeletedTaskIds.filter((id) => id !== taskId);
        queue.pendingTaskIds = queue.pendingTaskIds.filter((id) => id !== taskId);
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Incremental: Push a single Focus Session
  public static async pushSession(session: FocusSession, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      const { error } = await client.from('focus_sessions').upsert({
        id: session.id,
        user_id: userId,
        timestamp: new Date(session.timestamp).toISOString(),
        mode: sanitizeTimerMode(session.mode),
        duration_minutes: session.durationMinutes,
        task_title: session.taskTitle || null,
      });

      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingSessionIds = queue.pendingSessionIds.filter((id) => id !== session.id);
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }

  // Incremental: Push User Settings
  public static async pushSettings(settings: TimerSettings, favorites: string[], userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      const { error } = await client.from('user_settings').upsert({
        user_id: userId,
        pomodoro_duration: settings.pomodoroDuration,
        short_break_duration: settings.shortBreakDuration,
        long_break_duration: settings.longBreakDuration,
        auto_start_breaks: settings.autoStartBreaks,
        auto_start_pomodoros: settings.autoStartPomodoros,
        sound_enabled: settings.soundEnabled,
        sound_volume: settings.soundVolume,
        notifications_enabled: settings.notificationsEnabled,
        theme: settings.theme,
        timer_color: settings.timerColor,
        favorite_atmospheres: favorites,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingSettings = false;
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }

  // Incremental: Push Daily Goal
  public static async pushDailyGoal(goal: DailyGoal, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      const { error } = await client.from('daily_goals').upsert({
        user_id: userId,
        target_pomodoros: goal.targetPomodoros,
        target_minutes: goal.targetMinutes,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingDailyGoal = false;
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }

  // Incremental: Push Preset
  public static async pushPreset(preset: AtmospherePreset, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const { error } = await client.from('atmosphere_presets').upsert({
        id: preset.id,
        user_id: userId,
        name: preset.name,
        atmosphere_id: preset.atmosphereId,
        sound_mixer: preset.soundMixer,
        created_at: new Date(preset.createdAt).toISOString(),
      });

      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingPresetIds = queue.pendingPresetIds.filter((id) => id !== preset.id);
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Incremental: Delete Preset
  public static async pushDeletedPreset(presetId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const { error } = await client.from('atmosphere_presets').delete().eq('id', presetId).eq('user_id', userId);
      if (!error) {
        const queue = getPendingSyncQueue();
        queue.pendingDeletedPresetIds = queue.pendingDeletedPresetIds.filter((id) => id !== presetId);
        queue.pendingPresetIds = queue.pendingPresetIds.filter((id) => id !== presetId);
        savePendingQueue(queue);
        this.lastSyncedAt = Date.now();
        setLastSyncedAt(this.lastSyncedAt);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Flush pending offline changes
  public static async flushPendingQueue(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !userId) return;
    const queue = getPendingSyncQueue();

    const tasks = loadTasks();
    for (const taskId of [...queue.pendingTaskIds]) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        await this.pushTask(task, userId);
      } else {
        const q = getPendingSyncQueue();
        q.pendingTaskIds = q.pendingTaskIds.filter((id) => id !== taskId);
        savePendingQueue(q);
      }
    }
    for (const taskId of [...queue.pendingDeletedTaskIds]) {
      await this.pushDeletedTask(taskId, userId);
    }

    const sessions = loadSessions();
    for (const sessionId of [...queue.pendingSessionIds]) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        await this.pushSession(session, userId);
      } else {
        const q = getPendingSyncQueue();
        q.pendingSessionIds = q.pendingSessionIds.filter((id) => id !== sessionId);
        savePendingQueue(q);
      }
    }

    if (queue.pendingSettings) {
      await this.pushSettings(loadSettings(), loadFavoriteAtmospheres(), userId);
    }

    if (queue.pendingDailyGoal) {
      await this.pushDailyGoal(loadDailyGoal(), userId);
    }

    const presets = loadAtmospherePresets();
    for (const presetId of [...queue.pendingPresetIds]) {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        await this.pushPreset(preset, userId);
      } else {
        const q = getPendingSyncQueue();
        q.pendingPresetIds = q.pendingPresetIds.filter((id) => id !== presetId);
        savePendingQueue(q);
      }
    }
    for (const presetId of [...queue.pendingDeletedPresetIds]) {
      await this.pushDeletedPreset(presetId, userId);
    }
  }

  // Full migration for newly created or freshly logged in account
  public static async migrateLocalDataToAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'User ID is required' };
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync is not configured yet (Guest Mode).' };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Could not connect to database.' };
    }

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      const localTasks = loadTasks();
      const localSessions = loadSessions();
      const localSettings = loadSettings();
      const localGoal = loadDailyGoal();
      const localPresets = loadAtmospherePresets();
      const localFavs = loadFavoriteAtmospheres();

      // 1. Settings & Goals
      await client.from('user_settings').upsert({
        user_id: userId,
        pomodoro_duration: localSettings.pomodoroDuration,
        short_break_duration: localSettings.shortBreakDuration,
        long_break_duration: localSettings.longBreakDuration,
        auto_start_breaks: localSettings.autoStartBreaks,
        auto_start_pomodoros: localSettings.autoStartPomodoros,
        sound_enabled: localSettings.soundEnabled,
        sound_volume: localSettings.soundVolume,
        notifications_enabled: localSettings.notificationsEnabled,
        theme: localSettings.theme,
        timer_color: localSettings.timerColor,
        favorite_atmospheres: localFavs,
        updated_at: new Date().toISOString(),
      });

      await client.from('daily_goals').upsert({
        user_id: userId,
        target_pomodoros: localGoal.targetPomodoros,
        target_minutes: localGoal.targetMinutes,
        updated_at: new Date().toISOString(),
      });

      // 2. Tasks
      if (localTasks.length > 0) {
        const payload = localTasks.map((t) => ({
          id: t.id,
          user_id: userId,
          title: t.title,
          completed: t.completed,
          pomodoros: t.pomodoros || 0,
          created_at: new Date(t.createdAt).toISOString(),
          completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
          updated_at: new Date(t.updatedAt || t.createdAt).toISOString(),
        }));
        await client.from('tasks').upsert(payload);
      }

      // 3. Sessions
      if (localSessions.length > 0) {
        const sessionPayload = localSessions.map((s) => ({
          id: s.id,
          user_id: userId,
          timestamp: new Date(s.timestamp).toISOString(),
          mode: sanitizeTimerMode(s.mode),
          duration_minutes: s.durationMinutes,
          task_title: s.taskTitle || null,
        }));
        await client.from('focus_sessions').upsert(sessionPayload);
      }

      // 4. Presets
      if (localPresets.length > 0) {
        const presetsPayload = localPresets.map((p) => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          atmosphere_id: p.atmosphereId,
          sound_mixer: p.soundMixer,
          created_at: new Date(p.createdAt).toISOString(),
        }));
        await client.from('atmosphere_presets').upsert(presetsPayload);
      }

      this.lastSyncedAt = Date.now();
      setLastSyncedAt(this.lastSyncedAt);
      clearPendingQueue();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Migration failed.';
      return { success: false, error: msg };
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }

  // Pull remote data & merge seamlessly
  public static async pullAndMerge(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !userId) return { success: true };
    const client = getSupabaseClient();
    if (!client) return { success: true };

    try {
      this.isSyncing = true;
      this.notify(this.getStatus());

      // Flush any queued offline edits before pulling
      await this.flushPendingQueue(userId);

      const [settingsRes, goalRes, tasksRes, sessionsRes, presetsRes] = await Promise.all([
        client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        client.from('daily_goals').select('*').eq('user_id', userId).maybeSingle(),
        client.from('tasks').select('*').eq('user_id', userId),
        client.from('focus_sessions').select('*').eq('user_id', userId),
        client.from('atmosphere_presets').select('*').eq('user_id', userId),
      ]);

      // 1. Set Tasks from Cloud
      if (tasksRes.data && Array.isArray(tasksRes.data)) {
        const remoteTasks: Task[] = tasksRes.data
          .filter((r: any) => r && typeof r.id === 'string' && typeof r.title === 'string')
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            completed: Boolean(r.completed),
            pomodoros: typeof r.pomodoros === 'number' ? r.pomodoros : 0,
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            completedAt: r.completed_at ? new Date(r.completed_at).getTime() : undefined,
            updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
          }));
        saveTasks(remoteTasks);
      } else {
        saveTasks([]);
      }

      // 2. Set Sessions from Cloud
      if (sessionsRes.data && Array.isArray(sessionsRes.data)) {
        const remoteSessions: FocusSession[] = sessionsRes.data
          .filter((r: any) => r && typeof r.id === 'string')
          .map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp ? new Date(r.timestamp).getTime() : Date.now(),
            mode: sanitizeTimerMode(r.mode),
            durationMinutes: sanitizeDuration(r.duration_minutes, 25),
            taskTitle: r.task_title || undefined,
          }));
        saveSessionsDirectly(remoteSessions);
      } else {
        saveSessionsDirectly([]);
      }

      // 3. Set Settings from Cloud
      if (settingsRes.data) {
        const remoteSettings = settingsRes.data;
        const current = loadSettings();
        const updated: TimerSettings = {
          ...current,
          pomodoroDuration: sanitizeDuration(remoteSettings.pomodoro_duration, 25),
          shortBreakDuration: sanitizeDuration(remoteSettings.short_break_duration, 5),
          longBreakDuration: sanitizeDuration(remoteSettings.long_break_duration, 15),
          autoStartBreaks: typeof remoteSettings.auto_start_breaks === 'boolean' ? remoteSettings.auto_start_breaks : false,
          autoStartPomodoros: typeof remoteSettings.auto_start_pomodoros === 'boolean' ? remoteSettings.auto_start_pomodoros : false,
          soundEnabled: typeof remoteSettings.sound_enabled === 'boolean' ? remoteSettings.sound_enabled : true,
          soundVolume: typeof remoteSettings.sound_volume === 'number' ? Math.max(0, Math.min(1, remoteSettings.sound_volume)) : 0.8,
          notificationsEnabled: typeof remoteSettings.notifications_enabled === 'boolean' ? remoteSettings.notifications_enabled : true,
          theme: sanitizeTheme(remoteSettings.theme, 'dark'),
          timerColor: sanitizeTimerColor(remoteSettings.timer_color, 'default'),
        };
        saveSettings(updated);

        if (Array.isArray(remoteSettings.favorite_atmospheres)) {
          saveFavoriteAtmospheres(remoteSettings.favorite_atmospheres);
        }
      } else {
        // Initial clean setup for new account in cloud
        saveSettings(loadSettings());
        await this.pushSettings(loadSettings(), loadFavoriteAtmospheres(), userId);
      }

      // 4. Set Daily Goal from Cloud
      if (goalRes.data) {
        const mergedGoal: DailyGoal = {
          targetPomodoros: typeof goalRes.data.target_pomodoros === 'number' ? goalRes.data.target_pomodoros : 4,
          targetMinutes: typeof goalRes.data.target_minutes === 'number' ? goalRes.data.target_minutes : 100,
        };
        saveDailyGoal(mergedGoal);
      } else {
        // Initial setup for daily goal in cloud
        saveDailyGoal(loadDailyGoal());
        await this.pushDailyGoal(loadDailyGoal(), userId);
      }

      // 5. Set Presets from Cloud
      if (presetsRes.data && Array.isArray(presetsRes.data)) {
        const remotePresets: AtmospherePreset[] = presetsRes.data
          .filter((r: any) => r && typeof r.id === 'string' && typeof r.name === 'string')
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            atmosphereId: r.atmosphere_id || 'tokyo',
            soundMixer: r.sound_mixer || { masterVolume: 0.8, tracks: {} },
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          }));
        saveAtmospherePresets(remotePresets);
      } else {
        saveAtmospherePresets([]);
      }

      this.lastSyncedAt = Date.now();
      setLastSyncedAt(this.lastSyncedAt);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed.';
      return { success: false, error: msg };
    } finally {
      this.isSyncing = false;
      this.notify(this.getStatus());
    }
  }
}

const saveSessionsDirectly = (sessions: FocusSession[]): void => {
  try {
    localStorage.setItem('pomodoro_sessions_v1', JSON.stringify(sessions));
  } catch {}
};

// Automatic Online Sync Trigger
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          SyncEngine.pullAndMerge(session.user.id);
        }
      });
    }
  });
}
