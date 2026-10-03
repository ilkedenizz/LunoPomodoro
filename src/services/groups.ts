import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type {
  StudyGroup,
  GroupMember,
  GroupGoal,
  GroupActivity,
  GroupInvite,
  GroupRole,
  FocusSession,
} from '../types';
import { getStartOfWeek } from '../utils/dates';

const LOCAL_GROUPS_KEY = 'luno_study_groups_v1';
const LOCAL_MEMBERS_KEY = 'luno_group_members_v1';
const LOCAL_GOALS_KEY = 'luno_group_goals_v1';
const LOCAL_ACTIVITIES_KEY = 'luno_group_activity_v1';
const LOCAL_INVITES_KEY = 'luno_group_invites_v1';

export interface GroupServiceResponse<T = void> {
  data?: T;
  error?: string | null;
  message?: string;
}

const safeParseTimestamp = (val: any): number => {
  if (!val) return Date.now();
  const num = typeof val === 'number' ? val : new Date(val).getTime();
  return isNaN(num) ? Date.now() : num;
};

// --- LOCAL STORAGE HELPERS FOR GUEST / OFFLINE FALLBACK ---

const loadLocal = <T>(key: string, fallback: T[] = []): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

// --- SERVICE HELPER FOR AUTH RESOLUTION ---

export const getEffectiveUserId = async (passedId?: string): Promise<string | null> => {
  if (passedId) return passedId;
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

export const getUserStudyGroups = async (userId?: string): Promise<StudyGroup[]> => {
  const effectiveId = await getEffectiveUserId(userId);
  if (!isSupabaseConfigured() || !effectiveId) {
    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY);
    const currentId = effectiveId || 'guest_user';
    const myGroupIds = new Set(localMembers.filter((m) => m.userId === currentId).map((m) => m.groupId));
    return localGroups.filter((g) => myGroupIds.has(g.id) || g.ownerId === currentId);
  }

  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // Fetch group memberships for calling user
    const { data: memberRows, error: memberErr } = await client
      .from('group_members')
      .select('group_id, role, joined_at')
      .eq('user_id', effectiveId);

    if (memberErr || !memberRows || memberRows.length === 0) {
      return [];
    }

    const groupIds = memberRows.map((m: any) => m.group_id);
    const roleMap = new Map(memberRows.map((m: any) => [m.group_id, m.role as GroupRole]));

    // Fetch groups
    const { data: groupRows, error: groupErr } = await client
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (groupErr || !groupRows) return [];

    // Fetch counts and goals in parallel
    const startOfWeekISO = new Date(getStartOfWeek()).toISOString();
    const result: StudyGroup[] = [];

    for (const g of groupRows) {
      const { count: memberCount } = await client
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id);

      // Fetch weekly goals
      const { data: goalRows } = await client
        .from('group_goals')
        .select('*')
        .eq('group_id', g.id)
        .gte('end_date', startOfWeekISO)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch weekly focus sum from focus_sessions
      const { data: sessionRows } = await client
        .from('focus_sessions')
        .select('duration_minutes, actual_duration_seconds')
        .eq('group_id', g.id)
        .gte('timestamp', startOfWeekISO);

      let weeklyMins = 0;
      if (sessionRows && Array.isArray(sessionRows)) {
        weeklyMins = sessionRows.reduce((acc: number, s: any) => {
          if (typeof s.actual_duration_seconds === 'number' && s.actual_duration_seconds > 0) {
            return acc + Math.max(1, Math.round(s.actual_duration_seconds / 60));
          }
          return acc + (s.duration_minutes || 0);
        }, 0);
      }

      let currentGoal: GroupGoal | undefined = undefined;
      if (goalRows && goalRows.length > 0) {
        const goalData = goalRows[0];
        currentGoal = {
          id: goalData.id,
          groupId: goalData.group_id,
          title: goalData.title,
          targetMinutes: goalData.target_minutes,
          startDate: safeParseTimestamp(goalData.start_date),
          endDate: safeParseTimestamp(goalData.end_date),
          createdBy: goalData.created_by,
          createdAt: safeParseTimestamp(goalData.created_at),
          currentMinutes: weeklyMins,
          completed: weeklyMins >= goalData.target_minutes,
        };
      }

      result.push({
        id: g.id,
        name: g.name,
        description: g.description || undefined,
        avatarUrl: g.avatar_url || undefined,
        ownerId: g.owner_id,
        maxMembers: g.max_members || 10,
        isDiscoverable: g.is_discoverable !== false,
        createdAt: safeParseTimestamp(g.created_at),
        updatedAt: safeParseTimestamp(g.updated_at),
        memberCount: memberCount || 1,
        userRole: roleMap.get(g.id) || 'member',
        weeklyFocusMinutes: weeklyMins,
        currentGoal,
      });
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Groups getUserStudyGroups Error]:', err);
    }
    return [];
  }
};

