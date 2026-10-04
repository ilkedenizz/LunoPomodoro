-- Migration: 20261004141500_fix_group_join_rls.sql
-- Description: Ensure users can view invited private groups and join study groups securely via RPC and RLS policies.

-- 1. Update Groups SELECT policy to include pending invites check
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
      OR EXISTS (
        SELECT 1 FROM public.group_invites gi
        WHERE gi.group_id = public.groups.id AND gi.invitee_id = auth.uid() AND gi.status = 'pending'
      )
    );
END $$;

-- 2. Create join_study_group SECURITY DEFINER RPC function for atomic, secure group joining
CREATE OR REPLACE FUNCTION public.join_study_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_max INT := 10;
  v_count INT := 0;
  v_group_exists BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  -- Check group existence and max capacity
  SELECT EXISTS(SELECT 1 FROM public.groups WHERE id = p_group_id), COALESCE(max_members, 10)
  INTO v_group_exists, v_max
  FROM public.groups
  WHERE id = p_group_id;

  IF NOT v_group_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found.');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.group_members
  WHERE group_id = p_group_id;

  IF v_count >= v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'This group has reached its maximum member capacity.');
  END IF;

  -- Insert member row
  INSERT INTO public.group_members (group_id, user_id, role, joined_at)
  VALUES (p_group_id, v_uid, 'member', now())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Update any pending invite for this user
  UPDATE public.group_invites
  SET status = 'accepted', updated_at = now()
  WHERE group_id = p_group_id AND invitee_id = v_uid AND status = 'pending';

  -- Log member joined activity
  INSERT INTO public.group_activity (group_id, user_id, activity_type, created_at)
  VALUES (p_group_id, v_uid, 'member_joined', now());

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_study_group(UUID) TO authenticated;
