-- Migration: 20261004153000_fix_group_members_profile_access.sql
-- Description: Allow authenticated users to view profiles of fellow group members, group owners, and connected invitees securely.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view profiles of fellow group members'
  ) THEN
    DROP POLICY "Users can view profiles of fellow group members" ON public.profiles;
  END IF;

  CREATE POLICY "Users can view profiles of fellow group members"
    ON public.profiles FOR SELECT TO authenticated
    USING (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.requester_id = auth.uid() AND f.addressee_id = public.profiles.id)
           OR (f.addressee_id = auth.uid() AND f.requester_id = public.profiles.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.group_members m1
        JOIN public.group_members m2 ON m1.group_id = m2.group_id
        WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id
      )
      OR EXISTS (
        SELECT 1 FROM public.groups g
        JOIN public.group_members gm ON g.id = gm.group_id
        WHERE (g.owner_id = public.profiles.id AND gm.user_id = auth.uid())
           OR (g.owner_id = auth.uid() AND gm.user_id = public.profiles.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.group_invites gi
        WHERE (gi.inviter_id = public.profiles.id AND gi.invitee_id = auth.uid())
           OR (gi.invitee_id = public.profiles.id AND gi.inviter_id = auth.uid())
      )
    );
END $$;