export const getDiscoverableGroups = async (currentUserId?: string): Promise<StudyGroup[]> => {
  if (!isSupabaseConfigured()) {
    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY);
    const currentId = currentUserId || 'guest_user';
    const joinedIds = new Set(localMembers.filter((m) => m.userId === currentId).map((m) => m.groupId));
    return localGroups.filter((g) => g.isDiscoverable && !joinedIds.has(g.id));
  }

  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let joinedGroupIds: string[] = [];
    if (currentUserId) {
      const { data: memberRows } = await client
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId);
      if (memberRows) {
        joinedGroupIds = memberRows.map((m: any) => m.group_id);
      }
    }

    let query = client
      .from('groups')
      .select('*')
      .eq('is_discoverable', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (joinedGroupIds.length > 0) {
      query = query.not('id', 'in', `(${joinedGroupIds.join(',')})`);
    }

    const { data: groupRows, error } = await query;
    if (error || !groupRows) return [];

    const result: StudyGroup[] = [];
    for (const g of groupRows) {
      const { count: memberCount } = await client
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id);

      result.push({
        id: g.id,
        name: g.name,
        description: g.description || undefined,
        avatarUrl: g.avatar_url || undefined,
        ownerId: g.owner_id,
        maxMembers: g.max_members || 10,
        isDiscoverable: true,
        createdAt: safeParseTimestamp(g.created_at),
        updatedAt: safeParseTimestamp(g.updated_at),
        memberCount: memberCount || 1,
      });
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Groups getDiscoverableGroups Error]:', err);
    }
    return [];
  }
};

