-- ==============================================================================
-- STUDY GROUPS DATABASE MIGRATION & RLS POLICIES (STUDYLUNO)
-- Migration Timestamp: 20261003220800
-- ==============================================================================
-- Non-destructive & completely idempotent (zero DROP/TRUNCATE/DELETE statements).
-- Safe for execution in Supabase SQL Editor and production databases.
-- ==============================================================================

-- 1. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2 AND char_length(name) <= 50),
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 10 CHECK (max_members >= 2 AND max_members <= 100),
  is_discoverable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_groups_owner ON public.groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_discoverable ON public.groups(is_discoverable);

-- 2. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_group_member_unique UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- 3. GROUP GOALS TABLE
CREATE TABLE IF NOT EXISTS public.group_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_minutes INTEGER NOT NULL CHECK (target_minutes >= 1),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.group_goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_goals_group ON public.group_goals(group_id);

-- 4. GROUP ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.group_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('member_joined', 'member_left', 'focus_completed', 'goal_completed', 'goal_created')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.group_activity ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_activity_group_time ON public.group_activity(group_id, created_at DESC);

-- 5. GROUP INVITES TABLE
CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_not_self_group_invite CHECK (inviter_id != invitee_id)
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_invites_invitee ON public.group_invites(invitee_id, status);

-- 6. FOCUS SESSIONS EXTENSION (group_id reference)
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_group ON public.focus_sessions(group_id);

-- ==============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (Prevent RLS Recursion & Search Path Hijacking)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_group_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner_or_admin(p_group_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_group_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_group_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner_or_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(UUID, UUID) TO authenticated;

-- ==============================================================================
-- AUTOMATIC GROUP OWNER MEMBERSHIP TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_group_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', timezone('utc'::text, now()))
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_group_created_add_owner'
  ) THEN
    CREATE TRIGGER on_group_created_add_owner
      AFTER INSERT ON public.groups
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_group_owner();
  END IF;
END $$;

-- ==============================================================================
-- IDEMPOTENT RLS POLICIES FOR STUDY GROUPS (ZERO DROP STATEMENTS)
-- ==============================================================================

-- 1. GROUPS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Users can view groups they belong to or public groups'
  ) THEN
    CREATE POLICY "Users can view groups they belong to or public groups"
      ON public.groups FOR SELECT TO authenticated
      USING (
        is_discoverable = TRUE
        OR owner_id = auth.uid()
        OR public.is_group_member(id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Users can create groups'
  ) THEN
    CREATE POLICY "Users can create groups"
      ON public.groups FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Owners and admins can update their group'
  ) THEN
    CREATE POLICY "Owners and admins can update their group"
      ON public.groups FOR UPDATE TO authenticated
      USING (public.is_group_owner_or_admin(id, auth.uid()))
      WITH CHECK (public.is_group_owner_or_admin(id, auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Owners can delete their group'
  ) THEN
    CREATE POLICY "Owners can delete their group"
      ON public.groups FOR DELETE TO authenticated
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- 2. GROUP MEMBERS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'Users can view members of accessible groups'
  ) THEN
    CREATE POLICY "Users can view members of accessible groups"
      ON public.group_members FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR public.is_group_member(group_id, auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = public.group_members.group_id AND g.is_discoverable = TRUE
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'Users can join public groups or be added'
  ) THEN
    CREATE POLICY "Users can join public groups or be added"
      ON public.group_members FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        OR public.is_group_owner_or_admin(group_id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'Admins and owners can update roles'
  ) THEN
    CREATE POLICY "Admins and owners can update roles"
      ON public.group_members FOR UPDATE TO authenticated
      USING (public.is_group_owner_or_admin(group_id, auth.uid()))
      WITH CHECK (public.is_group_owner_or_admin(group_id, auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'Users can leave or admins can remove members'
  ) THEN
    CREATE POLICY "Users can leave or admins can remove members"
      ON public.group_members FOR DELETE TO authenticated
      USING (
        auth.uid() = user_id
        OR public.is_group_owner_or_admin(group_id, auth.uid())
      );
  END IF;
END $$;

-- 3. GROUP GOALS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_goals' AND policyname = 'Group members can view goals'
  ) THEN
    CREATE POLICY "Group members can view goals"
      ON public.group_goals FOR SELECT TO authenticated
      USING (
        public.is_group_member(group_id, auth.uid())
        OR public.is_group_owner(group_id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_goals' AND policyname = 'Owners and admins can manage goals'
  ) THEN
    CREATE POLICY "Owners and admins can manage goals"
      ON public.group_goals FOR ALL TO authenticated
      USING (public.is_group_owner_or_admin(group_id, auth.uid()))
      WITH CHECK (public.is_group_owner_or_admin(group_id, auth.uid()));
  END IF;
END $$;

-- 4. GROUP ACTIVITY POLICIES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_activity' AND policyname = 'Group members can view activity'
  ) THEN
    CREATE POLICY "Group members can view activity"
      ON public.group_activity FOR SELECT TO authenticated
      USING (
        public.is_group_member(group_id, auth.uid())
        OR public.is_group_owner(group_id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_activity' AND policyname = 'Group members can insert activity'
  ) THEN
    CREATE POLICY "Group members can insert activity"
      ON public.group_activity FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        AND (
          public.is_group_member(group_id, auth.uid())
          OR public.is_group_owner(group_id, auth.uid())
        )
      );
  END IF;
END $$;

