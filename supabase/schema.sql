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

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

DO $$ BEGIN
  CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles
    FOR SELECT
    USING (true);
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

-- Atomic profile update function for authenticated users
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_nickname TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_clean_nick TEXT;
  v_clean_display TEXT;
  v_result RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate and clean nickname if provided
  IF p_nickname IS NOT NULL AND trim(p_nickname) != '' THEN
    v_clean_nick := lower(trim(p_nickname));
    IF char_length(v_clean_nick) < 3 OR char_length(v_clean_nick) > 20 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nickname must be between 3 and 20 characters.');
    END IF;
    IF v_clean_nick !~ '^[a-zA-Z0-9_]{3,20}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nickname can only contain letters, numbers, and underscores.');
    END IF;

    -- Check uniqueness against existing profiles
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(nickname) = v_clean_nick AND id != v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This nickname is already taken.');
    END IF;
  END IF;

  -- Upsert profile row
  INSERT INTO public.profiles (id, nickname, display_name, avatar_url, updated_at)
  VALUES (
    v_user_id,
    COALESCE(v_clean_nick, 'user_' || substring(v_user_id::text from 1 for 6)),
    NULLIF(trim(p_display_name), ''),
    NULLIF(p_avatar_url, ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    nickname = COALESCE(v_clean_nick, public.profiles.nickname),
    display_name = CASE WHEN p_display_name IS NOT NULL THEN NULLIF(trim(p_display_name), '') ELSE public.profiles.display_name END,
    avatar_url = CASE WHEN p_avatar_url IS NOT NULL THEN NULLIF(p_avatar_url, '') ELSE public.profiles.avatar_url END,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'profile', jsonb_build_object(
      'id', v_result.id,
      'nickname', v_result.nickname,
      'display_name', v_result.display_name,
      'avatar_url', v_result.avatar_url
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER & BACKFILL FOR AUTH USERS
-- ==============================================================================
-- Automatically creates a public.profiles entry whenever a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_nickname TEXT;
  base_nickname TEXT;
  final_nickname TEXT;
  extracted_display_name TEXT;
  extracted_avatar_url TEXT;
  counter INT := 0;
  suffix TEXT;
BEGIN
  -- 1. Extract nickname from metadata or fallback to email prefix
  extracted_nickname := NULLIF(TRIM(NEW.raw_user_meta_data->>'nickname'), '');
  extracted_display_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  )), '');
  extracted_avatar_url := NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '');

  IF extracted_nickname IS NOT NULL THEN
    base_nickname := regexp_replace(extracted_nickname, '[^a-zA-Z0-9_]', '', 'g');
  ELSE
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
      base_nickname := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
    ELSE
      base_nickname := 'user';
    END IF;
  END IF;

  -- Ensure minimum 3 characters
  IF length(base_nickname) < 3 THEN
    base_nickname := rpad(base_nickname, 3, '0');
  END IF;

  -- Trim to max 15 chars so we have room for suffix if collisions occur (max length is 20)
  IF length(base_nickname) > 15 THEN
    base_nickname := substring(base_nickname from 1 for 15);
  END IF;

  final_nickname := base_nickname;

  -- Ensure nickname uniqueness against existing profiles (case-insensitive)
  WHILE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(nickname) = lower(final_nickname) 
      AND id != NEW.id
  ) LOOP
    counter := counter + 1;
    suffix := counter::text;
    final_nickname := substring(base_nickname from 1 for (20 - length(suffix) - 1)) || '_' || suffix;
  END LOOP;

  -- Default display name if none provided
  IF extracted_display_name IS NULL THEN
    extracted_display_name := final_nickname;
  END IF;

  -- Insert profile if not exists
  INSERT INTO public.profiles (id, nickname, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    final_nickname,
    extracted_display_name,
    extracted_avatar_url,
    COALESCE(NEW.created_at, timezone('utc'::text, now())),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Do not block auth signup if an unexpected error occurs
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Idempotent trigger binding on auth.users (zero DROP statements)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Safe backfill for all existing auth.users without a profiles entry
DO $$
DECLARE
  u RECORD;
  raw_nick TEXT;
  base_nick TEXT;
  candidate_nick TEXT;
  disp_name TEXT;
  avatar_val TEXT;
  c INT;
  sfx TEXT;
BEGIN
  FOR u IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    raw_nick := NULLIF(TRIM(u.raw_user_meta_data->>'nickname'), '');
    disp_name := NULLIF(TRIM(COALESCE(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name'
    )), '');
    avatar_val := NULLIF(TRIM(u.raw_user_meta_data->>'avatar_url'), '');

    IF raw_nick IS NOT NULL THEN
      base_nick := regexp_replace(raw_nick, '[^a-zA-Z0-9_]', '', 'g');
    ELSE
      IF u.email IS NOT NULL AND u.email != '' THEN
        base_nick := regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
      ELSE
        base_nick := 'user';
      END IF;
    END IF;

    IF length(base_nick) < 3 THEN
      base_nick := rpad(base_nick, 3, '0');
    END IF;

    IF length(base_nick) > 15 THEN
      base_nick := substring(base_nick from 1 for 15);
    END IF;

    candidate_nick := base_nick;
    c := 0;

    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE lower(nickname) = lower(candidate_nick) 
        AND id != u.id
    ) LOOP
      c := c + 1;
      sfx := c::text;
      candidate_nick := substring(base_nick from 1 for (20 - length(sfx) - 1)) || '_' || sfx;
    END LOOP;

    IF disp_name IS NULL THEN
      disp_name := candidate_nick;
    END IF;

    INSERT INTO public.profiles (id, nickname, display_name, avatar_url, created_at, updated_at)
    VALUES (
      u.id,
      candidate_nick,
      disp_name,
      avatar_val,
      COALESCE(u.created_at, timezone('utc'::text, now())),
      timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

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

-- Table privileges on friendships for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.friendships TO authenticated;

-- Atomic send friend request function (avoids permission issues and ensures idempotency)
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  existing_record RECORD;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to add friends.');
  END IF;

  IF current_user_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot send a friend request to yourself.');
  END IF;

  -- Check existing friendship record between these two users
  SELECT * INTO existing_record
  FROM public.friendships
  WHERE (requester_id = current_user_id AND addressee_id = target_user_id)
     OR (requester_id = target_user_id AND addressee_id = current_user_id)
  LIMIT 1;

  IF FOUND THEN
    IF existing_record.status = 'accepted' THEN
      RETURN jsonb_build_object('success', true, 'message', 'You are already friends!', 'status', 'already_friends');
    ELSIF existing_record.status = 'pending' THEN
      IF existing_record.requester_id = current_user_id THEN
        RETURN jsonb_build_object('success', true, 'message', 'Friend request already sent.', 'status', 'already_requested');
      ELSE
        -- Mutual request: Automatically accept the incoming pending request
        UPDATE public.friendships
        SET status = 'accepted', updated_at = timezone('utc'::text, now())
        WHERE id = existing_record.id;
        RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted!', 'status', 'accepted');
      END IF;
    ELSE
      -- Previously rejected: re-open as pending
      UPDATE public.friendships
      SET requester_id = current_user_id,
          addressee_id = target_user_id,
          status = 'pending',
          updated_at = timezone('utc'::text, now())
      WHERE id = existing_record.id;
      RETURN jsonb_build_object('success', true, 'message', 'Friend request sent!', 'status', 'sent');
    END IF;
  END IF;

  -- Insert new friendship
  INSERT INTO public.friendships (requester_id, addressee_id, status, created_at, updated_at)
  VALUES (current_user_id, target_user_id, 'pending', timezone('utc'::text, now()), timezone('utc'::text, now()));

  RETURN jsonb_build_object('success', true, 'message', 'Friend request sent!', 'status', 'sent');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_by_nickname(TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incoming_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outgoing_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;