export const createStudyGroup = async (
  data: {
    name: string;
    description?: string;
    avatarUrl?: string;
    maxMembers?: number;
    isDiscoverable?: boolean;
  },
  userId?: string
): Promise<{ success: boolean; group?: StudyGroup; error?: string }> => {
  const nameClean = data.name.trim();
  if (!nameClean || nameClean.length < 2 || nameClean.length > 50) {
    return { success: false, error: 'Group name must be between 2 and 50 characters.' };
  }

  const maxM = Math.max(2, Math.min(100, data.maxMembers || 10));
  const effectiveUserId = await getEffectiveUserId(userId);

  if (!isSupabaseConfigured() || !effectiveUserId) {
    // Local / Guest Fallback
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentId = effectiveUserId || 'guest_user';
    const newGroup: StudyGroup = {
      id: groupId,
      name: nameClean,
      description: data.description?.trim() || undefined,
      avatarUrl: data.avatarUrl || 'book',
      ownerId: currentId,
      maxMembers: maxM,
      isDiscoverable: data.isDiscoverable !== false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memberCount: 1,
      userRole: 'owner',
      weeklyFocusMinutes: 0,
    };

    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    saveLocal(LOCAL_GROUPS_KEY, [newGroup, ...localGroups]);

    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY);
    saveLocal(LOCAL_MEMBERS_KEY, [
      {
        id: `m_${Date.now()}`,
        groupId,
        userId: currentId,
        role: 'owner',
        joinedAt: Date.now(),
        nickname: 'You',
      },
      ...localMembers,
    ]);

    const localActivities = loadLocal<GroupActivity>(LOCAL_ACTIVITIES_KEY);
    saveLocal(LOCAL_ACTIVITIES_KEY, [
      {
        id: `act_${Date.now()}`,
        groupId,
        userId: currentId,
        activityType: 'member_joined',
        metadata: { role: 'owner' },
        createdAt: Date.now(),
        userNickname: 'You',
      },
      ...localActivities,
    ]);

    return { success: true, group: newGroup };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud service unconfigured.' };

  try {
    // 1. Create Group
    const { data: groupRow, error: groupErr } = await client
      .from('groups')
      .insert({
        name: nameClean,
        description: data.description?.trim() || null,
        avatar_url: data.avatarUrl || 'book',
        owner_id: effectiveUserId,
        max_members: maxM,
        is_discoverable: data.isDiscoverable !== false,
      })
      .select()
      .single();

    if (groupErr || !groupRow) {
      if (import.meta.env.DEV) {
        console.error('[Luno createStudyGroup Group Error]:', groupErr);
      }
      return { success: false, error: groupErr?.message || 'Failed to create group.' };
    }

    const groupId = groupRow.id;

    // 2. Add Creator as Owner Member
    const { error: memberErr } = await client.from('group_members').insert({
      group_id: groupId,
      user_id: effectiveUserId,
      role: 'owner',
    });

    if (memberErr) {
      if (import.meta.env.DEV) console.error('[Luno createStudyGroup Member Error]:', memberErr);
    }

    // 3. Log Activity
    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: effectiveUserId,
      activity_type: 'member_joined',
      metadata: { role: 'owner' },
    });

    const newGroup: StudyGroup = {
      id: groupId,
      name: groupRow.name,
      description: groupRow.description || undefined,
      avatarUrl: groupRow.avatar_url || undefined,
      ownerId: effectiveUserId,
      maxMembers: groupRow.max_members,
      isDiscoverable: groupRow.is_discoverable,
      createdAt: safeParseTimestamp(groupRow.created_at),
      updatedAt: safeParseTimestamp(groupRow.updated_at),
      memberCount: 1,
      userRole: 'owner',
      weeklyFocusMinutes: 0,
    };

    return { success: true, group: newGroup };
  } catch (err: any) {
    if (import.meta.env.DEV) {
      console.error('[Luno createStudyGroup Exception]:', err);
    }
    return { success: false, error: err.message || 'Failed to create group.' };
  }
};