-- 5. GROUP INVITES POLICIES
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_invites' AND policyname = 'Users can view their group invites'
  ) THEN
    CREATE POLICY "Users can view their group invites"
      ON public.group_invites FOR SELECT TO authenticated
      USING (
        auth.uid() = inviter_id
        OR auth.uid() = invitee_id
        OR public.is_group_owner_or_admin(group_id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_invites' AND policyname = 'Group members can create invites'
  ) THEN
    CREATE POLICY "Group members can create invites"
      ON public.group_invites FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = inviter_id
        AND (
          public.is_group_member(group_id, auth.uid())
          OR public.is_group_owner(group_id, auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_invites' AND policyname = 'Invitees can update invite status'
  ) THEN
    CREATE POLICY "Invitees can update invite status"
      ON public.group_invites FOR UPDATE TO authenticated
      USING (auth.uid() = invitee_id)
      WITH CHECK (auth.uid() = invitee_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_invites' AND policyname = 'Users can delete relevant invites'
  ) THEN
    CREATE POLICY "Users can delete relevant invites"
      ON public.group_invites FOR DELETE TO authenticated
      USING (
        auth.uid() = inviter_id
        OR auth.uid() = invitee_id
        OR public.is_group_owner_or_admin(group_id, auth.uid())
      );
  END IF;
END $$;

-- Table Grants
GRANT ALL ON TABLE public.groups TO authenticated;
GRANT ALL ON TABLE public.group_members TO authenticated;
GRANT ALL ON TABLE public.group_goals TO authenticated;
GRANT ALL ON TABLE public.group_activity TO authenticated;
GRANT ALL ON TABLE public.group_invites TO authenticated;

-- ==============================================================================
-- PUBLIC PROFILE STATS FUNCTION (SECURITY DEFINER with safe search_path)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_public_stats(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_mins INT := 0;
  week_mins INT := 0;
  month_mins INT := 0;
  total_mins INT := 0;
  total_sessions_count INT := 0;
  last_active TIMESTAMP WITH TIME ZONE;
  last_session_dur INT := 0;
  active_days_count INT := 1;
  daily_avg INT := 0;
  nick TEXT;
  disp TEXT;
  avatar TEXT;
  joined_date TIMESTAMP WITH TIME ZONE;
  daily_hist JSONB := '[]'::jsonb;
  recent_acts JSONB := '[]'::jsonb;
BEGIN
  SELECT nickname, display_name, avatar_url, created_at
  INTO nick, disp, avatar, joined_date
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Aggregated Focus Metrics
  SELECT
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('day', now()) AND mode = 'pomodoro' THEN COALESCE(duration_minutes, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('week', now()) AND mode = 'pomodoro' THEN COALESCE(duration_minutes, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('month', now()) AND mode = 'pomodoro' THEN COALESCE(duration_minutes, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN mode = 'pomodoro' THEN COALESCE(duration_minutes, 0) ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN mode = 'pomodoro' AND completed = TRUE THEN 1 END), 0),
    MAX(timestamp),
    COALESCE(COUNT(DISTINCT date_trunc('day', timestamp)), 1)
  INTO today_mins, week_mins, month_mins, total_mins, total_sessions_count, last_active, active_days_count
  FROM public.focus_sessions
  WHERE user_id = target_user_id;

  IF active_days_count < 1 THEN
    active_days_count := 1;
  END IF;
  daily_avg := ROUND(total_mins::numeric / active_days_count::numeric);

  -- Last completed session duration
  SELECT COALESCE(duration_minutes, 0)
  INTO last_session_dur
  FROM public.focus_sessions
  WHERE user_id = target_user_id AND mode = 'pomodoro' AND completed = TRUE
  ORDER BY timestamp DESC
  LIMIT 1;

  -- 30-Day Activity Heatmap Data
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'minutes', COALESCE(SUM(fs.duration_minutes), 0)
    )
  )
  INTO daily_hist
  FROM (
    SELECT generate_series(
      date_trunc('day', now() - interval '29 days'),
      date_trunc('day', now()),
      interval '1 day'
    )::date AS day
  ) d
  LEFT JOIN public.focus_sessions fs
    ON fs.user_id = target_user_id
   AND fs.mode = 'pomodoro'
   AND (fs.timestamp AT TIME ZONE 'UTC')::date = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;

  -- Recent Activities
  SELECT jsonb_agg(act)
  INTO recent_acts
  FROM (
    SELECT jsonb_build_object(
      'id', id::text,
      'type', 'focus_completed',
      'description', 'Completed ' || COALESCE(duration_minutes, 25) || ' minute focus session',
      'timestamp', extract(epoch from timestamp) * 1000
    ) AS act
    FROM public.focus_sessions
    WHERE user_id = target_user_id AND mode = 'pomodoro' AND completed = TRUE
    ORDER BY timestamp DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'userId', target_user_id,
    'nickname', nick,
    'displayName', disp,
    'avatarUrl', avatar,
    'joinedAt', joined_date,
    'todayMinutes', today_mins,
    'weekMinutes', week_mins,
    'monthMinutes', month_mins,
    'totalMinutes', total_mins,
    'totalSessions', total_sessions_count,
    'dailyAverageMinutes', daily_avg,
    'lastActiveAt', last_active,
    'lastSessionMinutes', last_session_dur,
    'dailyHistory', COALESCE(daily_hist, '[]'::jsonb),
    'recentActivities', COALESCE(recent_acts, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_public_stats(UUID) TO anon, authenticated;
