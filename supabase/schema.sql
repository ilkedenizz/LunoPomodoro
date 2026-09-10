-- ==============================================================================
-- LUNO (STUDYLUNO) — SUPABASE DATABASE SCHEMA & ROW-LEVEL SECURITY (RLS)
-- ==============================================================================
-- Run this script in your Supabase project's SQL Editor to set up all tables,
-- RLS policies, and indexes for multi-device synchronization.
-- ==============================================================================

-- 1. USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pomodoro_duration INTEGER NOT NULL DEFAULT 25 CHECK (pomodoro_duration >= 1 AND pomodoro_duration <= 180),
  short_break_duration INTEGER NOT NULL DEFAULT 5 CHECK (short_break_duration >= 1 AND short_break_duration <= 180),
  long_break_duration INTEGER NOT NULL DEFAULT 15 CHECK (long_break_duration >= 1 AND long_break_duration <= 180),
  auto_start_breaks BOOLEAN NOT NULL DEFAULT FALSE,
  auto_start_pomodoros BOOLEAN NOT NULL DEFAULT FALSE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_volume NUMERIC NOT NULL DEFAULT 0.8 CHECK (sound_volume >= 0 AND sound_volume <= 1),
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  timer_color TEXT NOT NULL DEFAULT 'default',
  favorite_atmospheres JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

-- 2. DAILY GOALS
CREATE TABLE IF NOT EXISTS public.daily_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_pomodoros INTEGER NOT NULL DEFAULT 4 CHECK (target_pomodoros >= 1 AND target_pomodoros <= 50),
  target_minutes INTEGER NOT NULL DEFAULT 100 CHECK (target_minutes >= 1 AND target_minutes <= 1440),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own daily goal"
  ON public.daily_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_goals_user ON public.daily_goals(user_id);

-- 3. FOCUS TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  pomodoros INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tasks"
  ON public.tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON public.tasks(user_id, created_at DESC);

-- 4. FOCUS SESSIONS / HISTORY
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('pomodoro', 'shortBreak', 'longBreak')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
  task_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own focus sessions"
  ON public.focus_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_time ON public.focus_sessions(user_id, timestamp DESC);

-- 5. ATMOSPHERE PRESETS
CREATE TABLE IF NOT EXISTS public.atmosphere_presets (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  atmosphere_id TEXT NOT NULL,
  sound_mixer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.atmosphere_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presets"
  ON public.atmosphere_presets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_atmosphere_presets_user ON public.atmosphere_presets(user_id);