export const getGroupDetails = async (
  groupId: string,
  userId?: string
): Promise<{
  group: StudyGroup;
  members: GroupMember[];
  goals: GroupGoal[];
  activities: GroupActivity[];
  invites: GroupInvite[];
} | null> => {
  if (!isSupabaseConfigured() || !userId) {
    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    const group = localGroups.find((g) => g.id === groupId);
    if (!group) return null;

    const currentId = userId || 'guest_user';
    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY).filter((m) => m.groupId === groupId);
    const localGoals = loadLocal<GroupGoal>(LOCAL_GOALS_KEY).filter((g) => g.groupId === groupId);
    const localActivities = loadLocal<GroupActivity>(LOCAL_ACTIVITIES_KEY).filter((a) => a.groupId === groupId);
    const localInvites = loadLocal<GroupInvite>(LOCAL_INVITES_KEY).filter((i) => i.groupId === groupId);

    const userMem = localMembers.find((m) => m.userId === currentId);
    group.userRole = userMem ? userMem.role : undefined;
    group.memberCount = localMembers.length;

    return {
      group,
      members: localMembers,
      goals: localGoals,
      activities: localActivities,
      invites: localInvites,
    };
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Fetch Group
    const { data: g } = await client.from('groups').select('*').eq('id', groupId).single();
    if (!g) return null;

    const startOfWeekISO = new Date(getStartOfWeek()).toISOString();

    // 2. Fetch Members & Profiles
    const { data: memberRows } = await client.from('group_members').select('*').eq('group_id', groupId);
    const members: GroupMember[] = [];
    let userRole: GroupRole | undefined = undefined;

    if (memberRows && Array.isArray(memberRows)) {
      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profileRows } = await client
        .from('profiles')
        .select('id, nickname, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p]));

      // Fetch weekly focus per member in this group
      const { data: memberSessions } = await client
        .from('focus_sessions')
        .select('user_id, duration_minutes, actual_duration_seconds')
        .eq('group_id', groupId)
        .gte('timestamp', startOfWeekISO);

      const memberFocusMap = new Map<string, number>();
      if (memberSessions) {
        for (const s of memberSessions) {
          const mins =
            typeof s.actual_duration_seconds === 'number' && s.actual_duration_seconds > 0
              ? Math.max(1, Math.round(s.actual_duration_seconds / 60))
              : s.duration_minutes || 0;
          memberFocusMap.set(s.user_id, (memberFocusMap.get(s.user_id) || 0) + mins);
        }
      }

      for (const m of memberRows) {
        if (m.user_id === userId) {
          userRole = m.role as GroupRole;
        }
        const prof = profileMap.get(m.user_id);
        members.push({
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          role: m.role as GroupRole,
          joinedAt: safeParseTimestamp(m.joined_at),
          nickname: prof?.nickname || 'Study Buddy',
          displayName: prof?.display_name || undefined,
          avatarUrl: prof?.avatar_url || undefined,
          weeklyFocusMinutes: memberFocusMap.get(m.user_id) || 0,
        });
      }
    }

    // Sort members by weekly focus minutes descending for leaderboard
    members.sort((a, b) => (b.weeklyFocusMinutes || 0) - (a.weeklyFocusMinutes || 0));

    // Calculate total group weekly focus
    const totalWeeklyFocus = members.reduce((acc, m) => acc + (m.weeklyFocusMinutes || 0), 0);

    // 3. Fetch Goals
    const { data: goalRows } = await client
      .from('group_goals')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    const goals: GroupGoal[] = [];
    if (goalRows) {
      for (const goalData of goalRows) {
        goals.push({
          id: goalData.id,
          groupId: goalData.group_id,
          title: goalData.title,
          targetMinutes: goalData.target_minutes,
          startDate: safeParseTimestamp(goalData.start_date),
          endDate: safeParseTimestamp(goalData.end_date),
          createdBy: goalData.created_by,
          createdAt: safeParseTimestamp(goalData.created_at),
          currentMinutes: totalWeeklyFocus,
          completed: totalWeeklyFocus >= goalData.target_minutes,
        });
      }
    }

    // 4. Fetch Activity
    const { data: actRows } = await client
      .from('group_activity')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(30);

    const activities: GroupActivity[] = [];
    if (actRows && actRows.length > 0) {
      const actUserIds = Array.from(new Set(actRows.map((a: any) => a.user_id)));
      const { data: actProfiles } = await client
        .from('profiles')
        .select('id, nickname, display_name, avatar_url')
        .in('id', actUserIds);

      const actProfMap = new Map((actProfiles || []).map((p: any) => [p.id, p]));

      for (const a of actRows) {
        const prof = actProfMap.get(a.user_id);
        activities.push({
          id: a.id,
          groupId: a.group_id,
          userId: a.user_id,
          activityType: a.activity_type,
          metadata: a.metadata || {},
          createdAt: safeParseTimestamp(a.created_at),
          userNickname: prof?.nickname || 'Study Buddy',
          userDisplayName: prof?.display_name || undefined,
          userAvatarUrl: prof?.avatar_url || undefined,
        });
      }
    }

    // 5. Fetch Invites
    const { data: inviteRows } = await client
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'pending');

    const invites: GroupInvite[] = (inviteRows || []).map((i: any) => ({
      id: i.id,
      groupId: i.group_id,
      inviterId: i.inviter_id,
      inviteeId: i.invitee_id,
      status: i.status,
      createdAt: safeParseTimestamp(i.created_at),
    }));

    const currentGoal = goals.length > 0 ? goals[0] : undefined;

    const group: StudyGroup = {
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      avatarUrl: g.avatar_url || undefined,
      ownerId: g.owner_id,
      maxMembers: g.max_members || 10,
      isDiscoverable: g.is_discoverable !== false,
      createdAt: safeParseTimestamp(g.created_at),
      updatedAt: safeParseTimestamp(g.updated_at),
      memberCount: members.length,
      userRole,
      weeklyFocusMinutes: totalWeeklyFocus,
      currentGoal,
    };

    return { group, members, goals, activities, invites };
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Luno getGroupDetails Error]:', err);
    return null;
  }
};

