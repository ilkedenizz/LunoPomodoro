import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { PublicUserProfile, Friend, FriendRequest } from '../types';

const UNCONFIGURED_ERROR = 'Cloud synchronization is not configured. Friends feature requires Supabase.';

export interface FriendServiceResponse<T = void> {
  data?: T;
  error?: string | null;
  message?: string;
}

const safeParseTimestamp = (val: any): number => {
  if (!val) return Date.now();
  const num = typeof val === 'number' ? val : new Date(val).getTime();
  return isNaN(num) ? Date.now() : num;
};

export const searchUsers = async (query: string): Promise<PublicUserProfile[]> => {
  const clean = query.trim().replace(/^@/, '');
  if (!clean || clean.length < 2) return [];

  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('search_profiles_by_nickname', {
      search_term: clean,
      limit_count: 10,
    });

    if (!error && Array.isArray(data)) {
      return data
        .filter((r: any) => r && r.id && r.nickname)
        .map((r: any) => ({
          id: r.id,
          nickname: r.nickname,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
        }));
    }

    // Fallback: direct select if RPC not created yet
    const { data: fallbackData } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .or(`nickname.ilike.%${clean}%,display_name.ilike.%${clean}%`)
      .limit(10);

    if (fallbackData && Array.isArray(fallbackData)) {
      const { data: { user } } = await client.auth.getUser();
      return fallbackData
        .filter((r: any) => r && r.id && r.nickname && (!user || r.id !== user.id))
        .map((r: any) => ({
          id: r.id,
          nickname: r.nickname,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
        }));
    }

    return [];
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Friends Search Error]:', err);
    }
    return [];
  }
};

export const getFriendsList = async (): Promise<Friend[]> => {
  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('get_my_friends');
    if (!error && Array.isArray(data)) {
      return data
        .filter((r: any) => r && (r.friendship_id || r.id) && (r.friend_id || r.id) && r.nickname)
        .map((r: any) => ({
          friendshipId: r.friendship_id || r.id,
          id: r.friend_id || r.id,
          nickname: r.nickname,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
          since: safeParseTimestamp(r.since),
        }));
    }

    // Fallback direct join
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: friendships } = await client
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) return [];

    const friendUserIds = friendships
      .filter((f: any) => f && (f.requester_id || f.addressee_id))
      .map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
      .filter(Boolean);

    if (friendUserIds.length === 0) return [];

    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', friendUserIds);

    const profileMap = new Map((profiles || []).filter((p: any) => p && p.id).map((p: any) => [p.id, p]));
    const result: Friend[] = [];

    for (const f of (friendships || [])) {
      if (!f) continue;
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const prof = profileMap.get(friendId);
      if (prof && prof.nickname) {
        result.push({
          friendshipId: f.id,
          id: friendId,
          nickname: prof.nickname,
          displayName: prof.display_name || undefined,
          avatarUrl: prof.avatar_url || undefined,
          since: safeParseTimestamp(f.updated_at),
        });
      }
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Friends List Error]:', err);
    }
    return [];
  }
};

export const getIncomingFriendRequests = async (): Promise<FriendRequest[]> => {
  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('get_incoming_friend_requests');
    if (!error && Array.isArray(data)) {
      return data
        .filter((r: any) => r && r.friendship_id && r.requester_id && r.nickname)
        .map((r: any) => ({
          id: r.friendship_id,
          user: {
            id: r.requester_id,
            nickname: r.nickname,
            displayName: r.display_name || undefined,
            avatarUrl: r.avatar_url || undefined,
          },
          createdAt: safeParseTimestamp(r.created_at),
          type: 'incoming',
        }));
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: requests } = await client
      .from('friendships')
      .select('*')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (!requests || requests.length === 0) return [];

    const requesterIds = requests
      .filter((r: any) => r && r.requester_id)
      .map((r: any) => r.requester_id);

    if (requesterIds.length === 0) return [];

    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', requesterIds);

    const profileMap = new Map((profiles || []).filter((p: any) => p && p.id).map((p: any) => [p.id, p]));
    const result: FriendRequest[] = [];

    for (const r of (requests || [])) {
      if (!r) continue;
      const prof = profileMap.get(r.requester_id);
      if (prof && prof.nickname) {
        result.push({
          id: r.id,
          user: {
            id: prof.id,
            nickname: prof.nickname,
            displayName: prof.display_name || undefined,
            avatarUrl: prof.avatar_url || undefined,
          },
          createdAt: safeParseTimestamp(r.created_at),
          type: 'incoming',
        });
      }
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Incoming Requests Error]:', err);
    }
    return [];
  }
};

