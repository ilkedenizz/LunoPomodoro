export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
export type TimerState = 'idle' | 'running' | 'paused';

export type AppTheme = 'dark' | 'light';
export type TimerColorId =
  | 'default'
  | 'white'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink';

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
  theme: AppTheme;
  timerColor: TimerColorId;
}

export interface FocusSession {
  id: string;
  timestamp: number;
  mode: TimerMode;
  durationMinutes: number;
  taskTitle?: string;
}

export interface AtmosphereTheme {
  id: string;
  name: string;
  tagline: string;
  themeType?: 'dark' | 'light' | 'both';
  imageUrl?: string;
  cssBackground: string;
  fallbackGradient?: string;
  overlayOpacity: number;
  recommendedSounds?: { track: AmbientSoundId; volume: number }[];
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

export interface TrackMixerState {
  volume: number; // 0..1
  muted: boolean;
}

export interface SoundMixerState {
  masterVolume: number; // 0..1
  tracks: Record<Exclude<AmbientSoundId, 'off'>, TrackMixerState>;
}

export interface AtmospherePreset {
  id: string;
  name: string;
  atmosphereId: string;
  soundMixer: SoundMixerState;
  createdAt: number;
}