export const joinStudyGroup = async (
  groupId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !userId) {
    const currentId = userId || 'guest_user';
    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY);
    if (localMembers.some((m) => m.groupId === groupId && m.userId === currentId)) {
      return { success: true };
    }
    saveLocal(LOCAL_MEMBERS_KEY, [
      ...localMembers,
      {
        id: `m_${Date.now()}`,
        groupId,
        userId: currentId,
        role: 'member',
        joinedAt: Date.now(),
        nickname: 'You',
      },
    ]);
    const localActivities = loadLocal<GroupActivity>(LOCAL_ACTIVITIES_KEY);
    saveLocal(LOCAL_ACTIVITIES_KEY, [
      {
        id: `act_${Date.now()}`,
        groupId,
        userId: currentId,
        activityType: 'member_joined',
        createdAt: Date.now(),
        userNickname: 'You',
      },
      ...localActivities,
    ]);
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud service unconfigured.' };

  try {
    // Check max members limit
    const { data: groupData } = await client.from('groups').select('max_members, is_discoverable').eq('id', groupId).single();
    if (!groupData) return { success: false, error: 'Group not found.' };

    const { count: memberCount } = await client
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if ((memberCount || 0) >= (groupData.max_members || 10)) {
      return { success: false, error: 'This group has reached its maximum member capacity.' };
    }

    const { error: insertErr } = await client.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return { success: true }; // Already joined
      }
      return { success: false, error: insertErr.message };
    }

    // Log activity
    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: userId,
      activity_type: 'member_joined',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join group.' };
  }
};

export const leaveStudyGroup = async (
  groupId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !userId) {
    const currentId = userId || 'guest_user';
    const localMembers = loadLocal<GroupMember>(LOCAL_MEMBERS_KEY);
    saveLocal(
      LOCAL_MEMBERS_KEY,
      localMembers.filter((m) => !(m.groupId === groupId && m.userId === currentId))
    );
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    // Check if user is owner
    const { data: memberRow } = await client
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberRow?.role === 'owner') {
      return { success: false, error: 'As the group owner, you cannot leave your group. Transfer ownership or delete the group.' };
    }

    const { error: deleteErr } = await client
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (deleteErr) return { success: false, error: deleteErr.message };

    // Log Activity
    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: userId,
      activity_type: 'member_left',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to leave group.' };
  }
};

export const deleteStudyGroup = async (
  groupId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !userId) {
    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    saveLocal(LOCAL_GROUPS_KEY, localGroups.filter((g) => g.id !== groupId));
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const { error } = await client.from('groups').delete().eq('id', groupId).eq('owner_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete group.' };
  }
};

