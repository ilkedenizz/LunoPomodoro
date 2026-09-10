import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
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
} from './utils/storage';
import { getAtmosphereById } from './utils/backgrounds';
import { playCompletionChime, ambientEngine } from './utils/sound';
import { isToday } from './utils/dates';

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
  const [isBackgroundsOpen, setIsBackgroundsOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // High precision timer reference
  const expectedEndRef = useRef<number | null>(null);

  // Synchronize Sound Mixer State with Web Audio Ambient Synth Engine
  useEffect(() => {
    ambientEngine.syncMixerState(soundMixerState);
  }, [soundMixerState]);

  const handleMixerChange = (newState: SoundMixerState) => {
    setSoundMixerState(newState);
    saveSoundMixerState(newState);
  };

  // Favorites Handler
  const handleToggleFavorite = (atmoId: string) => {
    const isFav = favoriteAtmospheres.includes(atmoId);
    const updated = isFav
      ? favoriteAtmospheres.filter((id) => id !== atmoId)
      : [...favoriteAtmospheres, atmoId];
    setFavoriteAtmospheres(updated);
    saveFavoriteAtmospheres(updated);
  };

  // Presets Handlers
  const handleSavePreset = (preset: AtmospherePreset) => {
    const updated = [preset, ...atmospherePresets];
    setAtmospherePresets(updated);
    saveAtmospherePresets(updated);
  };

  const handleDeletePreset = (presetId: string) => {
    const updated = atmospherePresets.filter((p) => p.id !== presetId);
    setAtmospherePresets(updated);
    saveAtmospherePresets(updated);
  };

  const handleApplyPreset = (preset: AtmospherePreset) => {
    const atmo = getAtmosphereById(preset.atmosphereId, settings.theme);
    setAtmosphere(atmo);
    saveBackground(atmo.id, settings.theme);
    handleMixerChange(preset.soundMixer);
  };

  // Document Title update
  useEffect(() => {
    if (timerState === 'idle') {
      document.title = 'Luno — Focus in your own atmosphere';
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Today Statistics Calculation
  const todaySessions = sessions.filter((s) => isToday(s.timestamp));
  const todayPomodorosCount = todaySessions.filter((s) => s.mode === 'pomodoro').length;
  const todayTotalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Active Task
  const activeTask = tasks.find((t) => t.id === activeTaskId && !t.completed);
  const activeTaskTitle = activeTask ? activeTask.title : null;

  // Check if any ambient track is actively playing
  const isAudioPlaying = Object.values(soundMixerState.tracks).some(
    (t) => t.volume > 0 && !t.muted
  );

  // Task Handlers
  const handleAddTask = (title: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      completed: false,
      createdAt: Date.now(),
      pomodoros: 0,
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasks(updated);

    if (!activeTaskId) {
      setActiveTaskId(newTask.id);
      saveActiveTaskId(newTask.id);
    }
  };

  const handleToggleComplete = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
      }
      return t;
    });
    setTasks(updated);
    saveTasks(updated);
  };

  const handleSelectActive = (id: string) => {
    const nextId = activeTaskId === id ? null : id;
    setActiveTaskId(nextId);
    saveActiveTaskId(nextId);
  };

  const handleEditTask = (id: string, newTitle: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, title: newTitle } : t));
    setTasks(updated);
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
    if (activeTaskId === id) {
      setActiveTaskId(null);
      saveActiveTaskId(null);
    }
  };

  const handleUpdateGoal = (newGoal: DailyGoal) => {
    setDailyGoal(newGoal);
    saveDailyGoal(newGoal);
  };

  // Handle Session Completion
  const handleSessionComplete = useCallback(() => {
    setTimerState('idle');

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
          ? 'Great work! Take a well-deserved break.'
          : 'Ready to focus again? Let’s start the next session.';
      new Notification(title, { body });
    }

    // Handle Pomodoro session log & celebration
    let nextPomodoroCount = todayPomodorosCount;
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
      nextPomodoroCount += 1;

      // Increment active task pomodoros count if present
      if (activeTaskId) {
        setTasks((prevTasks) => {
          const updated = prevTasks.map((t) => {
            if (t.id === activeTaskId) {
              return { ...t, pomodoros: t.pomodoros + 1 };
            }
            return t;
          });
          saveTasks(updated);
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
    }

    // Cycle Navigation
    if (mode === 'pomodoro') {
      const nextMode: TimerMode =
        nextPomodoroCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      const nextDuration = getModeDurationSeconds(nextMode);
      setTimeLeft(nextDuration);

      if (settings.autoStartBreaks) {
        setTimerState('running');
        expectedEndRef.current = Date.now() + nextDuration * 1000;
      }
    } else {
      setMode('pomodoro');
      const nextDuration = getModeDurationSeconds('pomodoro');
      setTimeLeft(nextDuration);

      if (settings.autoStartPomodoros) {
        setTimerState('running');
        expectedEndRef.current = Date.now() + nextDuration * 1000;
      }
    }
  }, [
    mode,
    settings,
    todayPomodorosCount,
    getModeDurationSeconds,
    activeTaskId,
    activeTaskTitle,
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
    expectedEndRef.current = Date.now() + timeLeft * 1000;
    setTimerState('running');
  }, [timeLeft]);

  const handlePause = useCallback(() => {
    setTimerState('paused');
    expectedEndRef.current = null;
  }, []);

  const handleResume = useCallback(() => {
    expectedEndRef.current = Date.now() + timeLeft * 1000;
    setTimerState('running');
  }, [timeLeft]);

  const handleReset = useCallback(() => {
    setTimerState('idle');
    expectedEndRef.current = null;
    setTimeLeft(getModeDurationSeconds(mode));
  }, [mode, getModeDurationSeconds]);

  const handleSkip = useCallback(() => {
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

  const handleSelectMode = (newMode: TimerMode) => {
    if (newMode === mode) return;
    setTimerState('idle');
    expectedEndRef.current = null;
    setMode(newMode);
    setTimeLeft(getModeDurationSeconds(newMode));
  };

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
        else handleStart();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'KeyS') {
        handleSkip();
      } else if (e.code === 'KeyM') {
        setIsAudioOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsSettingsOpen(false);
        setIsBackgroundsOpen(false);
        setIsAudioOpen(false);
        setIsShortcutsOpen(false);
        setIsHistoryOpen(false);
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

  const handleToggleTheme = () => {
    const nextTheme: AppTheme = settings.theme === 'light' ? 'dark' : 'light';
    const updated = { ...settings, theme: nextTheme };
    setSettings(updated);
    saveSettings(updated);
    const targetBg = getAtmosphereById(loadSavedBackground(nextTheme), nextTheme);
    setAtmosphere(targetBg);
  };

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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAudio={() => setIsAudioOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isAudioPlaying={isAudioPlaying}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        timerRunning={timerState === 'running'}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
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
              if (timerState === 'idle') {
                setTimeLeft(getModeDurationSeconds(mode, newSettings));
              }
            }}
            onResetStats={() => {
              localStorage.removeItem('pomodoro_sessions_v1');
              setSessions([]);
            }}
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
      </Suspense>
    </div>
  );
}

export default App;
