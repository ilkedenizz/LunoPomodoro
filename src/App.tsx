import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { BackgroundView } from './components/BackgroundView';
import { Header } from './components/Header';
import { TimerModeSelector } from './components/TimerModeSelector';
import { MainTimerDisplay } from './components/MainTimerDisplay';
import { TimerControls } from './components/TimerControls';
import { SettingsModal } from './components/SettingsModal';
import { BackgroundSelectorModal } from './components/BackgroundSelectorModal';
import { AmbienceAudioPlayer } from './components/AmbienceAudioPlayer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { DailyFocus } from './components/DailyFocus';
import { TaskList } from './components/TaskList';
import { FocusHistoryModal } from './components/FocusHistoryModal';

import type {
  TimerMode,
  TimerState,
  TimerSettings,
  FocusSession,
  AtmosphereTheme,
  AmbientSoundId,
  Task,
  DailyGoal,
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
} from './utils/storage';
import { getAtmosphereById } from './utils/backgrounds';
import { playCompletionChime, ambientEngine } from './utils/sound';
import { isToday } from './utils/dates';

export function App() {
  // 1. Settings & Persistence
  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings());
  const [atmosphere, setAtmosphere] = useState<AtmosphereTheme>(() =>
    getAtmosphereById(loadSavedBackground())
  );
  const [sessions, setSessions] = useState<FocusSession[]>(() => loadSessions());

  // Phase 2 State: Tasks & Daily Goal
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(() => loadDailyGoal());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadActiveTaskId());

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
  const [ambientTrack, setAmbientTrack] = useState<AmbientSoundId>('off');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackgroundsOpen, setIsBackgroundsOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // High precision timer reference
  const expectedEndRef = useRef<number | null>(null);

  // Document Title update
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const modeName =
      mode === 'pomodoro' ? 'Pomodoro' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';
    document.title = `(${formatted}) ${modeName} • StudyFlow`;
  }, [timeLeft, mode]);

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

  // Sound Engine Volume Sync
  useEffect(() => {
    ambientEngine.setVolume(ambientVolume);
  }, [ambientVolume]);

  const handleSelectAmbientTrack = useCallback(
    (track: AmbientSoundId) => {
      setAmbientTrack(track);
      if (track === 'off') {
        ambientEngine.stop();
      } else {
        ambientEngine.playTrack(track, ambientVolume);
      }
    },
    [ambientVolume]
  );

  // Today Statistics Calculation
  const todaySessions = sessions.filter((s) => isToday(s.timestamp));
  const todayPomodorosCount = todaySessions.filter((s) => s.mode === 'pomodoro').length;
  const todayTotalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Active Task
  const activeTask = tasks.find((t) => t.id === activeTaskId && !t.completed);
  const activeTaskTitle = activeTask ? activeTask.title : null;

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
      const now = Date.now();
      const remainingMs = (expectedEndRef.current || now) - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSecs);

      if (remainingSecs <= 0) {
        clearInterval(interval);
        expectedEndRef.current = null;
        handleSessionComplete();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [timerState, timeLeft, handleSessionComplete]);

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
      // Don't trigger if user is typing in an input element
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
        handleSelectAmbientTrack(ambientTrack === 'off' ? 'rain' : 'off');
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
    ambientTrack,
    handlePause,
    handleResume,
    handleStart,
    handleReset,
    handleSkip,
    handleSelectAmbientTrack,
  ]);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center overflow-x-hidden font-sans text-white">
      {/* 1. Full-screen Atmospheric Background View */}
      <BackgroundView atmosphere={atmosphere} />

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
        isAudioPlaying={ambientTrack !== 'off'}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        timerRunning={timerState === 'running'}
      />

      {/* 3. Main Center Workspace Grid */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 lg:gap-8 my-auto">
        {/* Main Central Timer Column */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto">
          {/* Timer Mode Selector */}
          <TimerModeSelector currentMode={mode} onSelectMode={handleSelectMode} />

          {/* Central Timer Display with Active Task indicator */}
          <MainTimerDisplay
            timeLeftSeconds={timeLeft}
            totalDurationSeconds={getModeDurationSeconds(mode)}
            mode={mode}
            state={timerState}
            completedPomodoros={todayPomodorosCount}
            activeTaskTitle={activeTaskTitle}
          />

          {/* Controls Bar */}
          <TimerControls
            timerState={timerState}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
            onSkip={handleSkip}
          />
        </div>

        {/* Side / Bottom Focus Workspace Panel (Daily Focus + Tasks) */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col space-y-4 shrink-0">
          {/* Daily Focus Goal Card */}
          <DailyFocus
            todayPomodoros={todayPomodorosCount}
            todayMinutes={todayTotalMinutes}
            dailyGoal={dailyGoal}
            onUpdateGoal={handleUpdateGoal}
          />

          {/* Tasks Panel */}
          <TaskList
            tasks={tasks}
            activeTaskId={activeTaskId}
            onAddTask={handleAddTask}
            onToggleComplete={handleToggleComplete}
            onSelectActive={handleSelectActive}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </main>

      {/* 4. Minimal Footer / Mobile Stats Badge */}
      <footer className="relative z-10 w-full py-4 px-6 text-center flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 space-y-2 sm:space-y-0">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="md:hidden flex items-center space-x-2 px-3 py-1 rounded-full glass-pill text-white/80 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Today: {todayPomodorosCount} pomodoros ({todayTotalMinutes}m focused)</span>
        </button>
        <div className="hidden md:block">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/80">Space</kbd> to Start/Pause • <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/80">R</kbd> to Reset
        </div>
        <div className="hover:text-white/80 transition-colors">
          Atmospheric Personal Focus Workspace
        </div>
      </footer>

      {/* 5. Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
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

      <BackgroundSelectorModal
        isOpen={isBackgroundsOpen}
        onClose={() => setIsBackgroundsOpen(false)}
        activeId={atmosphere.id}
        onSelect={(bg) => {
          setAtmosphere(bg);
          saveBackground(bg.id);
        }}
      />

      <AmbienceAudioPlayer
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
        activeTrack={ambientTrack}
        volume={ambientVolume}
        onSelectTrack={handleSelectAmbientTrack}
        onChangeVolume={setAmbientVolume}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <FocusHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
      />
    </div>
  );
}

export default App;