export const updateStudyGroup = async (
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    maxMembers?: number;
    isDiscoverable?: boolean;
  },
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !userId) {
    const localGroups = loadLocal<StudyGroup>(LOCAL_GROUPS_KEY);
    const updated = localGroups.map((g) => (g.id === groupId ? { ...g, ...updates, updatedAt: Date.now() } : g));
    saveLocal(LOCAL_GROUPS_KEY, updated);
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim() || null;
    if (updates.avatarUrl) payload.avatar_url = updates.avatarUrl;
    if (updates.maxMembers) payload.max_members = updates.maxMembers;
    if (updates.isDiscoverable !== undefined) payload.is_discoverable = updates.isDiscoverable;

    const { error } = await client.from('groups').update(payload).eq('id', groupId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update group.' };
  }
};

export const setGroupWeeklyGoal = async (
  groupId: string,
  title: string,
  targetMinutes: number,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  const startOfWeek = new Date(getStartOfWeek());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  if (!isSupabaseConfigured() || !userId) {
    const currentId = userId || 'guest_user';
    const localGoals = loadLocal<GroupGoal>(LOCAL_GOALS_KEY);
    const newGoal: GroupGoal = {
      id: `goal_${Date.now()}`,
      groupId,
      title: title.trim() || 'Weekly Goal',
      targetMinutes: Math.max(1, targetMinutes),
      startDate: startOfWeek.getTime(),
      endDate: endOfWeek.getTime(),
      createdBy: currentId,
      createdAt: Date.now(),
    };
    saveLocal(LOCAL_GOALS_KEY, [newGoal, ...localGoals.filter((g) => g.groupId !== groupId)]);

    const localActivities = loadLocal<GroupActivity>(LOCAL_ACTIVITIES_KEY);
    saveLocal(LOCAL_ACTIVITIES_KEY, [
      {
        id: `act_${Date.now()}`,
        groupId,
        userId: currentId,
        activityType: 'goal_created',
        metadata: { title: newGoal.title, targetMinutes: newGoal.targetMinutes },
        createdAt: Date.now(),
        userNickname: 'You',
      },
      ...localActivities,
    ]);
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const { error: goalErr } = await client
      .from('group_goals')
      .insert({
        group_id: groupId,
        title: title.trim() || 'Weekly Goal',
        target_minutes: Math.max(1, targetMinutes),
        start_date: startOfWeek.toISOString(),
        end_date: endOfWeek.toISOString(),
        created_by: userId,
      });

    if (goalErr) return { success: false, error: goalErr.message };

    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: userId,
      activity_type: 'goal_created',
      metadata: { title: title.trim(), targetMinutes },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to set weekly goal.' };
  }
};

export const inviteFriendToGroup = async (
  groupId: string,
  friendId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  const effectiveUserId = await getEffectiveUserId(userId);
  if (!isSupabaseConfigured() || !effectiveUserId) {
    const localInvites = loadLocal<GroupInvite>(LOCAL_INVITES_KEY);
    saveLocal(LOCAL_INVITES_KEY, [
      {
        id: `inv_${Date.now()}`,
        groupId,
        inviterId: effectiveUserId || 'guest_user',
        inviteeId: friendId,
        status: 'pending',
        createdAt: Date.now(),
      },
      ...localInvites,
    ]);
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    // Check if friend is already member
    const { data: existingMember } = await client
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', friendId)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this group.' };
    }

    const { error: inviteErr } = await client.from('group_invites').insert({
      group_id: groupId,
      inviter_id: effectiveUserId,
      invitee_id: friendId,
      status: 'pending',
    });

    if (inviteErr) {
      if (inviteErr.code === '23505') {
        return { success: false, error: 'Invitation already sent.' };
      }
      return { success: false, error: inviteErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send invite.' };
  }
};