export const getOutgoingFriendRequests = async (): Promise<FriendRequest[]> => {
  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('get_outgoing_friend_requests');
    if (!error && Array.isArray(data)) {
      return data
        .filter((r: any) => r && r.friendship_id && r.addressee_id && r.nickname)
        .map((r: any) => ({
          id: r.friendship_id,
          user: {
            id: r.addressee_id,
            nickname: r.nickname,
            displayName: r.display_name || undefined,
            avatarUrl: r.avatar_url || undefined,
          },
          createdAt: safeParseTimestamp(r.created_at),
          type: 'outgoing',
        }));
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: requests } = await client
      .from('friendships')
      .select('*')
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (!requests || requests.length === 0) return [];

    const addresseeIds = requests
      .filter((r: any) => r && r.addressee_id)
      .map((r: any) => r.addressee_id);

    if (addresseeIds.length === 0) return [];

    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', addresseeIds);

    const profileMap = new Map((profiles || []).filter((p: any) => p && p.id).map((p: any) => [p.id, p]));
    const result: FriendRequest[] = [];

    for (const r of (requests || [])) {
      if (!r) continue;
      const prof = profileMap.get(r.addressee_id);
      if (prof && prof.nickname) {
        result.push({
          id: r.id,
          user: {
            id: prof.id,
            nickname: prof.nickname,
            displayName: prof.display_name || undefined,
            avatarUrl: prof.avatar_url || undefined,
          },
          createdAt: safeParseTimestamp(r.created_at),
          type: 'outgoing',
        });
      }
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno Outgoing Requests Error]:', err);
    }
    return [];
  }
};

const inFlightFriendActions = new Set<string>();

export const sendFriendRequest = async (targetUserId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) {
    return { error: UNCONFIGURED_ERROR };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { error: UNCONFIGURED_ERROR };
  }

  const lockKey = `send:${targetUserId}`;
  if (inFlightFriendActions.has(lockKey)) {
    return { error: 'Request is currently processing.' };
  }
  inFlightFriendActions.add(lockKey);

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { error: 'You must be signed in to add friends.' };
    }
    if (user.id === targetUserId) {
      return { error: 'You cannot send a friend request to yourself.' };
    }

    // 1. Try atomic database RPC function first (handles duplicate checks, mutual accepts, and avoids RLS/permission issues)
    const { data: rpcData, error: rpcError } = await client.rpc('send_friend_request', {
      target_user_id: targetUserId,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const response = rpcData as { success?: boolean; message?: string; error?: string };
      if (response.success) {
        return { message: response.message || 'Friend request sent!' };
      }
      return { error: response.error || 'Failed to send friend request.' };
    }

    // 2. Direct table fallback if RPC is not yet executed
    const { data: existing } = await client
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { message: 'You are already friends!' };
      }
      if (existing.status === 'pending') {
        if (existing.requester_id === user.id) {
          return { message: 'Friend request already sent.' };
        } else {
          // If the other user already sent a request to us, automatically accept it
          const { error: acceptErr } = await client
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (acceptErr) {
            return { error: acceptErr.message || 'Failed to accept friend request.' };
          }
          return { message: 'Friend request accepted!' };
        }
      }

      // If rejected, allow re-requesting by updating to pending
      const { error: updateErr } = await client
        .from('friendships')
        .update({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        return { error: updateErr.message || 'Failed to send friend request.' };
      }

      return { message: 'Friend request sent!' };
    }

    // Create brand new friendship row
    const { error: insertError } = await client.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: 'pending',
    });

    if (insertError) {
      return { error: insertError.message || 'Failed to send friend request.' };
    }

    return { message: 'Friend request sent!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send friend request.';
    return { error: msg };
  } finally {
    inFlightFriendActions.delete(lockKey);
  }
};

export const acceptFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

  const lockKey = `accept:${friendshipId}`;
  if (inFlightFriendActions.has(lockKey)) {
    return { error: 'Action is currently processing.' };
  }
  inFlightFriendActions.add(lockKey);

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'Please sign in to manage friend requests.' };

    const { error } = await client
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', user.id);

    if (error) {
      return { error: error.message || 'Failed to accept request.' };
    }

    return { message: 'Friend request accepted!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept request.';
    return { error: msg };
  } finally {
    inFlightFriendActions.delete(lockKey);
  }
};

