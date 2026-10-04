-- Migration: 20261004155000_fix_social_profile_and_stats.sql
-- Description: Fix profile visibility RLS, is_friend_with helper function, and get_user_public_stats aggregated metrics calculation.

-- 1. Helper Function: is_friend_with
CREATE OR REPLACE FUNCTION public.is_friend_with(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_a IS NULL OR p_user_b IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = p_user_a AND addressee_id = p_user_b)
        OR (requester_id = p_user_b AND addressee_id = p_user_a))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_friend_with(UUID, UUID) TO authenticated;

-- 2. Helper Function: is_group_member (includes owner check)
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
  ) OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;

-- 3. Helper Function: can_view_profile
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id UUID, p_viewer_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_viewer_id IS NULL OR p_target_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_viewer_id = p_target_id THEN
    RETURN TRUE;
  END IF;

  IF public.is_friend_with(p_viewer_id, p_target_id) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members m1
    JOIN public.group_members m2 ON m1.group_id = m2.group_id
    WHERE m1.user_id = p_viewer_id AND m2.user_id = p_target_id
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.group_members gm ON g.id = gm.group_id
    WHERE (g.owner_id = p_target_id AND gm.user_id = p_viewer_id)
       OR (g.owner_id = p_viewer_id AND gm.user_id = p_target_id)
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_invites gi
    WHERE (gi.inviter_id = p_target_id AND gi.invitee_id = p_viewer_id)
       OR (gi.invitee_id = p_target_id AND gi.inviter_id = p_viewer_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_profile(UUID, UUID) TO authenticated;

-- 4. Update Profiles RLS Policy
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view profiles of fellow group members'
  ) THEN
    DROP POLICY "Users can view profiles of fellow group members" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view their own profile and connected friends'
  ) THEN
    DROP POLICY "Users can view their own profile and connected friends" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view connected profiles'
  ) THEN
    DROP POLICY "Users can view connected profiles" ON public.profiles;
  END IF;

  CREATE POLICY "Users can view connected profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING (public.can_view_profile(id, auth.uid()));
END $$;

-- 5. Update Focus Sessions RLS Policy
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'focus_sessions' AND policyname = 'Friends and group members can view focus sessions'
  ) THEN
    DROP POLICY "Friends and group members can view focus sessions" ON public.focus_sessions;
  END IF;

  CREATE POLICY "Friends and group members can view focus sessions"
    ON public.focus_sessions FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id
      OR public.is_friend_with(auth.uid(), user_id)
      OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    );
END $$;

-- 6. Update get_user_public_stats RPC function
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
  -- 1. Fetch Profile info
  SELECT nickname, display_name, avatar_url, created_at
  INTO nick, disp, avatar, joined_date
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- 2. Aggregated Focus Metrics (Support both pomodoro & stopwatch, and actual_duration_seconds fallback)
  SELECT
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('day', now()) AND (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL) THEN GREATEST(COALESCE(duration_minutes, 0), ROUND(COALESCE(actual_duration_seconds, 0) / 60)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('week', now()) AND (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL) THEN GREATEST(COALESCE(duration_minutes, 0), ROUND(COALESCE(actual_duration_seconds, 0) / 60)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN timestamp >= date_trunc('month', now()) AND (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL) THEN GREATEST(COALESCE(duration_minutes, 0), ROUND(COALESCE(actual_duration_seconds, 0) / 60)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL) THEN GREATEST(COALESCE(duration_minutes, 0), ROUND(COALESCE(actual_duration_seconds, 0) / 60)) ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL) THEN 1 END), 0),
    MAX(timestamp),
    COALESCE(COUNT(DISTINCT date_trunc('day', timestamp)), 1)
  INTO today_mins, week_mins, month_mins, total_mins, total_sessions_count, last_active, active_days_count
  FROM public.focus_sessions
  WHERE user_id = target_user_id;

  IF active_days_count < 1 THEN
    active_days_count := 1;
  END IF;
  daily_avg := ROUND(total_mins::numeric / active_days_count::numeric);

  -- 3. Last completed session duration
  SELECT GREATEST(COALESCE(duration_minutes, 0), ROUND(COALESCE(actual_duration_seconds, 0) / 60))
  INTO last_session_dur
  FROM public.focus_sessions
  WHERE user_id = target_user_id AND (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL)
  ORDER BY timestamp DESC
  LIMIT 1;

  -- 4. 30-Day Activity Heatmap Data
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'minutes', COALESCE(SUM(GREATEST(COALESCE(fs.duration_minutes, 0), ROUND(COALESCE(fs.actual_duration_seconds, 0) / 60))), 0)
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
   AND (fs.mode = 'pomodoro' OR fs.mode = 'stopwatch' OR fs.mode = 'focus')
   AND (fs.completed = TRUE OR fs.completed IS NULL)
   AND (fs.timestamp AT TIME ZONE 'UTC')::date = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;

  -- 5. Recent Activities
  SELECT jsonb_agg(act)
  INTO recent_acts
  FROM (
    SELECT jsonb_build_object(
      'id', id::text,
      'type', 'focus_completed',
      'description', 'Completed ' || GREATEST(COALESCE(duration_minutes, 25), ROUND(COALESCE(actual_duration_seconds, 0) / 60)) || ' minute session',
      'timestamp', extract(epoch from timestamp) * 1000
    ) AS act
    FROM public.focus_sessions
    WHERE user_id = target_user_id AND (mode = 'pomodoro' OR mode = 'stopwatch' OR mode = 'focus') AND (completed = TRUE OR completed IS NULL)
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
    'lastSessionMinutes', COALESCE(last_session_dur, 0),
    'dailyHistory', COALESCE(daily_hist, '[]'::jsonb),
    'recentActivities', COALESCE(recent_acts, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_public_stats(UUID) TO anon, authenticated;