export const getPendingGroupInvites = async (userId?: string): Promise<GroupInvite[]> => {
  const effectiveUserId = await getEffectiveUserId(userId);
  if (!isSupabaseConfigured() || !effectiveUserId) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data: inviteRows, error } = await client
      .from('group_invites')
      .select('*')
      .eq('invitee_id', effectiveUserId)
      .eq('status', 'pending');

    if (error || !inviteRows || inviteRows.length === 0) return [];

    const groupIds = Array.from(new Set(inviteRows.map((i: any) => i.group_id)));
    const inviterIds = Array.from(new Set(inviteRows.map((i: any) => i.inviter_id)));

    const { data: groups } = await client.from('groups').select('id, name, avatar_url').in('id', groupIds);
    const { data: profiles } = await client.from('profiles').select('id, nickname, avatar_url').in('id', inviterIds);

    const groupMap = new Map((groups || []).map((g: any) => [g.id, g]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return inviteRows.map((i: any) => {
      const g = groupMap.get(i.group_id);
      const p = profileMap.get(i.inviter_id);
      return {
        id: i.id,
        groupId: i.group_id,
        inviterId: i.inviter_id,
        inviteeId: i.invitee_id,
        status: i.status,
        createdAt: safeParseTimestamp(i.created_at),
        groupName: g?.name || 'Study Group',
        groupAvatarUrl: g?.avatar_url || 'book',
        inviterNickname: p?.nickname || 'Friend',
        inviterAvatarUrl: p?.avatar_url || undefined,
      };
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Luno getPendingGroupInvites Error]:', err);
    return [];
  }
};

export const respondToGroupInvite = async (
  inviteId: string,
  accept: boolean,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  const effectiveUserId = await getEffectiveUserId(userId);
  if (!isSupabaseConfigured() || !effectiveUserId) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const status = accept ? 'accepted' : 'rejected';
    const { data: inviteRow, error: updateErr } = await client
      .from('group_invites')
      .update({ status })
      .eq('id', inviteId)
      .eq('invitee_id', effectiveUserId)
      .select()
      .single();

    if (updateErr || !inviteRow) {
      return { success: false, error: updateErr?.message || 'Failed to update invite.' };
    }

    if (accept) {
      await joinStudyGroup(inviteRow.group_id, effectiveUserId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to respond to invite.' };
  }
};

export const updateGroupMemberRole = async (
  groupId: string,
  targetUserId: string,
  newRole: GroupRole,
  currentUserId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !currentUserId) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const { error } = await client
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update member role.' };
  }
};

export const removeGroupMember = async (
  groupId: string,
  targetUserId: string,
  currentUserId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !currentUserId) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud unconfigured.' };

  try {
    const { error } = await client
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (error) return { success: false, error: error.message };

    // Log Activity
    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: targetUserId,
      activity_type: 'member_left',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove member.' };
  }
};

export const recordGroupFocusSession = async (
  groupId: string,
  session: FocusSession,
  userId?: string
): Promise<void> => {
  if (!groupId || !session) return;

  const mins =
    typeof session.actualDurationSeconds === 'number' && session.actualDurationSeconds > 0
      ? Math.max(1, Math.round(session.actualDurationSeconds / 60))
      : session.durationMinutes || 0;

  if (mins < 1) return;

  if (!isSupabaseConfigured() || !userId) {
    const localActivities = loadLocal<GroupActivity>(LOCAL_ACTIVITIES_KEY);
    saveLocal(LOCAL_ACTIVITIES_KEY, [
      {
        id: `act_${Date.now()}`,
        groupId,
        userId: userId || 'guest_user',
        activityType: 'focus_completed',
        metadata: { durationMinutes: mins, taskTitle: session.taskTitle || null },
        createdAt: Date.now(),
        userNickname: 'You',
      },
      ...localActivities,
    ]);
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('group_activity').insert({
      group_id: groupId,
      user_id: userId,
      activity_type: 'focus_completed',
      metadata: { durationMinutes: mins, taskTitle: session.taskTitle || null },
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Luno recordGroupFocusSession Error]:', err);
  }
};