export const rejectFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

  const lockKey = `reject:${friendshipId}`;
  if (inFlightFriendActions.has(lockKey)) {
    return { error: 'Action is currently processing.' };
  }
  inFlightFriendActions.add(lockKey);

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'Please sign in to manage friend requests.' };

    const { error } = await client
      .from('friendships')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', user.id);

    if (error) {
      return { error: error.message || 'Failed to decline request.' };
    }

    return { message: 'Friend request declined.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to decline request.';
    return { error: msg };
  } finally {
    inFlightFriendActions.delete(lockKey);
  }
};

export const removeFriend = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

  const lockKey = `remove:${friendshipId}`;
  if (inFlightFriendActions.has(lockKey)) {
    return { error: 'Action is currently processing.' };
  }
  inFlightFriendActions.add(lockKey);

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'Please sign in to manage friends.' };

    const { error } = await client
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      return { error: error.message || 'Failed to remove friend.' };
    }

    return { message: 'Friend removed.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove friend.';
    return { error: msg };
  } finally {
    inFlightFriendActions.delete(lockKey);
  }
};

export const cancelFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

  const lockKey = `cancel:${friendshipId}`;
  if (inFlightFriendActions.has(lockKey)) {
    return { error: 'Action is currently processing.' };
  }
  inFlightFriendActions.add(lockKey);

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'Please sign in to manage requests.' };

    const { error } = await client
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (error) {
      return { error: error.message || 'Failed to cancel request.' };
    }

    return { message: 'Friend request cancelled.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel request.';
    return { error: msg };
  } finally {
    inFlightFriendActions.delete(lockKey);
  }
};

export interface FriendDailyHistoryItem {
  date: string; // 'YYYY-MM-DD'
  minutes: number;
}

export interface FriendRecentActivityItem {
  id: string;
  type: 'focus_completed' | 'group_joined' | 'goal_updated';
  description: string;
  timestamp: number;
}

export interface FriendPublicStats {
  userId: string;
  nickname: string;
  displayName?: string;
  avatarUrl?: string;
  joinedAt?: number;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  totalMinutes: number;
  totalSessions: number;
  dailyAverageMinutes: number;
  lastActiveAt?: number;
  lastSessionMinutes?: number;
  dailyHistory?: FriendDailyHistoryItem[];
  recentActivities?: FriendRecentActivityItem[];
}

