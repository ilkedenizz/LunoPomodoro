import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import confetti from 'canvas-confetti';
import { BackgroundView } from './components/BackgroundView';
import { Header } from './components/Header';
import { TimerModeSelector } from './components/TimerModeSelector';
import { MainTimerDisplay } from './components/MainTimerDisplay';
import { TimerControls } from './components/TimerControls';
import { DailyFocus } from './components/DailyFocus';
import { TaskList } from './components/TaskList';

// Lazy-loaded heavy modal components for production bundle optimization
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const BackgroundSelectorModal = lazy(() =>
  import('./components/BackgroundSelectorModal').then((m) => ({ default: m.BackgroundSelectorModal }))
);
const AmbienceAudioPlayer = lazy(() =>
  import('./components/AmbienceAudioPlayer').then((m) => ({ default: m.AmbienceAudioPlayer }))
);
const ShortcutsModal = lazy(() =>
  import('./components/ShortcutsModal').then((m) => ({ default: m.ShortcutsModal }))
);
const FocusHistoryModal = lazy(() =>
  import('./components/FocusHistoryModal').then((m) => ({ default: m.FocusHistoryModal }))
);
const FriendsModal = lazy(() =>
  import('./components/FriendsModal').then((m) => ({ default: m.FriendsModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);

import type { AuthModalMode } from './components/AuthModal';
import type {
  TimerMode,
  TimerState,
  TimerSettings,
  FocusSession,
  AtmosphereTheme,
  Task,
  DailyGoal,
  SoundMixerState,
  AtmospherePreset,
  AppTheme,
  UserProfile,
  SyncStatus,
} from './types';
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSession,
  loadSavedBackground,
  saveBackground,
  loadTasks,
  saveTasks,
  loadDailyGoal,
  saveDailyGoal,
  loadActiveTaskId,
  saveActiveTaskId,
  loadFavoriteAtmospheres,
  saveFavoriteAtmospheres,
  loadSoundMixerState,
  saveSoundMixerState,
  loadAtmospherePresets,
  saveAtmospherePresets,
  clearLocalStorageData,
  DEFAULT_SETTINGS,
  DEFAULT_SOUND_MIXER,
} from './utils/storage';
import { getAtmosphereById } from './utils/backgrounds';
import { playCompletionChime, ambientEngine } from './utils/sound';
import { isToday } from './utils/dates';
import { onAuthStateChange, signOut, getCurrentUser, handleAuthUrlCallback } from './services/auth';
import { getIncomingFriendRequests } from './services/friends';
import {
  SyncEngine,
  markTaskPending,
  markSettingsPending,
  markDailyGoalPending,
  markSessionPending,
} from './services/syncEngine';

export function App() {
  // 1. Settings & Persistence
  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings());
  const [atmosphere, setAtmosphere] = useState<AtmosphereTheme>(() =>
    getAtmosphereById(loadSavedBackground(loadSettings().theme || 'dark'), loadSettings().theme || 'dark')
  );
  const [sessions, setSessions] = useState<FocusSession[]>(() => loadSessions());

  // Phase 2 State: Tasks & Daily Goal
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(() => loadDailyGoal());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadActiveTaskId());

  // Phase 4 State: Atmosphere 2.0, Multi-track Sound Mixer & Presets
  const [favoriteAtmospheres, setFavoriteAtmospheres] = useState<string[]>(() =>
    loadFavoriteAtmospheres()
  );
  const [soundMixerState, setSoundMixerState] = useState<SoundMixerState>(() =>
    loadSoundMixerState()
  );
  const [atmospherePresets, setAtmospherePresets] = useState<AtmospherePreset[]>(() =>
    loadAtmospherePresets()
  );

  // User & Sync State (Local-first)
  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => SyncEngine.getStatus());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signup');

  // Friends State
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  // 2. Timer State
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timerState, setTimerState] = useState<TimerState>('idle');

  // Helper to compute duration in seconds
  const getModeDurationSeconds = useCallback(
    (m: TimerMode, customSettings = settings): number => {
      if (m === 'pomodoro') return customSettings.pomodoroDuration * 60;
      if (m === 'shortBreak') return customSettings.shortBreakDuration * 60;
      return customSettings.longBreakDuration * 60;
    },
    [settings]
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => getModeDurationSeconds('pomodoro'));

  // 3. Audio & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'preferences' | 'account'>('preferences');
  const [isBackgroundsOpen, setIsBackgroundsOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);

  // High precision timer reference & idempotency flag
  const expectedEndRef = useRef<number | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  // Auth state listener and initial cloud sync
  useEffect(() => {
    let isMounted = true;

    // Process potential auth callback from email confirmation / password recovery links
    const callbackResult = handleAuthUrlCallback();
    if (callbackResult.error) {
      setTimeout(() => {
        if (!isMounted) return;
        setAuthModalError(callbackResult.error || null);
        setAuthModalMode('signin');
        setIsAuthOpen(true);
      }, 0);
    } else if (callbackResult.type === 'recovery') {
      setTimeout(() => {
        if (!isMounted) return;
        setAuthModalError(null);
        setAuthModalMode('update-password');
        setIsAuthOpen(true);
      }, 0);
    }

    // Immediate check on mount for instant session recovery across page refreshes
    getCurrentUser().then((initialUser) => {
      if (initialUser && isMounted) {
        setUser(initialUser);
        getIncomingFriendRequests().then((reqs) => {
          if (isMounted) setIncomingRequestsCount(reqs.length);
        });
        SyncEngine.pullAndMerge(initialUser.id).then(() => {
          if (!isMounted) return;
          setSettings(loadSettings());
          setTasks(loadTasks());
          setSessions(loadSessions());
          setDailyGoal(loadDailyGoal());
          setAtmospherePresets(loadAtmospherePresets());
          setFavoriteAtmospheres(loadFavoriteAtmospheres());
        });
      }
    });

    const unsubAuth = onAuthStateChange((currentUser, event) => {
      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        getIncomingFriendRequests().then((reqs) => {
          if (isMounted) setIncomingRequestsCount(reqs.length);
        });
      } else {
        setIncomingRequestsCount(0);
      }

      // Handle password recovery link from Supabase email
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('update-password');
        setIsAuthOpen(true);
      }

      if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        SyncEngine.pullAndMerge(currentUser.id).then(() => {
          if (!isMounted) return;
          // Re-hydrate local states with latest merged cloud data
          setSettings(loadSettings());
          setTasks(loadTasks());
          setSessions(loadSessions());
          setDailyGoal(loadDailyGoal());
          setAtmospherePresets(loadAtmospherePresets());
          setFavoriteAtmospheres(loadFavoriteAtmospheres());
        });
      }
    });

    const unsubSync = SyncEngine.subscribe((status) => {
      if (isMounted) {
        setSyncStatus(status);
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
      unsubSync();
    };
  }, []);

  // Synchronize Sound Mixer State with Web Audio Ambient Synth Engine
  useEffect(() => {
    ambientEngine.syncMixerState(soundMixerState);
  }, [soundMixerState]);

  const handleMixerChange = useCallback((newState: SoundMixerState) => {
    setSoundMixerState(newState);
    saveSoundMixerState(newState);
  }, []);

  // Favorites Handler
  const handleToggleFavorite = useCallback((atmoId: string) => {
    setFavoriteAtmospheres((prev) => {
      const isFav = prev.includes(atmoId);
      const updated = isFav ? prev.filter((id) => id !== atmoId) : [...prev, atmoId];
      saveFavoriteAtmospheres(updated);
      if (user) {
        markSettingsPending();
        SyncEngine.pushSettings(settings, updated, user.id);
      }
      return updated;
    });
  }, [user, settings]);

  // Presets Handlers
  const handleSavePreset = useCallback((preset: AtmospherePreset) => {
    setAtmospherePresets((prev) => {
      const updated = [preset, ...prev.filter((p) => p.id !== preset.id)];
      saveAtmospherePresets(updated);
      if (user) {
        SyncEngine.pushPreset(preset, user.id);
      }
      return updated;
    });
  }, [user]);

  const handleDeletePreset = useCallback((presetId: string) => {
    setAtmospherePresets((prev) => {
      const updated = prev.filter((p) => p.id !== presetId);
      saveAtmospherePresets(updated);
      if (user) {
        SyncEngine.pushDeletedPreset(presetId, user.id);
      }
      return updated;
    });
  }, [user]);

  const handleApplyPreset = useCallback((preset: AtmospherePreset) => {
    const atmo = getAtmosphereById(preset.atmosphereId, settings.theme);
    setAtmosphere(atmo);
    saveBackground(atmo.id, settings.theme);
    handleMixerChange(preset.soundMixer);
  }, [settings.theme, handleMixerChange]);

  // Document Title update
  useEffect(() => {
    if (timerState === 'idle') {
      document.title = 'Luno — Focus in your own atmosphere';
      return;
    }
    if (timerState === 'completed') {
      const completionText =
        mode === 'pomodoro' ? '🎉 Focus Completed!' : '☕ Break Finished!';
      document.title = `${completionText} • Luno`;
      return;
    }
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const modeName =
      mode === 'pomodoro' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';
    const prefix = timerState === 'paused' ? '⏸ ' : '';
    document.title = `${prefix}(${formatted}) ${modeName} • Luno`;
  }, [timeLeft, mode, timerState]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Today Statistics Calculation (memoized)
  const todaySessions = useMemo(() => sessions.filter((s) => isToday(s.timestamp)), [sessions]);
  const todayPomodorosCount = useMemo(
    () => todaySessions.filter((s) => s.mode === 'pomodoro').length,
    [todaySessions]
  );
  const todayTotalMinutes = useMemo(
    () => todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [todaySessions]
  );

  // Active Task (memoized)
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId && !t.completed),
    [tasks, activeTaskId]
  );
  const activeTaskTitle = activeTask ? activeTask.title : null;

  // Check if any ambient track is actively playing
  const isAudioPlaying = useMemo(
    () => Object.values(soundMixerState.tracks).some((t) => t.volume > 0 && !t.muted),
    [soundMixerState]
  );

  // Task Handlers
  const handleAddTask = useCallback((title: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      completed: false,
      createdAt: Date.now(),
      pomodoros: 0,
    };
    setTasks((prev) => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });

    if (user) {
      markTaskPending(newTask.id);
      SyncEngine.pushTask(newTask, user.id);
    }

    setActiveTaskId((prevActive) => {
      if (!prevActive) {
        saveActiveTaskId(newTask.id);
        return newTask.id;
      }
      return prevActive;
    });
  }, [user]);

  const handleToggleComplete = useCallback((id: string) => {
    setTasks((prev) => {
      let toggledTask: Task | null = null;
      const updated = prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          toggledTask = {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? Date.now() : undefined,
            updatedAt: Date.now(),
          };
          return toggledTask;
        }
        return t;
      });
      saveTasks(updated);
      if (user && toggledTask) {
        markTaskPending(id);
        SyncEngine.pushTask(toggledTask, user.id);
      }
      return updated;
    });
  }, [user]);

  const handleSelectActive = useCallback((id: string) => {
    setActiveTaskId((prev) => {
      const nextId = prev === id ? null : id;
      saveActiveTaskId(nextId);
      return nextId;
    });
  }, []);

  const handleEditTask = useCallback((id: string, newTitle: string) => {
    setTasks((prev) => {
      let editedTask: Task | null = null;
      const updated = prev.map((t) => {
        if (t.id === id) {
          editedTask = { ...t, title: newTitle, updatedAt: Date.now() };
          return editedTask;
        }
        return t;
      });
      saveTasks(updated);
      if (user && editedTask) {
        markTaskPending(id);
        SyncEngine.pushTask(editedTask, user.id);
      }
      return updated;
    });
  }, [user]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTasks(updated);
      if (user) {
        SyncEngine.pushDeletedTask(id, user.id);
      }
      return updated;
    });
    setActiveTaskId((prev) => {
      if (prev === id) {
        saveActiveTaskId(null);
        return null;
      }
      return prev;
    });
  }, [user]);

  const handleUpdateGoal = useCallback((newGoal: DailyGoal) => {
    setDailyGoal(newGoal);
    saveDailyGoal(newGoal);
    if (user) {
      markDailyGoalPending();
      SyncEngine.pushDailyGoal(newGoal, user.id);
    }
  }, [user]);

  // Handle Session Completion (Strictly Idempotent)
  const handleSessionComplete = useCallback(() => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    expectedEndRef.current = null;
    setTimeLeft(0);
    setTimerState('completed');

    // Alarm Sound
    if (settings.soundEnabled) {
      playCompletionChime(settings.soundVolume);
    }

    // Browser Notification
    if (settings.notificationsEnabled && Notification.permission === 'granted') {
      const title =
        mode === 'pomodoro'
          ? '🎉 Focus Session Finished!'
          : '⚡ Break Time Ended!';
      const body =
        mode === 'pomodoro'
          ? 'Great work! Take a break or continue focusing in Luno.'
          : 'Ready to focus again? Let’s start the next session.';
      new Notification(title, { body });
    }

    // Handle Pomodoro session log & celebration
    if (mode === 'pomodoro') {
      const newSession: FocusSession = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        mode: 'pomodoro',
        durationMinutes: settings.pomodoroDuration,
        taskTitle: activeTaskTitle || undefined,
      };
      const updatedSessions = saveSession(newSession);
      setSessions(updatedSessions);

      if (user) {
        markSessionPending(newSession.id);
        SyncEngine.pushSession(newSession, user.id);
      }

      // Increment active task pomodoros count if present
      if (activeTaskId) {
        setTasks((prevTasks) => {
          let targetTask: Task | null = null;
          const updated = prevTasks.map((t) => {
            if (t.id === activeTaskId) {
              targetTask = { ...t, pomodoros: t.pomodoros + 1, updatedAt: Date.now() };
              return targetTask;
            }
            return t;
          });
          saveTasks(updated);
          if (user && targetTask) {
            markTaskPending(activeTaskId);
            SyncEngine.pushTask(targetTask, user.id);
          }
          return updated;
        });
      }

      // Confetti celebration
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#a855f7', '#38bdf8', '#34d399'],
      });
    } else {
      // Break completion: log break session
      const breakSession: FocusSession = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        mode: mode,
        durationMinutes: mode === 'shortBreak' ? settings.shortBreakDuration : settings.longBreakDuration,
      };
      const updatedSessions = saveSession(breakSession);
      setSessions(updatedSessions);

      if (user) {
        markSessionPending(breakSession.id);
        SyncEngine.pushSession(breakSession, user.id);
      }
    }
  }, [
    mode,
    settings,
    activeTaskId,
    activeTaskTitle,
    user,
  ]);

  // Main Timer Countdown Loop
  useEffect(() => {
    if (timerState !== 'running') return;

    if (!expectedEndRef.current) {
      expectedEndRef.current = Date.now() + timeLeft * 1000;
    }

    const interval = setInterval(() => {
      if (!expectedEndRef.current) return;
      const now = Date.now();
      const remainingMs = expectedEndRef.current - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSecs <= 0) {
        clearInterval(interval);
        expectedEndRef.current = null;
        setTimeLeft(0);
        handleSessionComplete();
      } else {
        setTimeLeft((prev) => (prev !== remainingSecs ? remainingSecs : prev));
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timerState, timeLeft, handleSessionComplete]);

  // Tab visibility synchronization (prevents background throttle drift)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState === 'running' && expectedEndRef.current) {
        const now = Date.now();
        const remainingMs = expectedEndRef.current - now;
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
        if (remainingSecs <= 0) {
          expectedEndRef.current = null;
          setTimeLeft(0);
          handleSessionComplete();
        } else {
          setTimeLeft(remainingSecs);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, handleSessionComplete]);

  // Timer Controls
  const handleStart = useCallback(() => {
    isCompletingRef.current = false;
    const targetDuration = timeLeft <= 0 ? getModeDurationSeconds(mode) : timeLeft;
    setTimeLeft(targetDuration);
    expectedEndRef.current = Date.now() + targetDuration * 1000;
    setTimerState('running');
  }, [timeLeft, mode, getModeDurationSeconds]);

  const handlePause = useCallback(() => {
    setTimerState('paused');
    expectedEndRef.current = null;
  }, []);

  const handleResume = useCallback(() => {
    isCompletingRef.current = false;
    expectedEndRef.current = Date.now() + timeLeft * 1000;
    setTimerState('running');
  }, [timeLeft]);

  const handleReset = useCallback(() => {
    isCompletingRef.current = false;
    setTimerState('idle');
    expectedEndRef.current = null;
    setTimeLeft(getModeDurationSeconds(mode));
  }, [mode, getModeDurationSeconds]);

  const handleSkip = useCallback(() => {
    isCompletingRef.current = false;
    setTimerState('idle');
    expectedEndRef.current = null;
    if (mode === 'pomodoro') {
      const nextMode: TimerMode =
        (todayPomodorosCount + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeLeft(getModeDurationSeconds(nextMode));
    } else {
      setMode('pomodoro');
      setTimeLeft(getModeDurationSeconds('pomodoro'));
    }
  }, [mode, todayPomodorosCount, getModeDurationSeconds]);

  // Action: User explicitly chooses to take a break after Pomodoro
  const handleStartBreak = useCallback(() => {
    isCompletingRef.current = false;
    const nextBreakMode: TimerMode =
      todayPomodorosCount > 0 && todayPomodorosCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    setMode(nextBreakMode);
    const breakDuration = getModeDurationSeconds(nextBreakMode);
    setTimeLeft(breakDuration);
    expectedEndRef.current = Date.now() + breakDuration * 1000;
    setTimerState('running');
  }, [todayPomodorosCount, getModeDurationSeconds]);

  // Action: User explicitly chooses to continue with another Focus session
  const handleContinueFocus = useCallback(() => {
    isCompletingRef.current = false;
    setMode('pomodoro');
    const focusDuration = getModeDurationSeconds('pomodoro');
    setTimeLeft(focusDuration);
    expectedEndRef.current = Date.now() + focusDuration * 1000;
    setTimerState('running');
  }, [getModeDurationSeconds]);

  const handleSelectMode = useCallback((newMode: TimerMode) => {
    setMode((prevMode) => {
      if (newMode === prevMode && timerState !== 'completed') return prevMode;
      isCompletingRef.current = false;
      setTimerState('idle');
      expectedEndRef.current = null;
      setTimeLeft(getModeDurationSeconds(newMode));
      return newMode;
    });
  }, [timerState, getModeDurationSeconds]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timerState === 'running') handlePause();
        else if (timerState === 'paused') handleResume();
        else if (timerState === 'completed') handleContinueFocus();
        else handleStart();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'KeyS') {
        if (timerState === 'completed') handleStartBreak();
        else handleSkip();
      } else if (e.code === 'KeyM') {
        setIsAudioOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsSettingsOpen(false);
        setIsBackgroundsOpen(false);
        setIsAudioOpen(false);
        setIsShortcutsOpen(false);
        setIsHistoryOpen(false);
        setIsAuthOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    timerState,
    handlePause,
    handleResume,
    handleStart,
    handleReset,
    handleSkip,
    handleStartBreak,
    handleContinueFocus,
  ]);

  // Theme synchronization effect
  useEffect(() => {
    const currentTheme = settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [settings.theme]);

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme: AppTheme = prev.theme === 'light' ? 'dark' : 'light';
      const updated = { ...prev, theme: nextTheme };
      saveSettings(updated);
      const targetBg = getAtmosphereById(loadSavedBackground(nextTheme), nextTheme);
      setAtmosphere(targetBg);
      return updated;
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    clearLocalStorageData();
    setUser(null);
    SyncEngine.reset();
    setSettings(DEFAULT_SETTINGS);
    setTasks([]);
    setSessions([]);
    setDailyGoal(loadDailyGoal());
    setAtmospherePresets([]);
    setFavoriteAtmospheres(loadFavoriteAtmospheres());
    setSoundMixerState(DEFAULT_SOUND_MIXER);
    setActiveTaskId(null);
    const targetBg = getAtmosphereById(loadSavedBackground(DEFAULT_SETTINGS.theme), DEFAULT_SETTINGS.theme);
    setAtmosphere(targetBg);
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (user) {
      await SyncEngine.pullAndMerge(user.id);
      setSettings(loadSettings());
      setTasks(loadTasks());
      setSessions(loadSessions());
      setDailyGoal(loadDailyGoal());
      setAtmospherePresets(loadAtmospherePresets());
      setFavoriteAtmospheres(loadFavoriteAtmospheres());
    }
  }, [user]);

  const handleOpenAuth = useCallback((initialMode: AuthModalMode = 'signup', errorMsg?: string | null) => {
    setAuthModalMode(initialMode);
    setAuthModalError(errorMsg || null);
    setIsAuthOpen(true);
  }, []);

  const handleAuthSuccess = useCallback((authedUser: UserProfile) => {
    setUser(authedUser);
    SyncEngine.pullAndMerge(authedUser.id).then(() => {
      setSettings(loadSettings());
      setTasks(loadTasks());
      setSessions(loadSessions());
      setDailyGoal(loadDailyGoal());
      setAtmospherePresets(loadAtmospherePresets());
      setFavoriteAtmospheres(loadFavoriteAtmospheres());
    });
  }, []);

  const isLight = settings.theme === 'light';

  return (
    <div
      className={`relative h-screen min-h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between items-center overflow-x-hidden overflow-y-auto xl:overflow-y-hidden font-sans transition-colors duration-500 ${
        isLight ? 'theme-light text-slate-900' : 'theme-dark text-white'
      }`}
    >
      {/* 1. Full-screen Atmospheric Background View */}
      <BackgroundView atmosphere={atmosphere} theme={settings.theme} />

      {/* 2. Top Header Bar */}
      <Header
        currentAtmosphere={atmosphere}
        todayPomodoros={todayPomodorosCount}
        todayMinutes={todayTotalMinutes}
        onOpenBackgrounds={() => setIsBackgroundsOpen(true)}
        onOpenSettings={() => {
          setSettingsTab('preferences');
          setIsSettingsOpen(true);
        }}
        onOpenAudio={() => setIsAudioOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenFriends={() => setIsFriendsOpen(true)}
        incomingRequestsCount={incomingRequestsCount}
        isAudioPlaying={isAudioPlaying}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        timerRunning={timerState === 'running'}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        user={user}
        syncStatus={syncStatus}
        onOpenAuth={() => {
          if (user) {
            setSettingsTab('account');
            setIsSettingsOpen(true);
          } else {
            handleOpenAuth('signin');
          }
        }}
      />

      {/* 3. Main Center Focus Workspace (True 3-Column Desktop Layout) */}
      <main className="relative z-10 flex-1 w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2 flex flex-col justify-center my-auto overflow-visible">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[300px_1fr_300px] 2xl:grid-cols-[340px_1fr_340px] gap-6 lg:gap-8 items-center">
          {/* Left Column: Daily Focus (Desktop Left) */}
          <div className="order-2 md:order-2 xl:order-1 md:col-span-1 xl:col-span-1 w-full max-w-md xl:max-w-none mx-auto flex flex-col justify-center">
            <DailyFocus
              todayPomodoros={todayPomodorosCount}
              todayMinutes={todayTotalMinutes}
              dailyGoal={dailyGoal}
              onUpdateGoal={handleUpdateGoal}
              theme={settings.theme}
            />
          </div>

          {/* Center Column: Pomodoro Timer (Viewport Geometric Center) */}
          <div className="order-1 md:order-1 xl:order-2 md:col-span-2 xl:col-span-1 w-full flex flex-col items-center justify-center max-w-xl mx-auto">
            {/* 1. Timer Mode Selector */}
            <TimerModeSelector
              currentMode={mode}
              onSelectMode={handleSelectMode}
              theme={settings.theme}
            />

            {/* 2. Central Timer Display with Mode Label, 25:00, Sessions, Active Task, and chosen Timer Color */}
            <MainTimerDisplay
              timeLeftSeconds={timeLeft}
              totalDurationSeconds={getModeDurationSeconds(mode)}
              mode={mode}
              state={timerState}
              completedPomodoros={todayPomodorosCount}
              activeTaskTitle={activeTaskTitle}
              theme={settings.theme}
              timerColor={settings.timerColor}
            />

            {/* 3. Timer Controls */}
            <TimerControls
              timerState={timerState}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              onSkip={handleSkip}
              onStartBreak={handleStartBreak}
              onContinueFocus={handleContinueFocus}
              breakType={todayPomodorosCount > 0 && todayPomodorosCount % 4 === 0 ? 'longBreak' : 'shortBreak'}
              theme={settings.theme}
            />
          </div>

          {/* Right Column: Focus Tasks (Desktop Right) */}
          <div className="order-3 md:order-3 xl:order-3 md:col-span-1 xl:col-span-1 w-full max-w-md xl:max-w-none mx-auto flex flex-col justify-center">
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onAddTask={handleAddTask}
              onToggleComplete={handleToggleComplete}
              onSelectActive={handleSelectActive}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              theme={settings.theme}
            />
          </div>
        </div>
      </main>

      {/* 4. Minimal Footer / Mobile Stats Badge */}
      <footer className="relative z-10 w-full py-2.5 sm:py-3 px-6 text-center flex flex-col sm:flex-row items-center justify-between text-xs space-y-2 sm:space-y-0 shrink-0">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className={`md:hidden flex items-center space-x-2 px-3 py-1 rounded-full glass-pill cursor-pointer ${
            isLight ? 'text-slate-800' : 'text-white/80'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Today: {todayPomodorosCount} pomodoros ({todayTotalMinutes}m focused)</span>
        </button>
        <div
          className={`hidden md:block font-mono text-[11px] ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}
        >
          Press{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              isLight ? 'bg-black/10 text-slate-800' : 'bg-white/10 text-white/90'
            }`}
          >
            Space
          </kbd>{' '}
          Start/Pause •{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              isLight ? 'bg-black/10 text-slate-800' : 'bg-white/10 text-white/90'
            }`}
          >
            R
          </kbd>{' '}
          Reset •{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              isLight ? 'bg-black/10 text-slate-800' : 'bg-white/10 text-white/90'
            }`}
          >
            M
          </kbd>{' '}
          Audio
        </div>
        <div
          className={`transition-colors text-[11px] font-medium ${
            isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white/80'
          }`}
        >
          Luno — Focus in your own atmosphere
        </div>
      </footer>

      {/* 5. Lazy Modals with Suspense */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSaveSettings={(newSettings) => {
              if (newSettings.theme !== settings.theme) {
                const targetBg = getAtmosphereById(loadSavedBackground(newSettings.theme), newSettings.theme);
                setAtmosphere(targetBg);
              }
              setSettings(newSettings);
              saveSettings(newSettings);
              if (user) {
                markSettingsPending();
                SyncEngine.pushSettings(newSettings, favoriteAtmospheres, user.id);
              }
              if (timerState === 'idle') {
                setTimeLeft(getModeDurationSeconds(mode, newSettings));
              }
            }}
            onResetStats={() => {
              localStorage.removeItem('pomodoro_sessions_v1');
              setSessions([]);
            }}
            user={user}
            syncStatus={syncStatus}
            sessions={sessions}
            tasks={tasks}
            initialTab={settingsTab}
            onOpenAuth={(mode) => handleOpenAuth(mode || 'signin')}
            onSignOut={handleSignOut}
            onSyncNow={handleSyncNow}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {isBackgroundsOpen && (
          <BackgroundSelectorModal
            isOpen={isBackgroundsOpen}
            onClose={() => setIsBackgroundsOpen(false)}
            activeId={atmosphere.id}
            onSelect={(bg) => {
              setAtmosphere(bg);
              saveBackground(bg.id, settings.theme);
            }}
            favoriteIds={favoriteAtmospheres}
            onToggleFavorite={handleToggleFavorite}
            mixerState={soundMixerState}
            onMixerChange={handleMixerChange}
            presets={atmospherePresets}
            onApplyPreset={handleApplyPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            theme={settings.theme}
          />
        )}

        {isAudioOpen && (
          <AmbienceAudioPlayer
            isOpen={isAudioOpen}
            onClose={() => setIsAudioOpen(false)}
            mixerState={soundMixerState}
            onChangeMixerState={handleMixerChange}
          />
        )}

        {isShortcutsOpen && (
          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />
        )}

        {isHistoryOpen && (
          <FocusHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            sessions={sessions}
          />
        )}

        {isFriendsOpen && (
          <FriendsModal
            isOpen={isFriendsOpen}
            onClose={() => setIsFriendsOpen(false)}
            user={user}
            theme={settings.theme}
            onOpenAuth={() => handleOpenAuth('signin')}
            onRequestCountChange={setIncomingRequestsCount}
          />
        )}

        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => {
              setIsAuthOpen(false);
              setAuthModalError(null);
            }}
            theme={settings.theme}
            initialMode={authModalMode}
            initialError={authModalError}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
