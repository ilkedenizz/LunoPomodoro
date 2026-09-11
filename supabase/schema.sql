-- ==============================================================================
-- LUNO (STUDYLUNO) — SUPABASE DATABASE SCHEMA & ROW-LEVEL SECURITY (RLS)
-- ==============================================================================
-- Run this script in your Supabase project's SQL Editor to set up all tables,
-- RLS policies, indexes, and profile/nickname support.
-- 
-- Non-destructive & completely idempotent (zero DROP statements, safe to re-run).
-- ==============================================================================

-- 0. USER PROFILES (UNIQUE NICKNAME / USERNAME & AVATAR)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_nickname_length CHECK (char_length(nickname) >= 3 AND char_length(nickname) <= 20),
  CONSTRAINT check_nickname_format CHECK (nickname ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- Ensure avatar_url column exists for existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_lower ON public.profiles(lower(nickname));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own profile"
    ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.check_nickname_available(username text, exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF exclude_user_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(nickname) = lower(trim(username))
        AND id != exclude_user_id
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(nickname) = lower(trim(username))
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_nickname_available(text, uuid) TO anon, authenticated;

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

DO $$ BEGIN
  CREATE POLICY "Users can manage their own settings"
    ON public.user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

-- 2. DAILY GOALS
CREATE TABLE IF NOT EXISTS public.daily_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_pomodoros INTEGER NOT NULL DEFAULT 4 CHECK (target_pomodoros >= 1 AND target_pomodoros <= 50),
  target_minutes INTEGER NOT NULL DEFAULT 100 CHECK (target_minutes >= 1 AND target_minutes <= 1440),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own daily goal"
    ON public.daily_goals
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

DO $$ BEGIN
  CREATE POLICY "Users can manage their own tasks"
    ON public.tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

DO $$ BEGIN
  CREATE POLICY "Users can manage their own focus sessions"
    ON public.focus_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

DO $$ BEGIN
  CREATE POLICY "Users can manage their own presets"
    ON public.atmosphere_presets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_atmosphere_presets_user ON public.atmosphere_presets(user_id);

-- 6. SUPABASE STORAGE: AVATARS BUCKET & RLS POLICIES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/pjpeg', 'image/x-png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (
        auth.uid()::text = split_part(name, '/', 1)
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (
        auth.uid()::text = split_part(name, '/', 1)
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    )
    WITH CHECK (
      bucket_id = 'avatars'
      AND (
        auth.uid()::text = split_part(name, '/', 1)
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (
        auth.uid()::text = split_part(name, '/', 1)
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. FRIENDSHIPS (USER CONNECTIONS & FRIEND REQUESTS)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_not_self_friendship CHECK (requester_id != addressee_id)
);

-- Unique index preventing duplicate pairs between any two users in either direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view friendships they are part of"
    ON public.friendships
    FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can send friend requests"
    ON public.friendships
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id AND requester_id != addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update friendships they are part of"
    ON public.friendships
    FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can remove friendships they are part of"
    ON public.friendships
    FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. SECURE FRIENDSHIP RPC FUNCTIONS

-- Search public profiles by nickname or display name (safe, only public fields)
CREATE OR REPLACE FUNCTION public.search_profiles_by_nickname(
  search_term TEXT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(search_term) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nickname,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE
    (auth.uid() IS NULL OR p.id != auth.uid())
    AND (
      lower(p.nickname) LIKE '%' || lower(trim(search_term)) || '%'
      OR (p.display_name IS NOT NULL AND lower(p.display_name) LIKE '%' || lower(trim(search_term)) || '%')
    )
  ORDER BY
    CASE WHEN lower(p.nickname) = lower(trim(search_term)) THEN 0 ELSE 1 END,
    p.nickname ASC
  LIMIT LEAST(limit_count, 20);
END;
$$;

-- Get all accepted friends with profile data for the calling user
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  friendship_id UUID,
  friend_id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  since TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id AS friendship_id,
    p.id AS friend_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    f.updated_at AS since
  FROM public.friendships f
  JOIN public.profiles p ON p.id = (
    CASE
      WHEN f.requester_id = auth.uid() THEN f.addressee_id
      ELSE f.requester_id
    END
  )
  WHERE
    (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND f.status = 'accepted'
  ORDER BY p.nickname ASC;
END;
$$;

-- Get incoming pending requests for the calling user
CREATE OR REPLACE FUNCTION public.get_incoming_friend_requests()
RETURNS TABLE (
  friendship_id UUID,
  requester_id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id AS friendship_id,
    p.id AS requester_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.requester_id
  WHERE
    f.addressee_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$;

-- Get outgoing pending requests for the calling user
CREATE OR REPLACE FUNCTION public.get_outgoing_friend_requests()
RETURNS TABLE (
  friendship_id UUID,
  addressee_id UUID,
  nickname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id AS friendship_id,
    p.id AS addressee_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.addressee_id
  WHERE
    f.requester_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_by_nickname(TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incoming_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outgoing_friend_requests() TO authenticated;