export const getFriendPublicStats = async (targetUserId: string): Promise<FriendPublicStats | null> => {
  if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.trim()) return null;
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const cleanId = targetUserId.trim();

    // 1. Fetch direct focus_sessions to ensure stopwatch and partial sessions with duration are calculated
    const { data: directSessions } = await client
      .from('focus_sessions')
      .select('duration_minutes, actual_duration_seconds, timestamp, mode, completed')
      .eq('user_id', cleanId);

    let directTodayMins = 0;
    let directWeekMins = 0;
    let directMonthMins = 0;
    let directTotalMins = 0;
    let directTotalSess = 0;
    let directLastActive: number | undefined = undefined;
    let directLastSessionMins: number | undefined = undefined;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (directSessions && Array.isArray(directSessions)) {
      const sorted = [...directSessions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      sorted.forEach((s: any) => {
        const isFocusMode = s.mode === 'pomodoro' || s.mode === 'stopwatch' || s.mode === 'focus';
        const hasTime = (typeof s.actual_duration_seconds === 'number' && s.actual_duration_seconds > 0) ||
                        (typeof s.duration_minutes === 'number' && s.duration_minutes > 0);

        if (isFocusMode && (s.completed !== false || hasTime)) {
          const mins = typeof s.actual_duration_seconds === 'number' && s.actual_duration_seconds > 0
            ? Math.max(1, Math.round(s.actual_duration_seconds / 60))
            : (s.duration_minutes || 0);

          const time = new Date(s.timestamp).getTime();
          if (isNaN(time)) return;

          directTotalMins += mins;
          directTotalSess += 1;

          if (time >= startOfDay) directTodayMins += mins;
          if (time >= startOfWeek) directWeekMins += mins;
          if (time >= startOfMonth) directMonthMins += mins;

          if (!directLastActive || time > directLastActive) {
            directLastActive = time;
            directLastSessionMins = mins;
          }
        }
      });
    }

    if (import.meta.env.DEV) {
      const { data: { user: authUser } } = await client.auth.getUser();
      console.log('FRIEND_REAL_DEBUG:', {
        clickedFriendId: cleanId,
        selectedFriendId: cleanId,
        profileUserId: cleanId,
        statsTargetUserId: cleanId,
        authUserId: authUser?.id || null,
      });
      console.log('FOCUS_REAL_DEBUG:', {
        targetUserId: cleanId,
        rowCount: directSessions?.length || 0,
        rows: directSessions,
        error: null,
      });
      console.log('[Luno DEV Log] FRIEND STATS REQUEST:', { targetUserId: cleanId });
    }

    // 2. Call RPC get_user_public_stats
    const { data, error } = await client.rpc('get_user_public_stats', { target_user_id: cleanId });

    if (import.meta.env.DEV && error) {
      console.warn('[Luno getFriendPublicStats RPC Warning]:', error);
    }

    if (!error && data && (data.success !== false)) {
      const rpcToday = Number(data.todayMinutes ?? data.today_minutes) || 0;
      const rpcWeek = Number(data.weekMinutes ?? data.week_minutes) || 0;
      const rpcMonth = Number(data.monthMinutes ?? data.month_minutes) || 0;
      const rpcTotal = Number(data.totalMinutes ?? data.total_minutes) || 0;

      const res = {
        userId: data.userId || data.user_id || cleanId,
        nickname: data.nickname || data.displayName || `user_${cleanId.slice(0, 6)}`,
        displayName: data.displayName || data.display_name || undefined,
        avatarUrl: data.avatarUrl || data.avatar_url || undefined,
        joinedAt: safeParseTimestamp(data.joinedAt || data.joined_at),
        todayMinutes: Math.max(rpcToday, directTodayMins),
        weekMinutes: Math.max(rpcWeek, directWeekMins),
        monthMinutes: Math.max(rpcMonth, directMonthMins),
        totalMinutes: Math.max(rpcTotal, directTotalMins),
        totalSessions: Math.max(Number(data.totalSessions ?? data.total_sessions) || 0, directTotalSess),
        dailyAverageMinutes: Math.max(Number(data.dailyAverageMinutes ?? data.daily_average_minutes) || 0, directTotalSess > 0 ? Math.round(directTotalMins / Math.max(1, directTotalSess)) : 0),
        lastActiveAt: (data.lastActiveAt || data.last_active_at) ? safeParseTimestamp(data.lastActiveAt || data.last_active_at) : directLastActive,
        lastSessionMinutes: (data.lastSessionMinutes ?? data.last_session_minutes) ? Number(data.lastSessionMinutes ?? data.last_session_minutes) : directLastSessionMins,
        dailyHistory: Array.isArray(data.dailyHistory || data.daily_history) ? (data.dailyHistory || data.daily_history) : [],
        recentActivities: Array.isArray(data.recentActivities || data.recent_activities) ? (data.recentActivities || data.recent_activities) : [],
      };

      if (import.meta.env.DEV) {
        console.log('[Luno DEV Log] FRIEND STATS RESPONSE:', {
          targetUserId: res.userId,
          totalFocusMinutes: res.totalMinutes,
          totalSessions: res.totalSessions,
          weeklyMinutes: res.weekMinutes,
          error: null
        });
      }

      return res;
    }

    // 3. Direct Profile Fallback
    const { data: profile, error: profErr } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url, created_at')
      .eq('id', cleanId)
      .maybeSingle();

    if (import.meta.env.DEV) {
      console.log('PROFILE_REAL_DEBUG:', {
        requestedUserId: cleanId,
        returnedRows: profile ? 1 : 0,
        returnedProfile: profile,
        error: profErr ? profErr.message : null,
      });
    }

    if (import.meta.env.DEV && profErr) {
      console.error('[Luno getFriendPublicStats Fallback Profile Error]:', profErr);
    }

    if (!profile) return null;

    return {
      userId: profile.id,
      nickname: profile.nickname || profile.display_name || 'User',
      displayName: profile.display_name || undefined,
      avatarUrl: profile.avatar_url || undefined,
      joinedAt: safeParseTimestamp(profile.created_at),
      todayMinutes: directTodayMins,
      weekMinutes: directWeekMins,
      monthMinutes: directMonthMins,
      totalMinutes: directTotalMins,
      totalSessions: directTotalSess,
      dailyAverageMinutes: directTotalSess > 0 ? Math.round(directTotalMins / Math.max(1, directTotalSess)) : 0,
      lastActiveAt: directLastActive,
      lastSessionMinutes: directLastSessionMins,
      dailyHistory: [],
      recentActivities: [],
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Luno getFriendPublicStats Exception]:', err);
    }
    return null;
  }
};
