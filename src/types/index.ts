export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
export type TimerState = 'idle' | 'running' | 'paused';

export interface TimerSettings {
  pomodoroDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  notificationsEnabled: boolean;
  tickingEnabled: boolean;
}

export interface FocusSession {
  id: string;
  timestamp: number;
  mode: TimerMode;
  durationMinutes: number;
}

export interface AtmosphereTheme {
  id: string;
  name: string;
  tagline: string;
  imageUrl: string;
  fallbackGradient: string;
  overlayOpacity: number;
}

export type AmbientSoundId = 'off' | 'rain' | 'cafe' | 'waves' | 'fire' | 'lofi';

export interface AmbientTrack {
  id: AmbientSoundId;
  name: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  pomodoros: number;
}

export interface DailyGoal {
  targetPomodoros: number; // default 4
  targetMinutes: number;   // default 100
}

