-- Migration: 20261004140000_fix_social_data_access.sql
-- Description: Ensure members can view joined private/public groups and friends can view public focus stats securely.

-- 1. GROUPS RLS POLICY: ALLOW MEMBERS TO SELECT JOINED GROUPS
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Users can view groups they belong to or public groups'
  ) THEN
    DROP POLICY "Users can view groups they belong to or public groups" ON public.groups;
  END IF;

  CREATE POLICY "Users can view groups they belong to or public groups"
    ON public.groups FOR SELECT TO authenticated
    USING (
      is_discoverable = TRUE
      OR owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = public.groups.id AND gm.user_id = auth.uid()
      )
      OR public.is_group_member(id, auth.uid())
    );
END $$;

-- 2. FOCUS_SESSIONS RLS POLICY: ALLOW FRIENDS AND GROUP MEMBERS TO READ FOCUS METRICS SECURELY
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'focus_sessions' AND policyname = 'Users can manage their own focus sessions'
  ) THEN
    DROP POLICY "Users can manage their own focus sessions" ON public.focus_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'focus_sessions' AND policyname = 'Users can manage their focus sessions'
  ) THEN
    CREATE POLICY "Users can manage their focus sessions"
      ON public.focus_sessions FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'focus_sessions' AND policyname = 'Friends and group members can view focus sessions'
  ) THEN
    CREATE POLICY "Friends and group members can view focus sessions"
      ON public.focus_sessions FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id
        OR public.is_friend_with(auth.uid(), user_id)
        OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
      );
  END IF;
END $$;

-- 3. GET_USER_PUBLIC_STATS SECURITY DEFINER FUNCTION UPDATE
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
    COALESCE(COUNT(CASE WHEN mode = 'pomodoro' AND (completed = TRUE OR completed IS NULL) THEN 1 END), 0),
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
  WHERE user_id = target_user_id AND mode = 'pomodoro' AND (completed = TRUE OR completed IS NULL)
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
    WHERE user_id = target_user_id AND mode = 'pomodoro' AND (completed = TRUE OR completed IS NULL)
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
