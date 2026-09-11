import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { PublicUserProfile, Friend, FriendRequest } from '../types';

const UNCONFIGURED_ERROR = 'Cloud synchronization is not configured. Friends feature requires Supabase.';

export interface FriendServiceResponse<T = void> {
  data?: T;
  error?: string | null;
  message?: string;
}

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
      return data.map((r: any) => ({
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
        .filter((r: any) => !user || r.id !== user.id)
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
      return data.map((r: any) => ({
        friendshipId: r.friendship_id,
        id: r.friend_id,
        nickname: r.nickname,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
        since: r.since ? new Date(r.since).getTime() : Date.now(),
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

    const friendUserIds = friendships.map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', friendUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const result: Friend[] = [];

    for (const f of (friendships || [])) {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const prof = profileMap.get(friendId);
      if (prof) {
        result.push({
          friendshipId: f.id,
          id: friendId,
          nickname: prof.nickname,
          displayName: prof.display_name || undefined,
          avatarUrl: prof.avatar_url || undefined,
          since: f.updated_at ? new Date(f.updated_at).getTime() : Date.now(),
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
      return data.map((r: any) => ({
        id: r.friendship_id,
        user: {
          id: r.requester_id,
          nickname: r.nickname,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
        },
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
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

    const requesterIds = requests.map((r: any) => r.requester_id);
    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', requesterIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const result: FriendRequest[] = [];

    for (const r of (requests || [])) {
      const prof = profileMap.get(r.requester_id);
      if (prof) {
        result.push({
          id: r.id,
          user: {
            id: prof.id,
            nickname: prof.nickname,
            displayName: prof.display_name || undefined,
            avatarUrl: prof.avatar_url || undefined,
          },
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
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
      return data.map((r: any) => ({
        id: r.friendship_id,
        user: {
          id: r.addressee_id,
          nickname: r.nickname,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
        },
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
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

    const addresseeIds = requests.map((r: any) => r.addressee_id);
    const { data: profiles } = await client
      .from('profiles')
      .select('id, nickname, display_name, avatar_url')
      .in('id', addresseeIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const result: FriendRequest[] = [];

    for (const r of (requests || [])) {
      const prof = profileMap.get(r.addressee_id);
      if (prof) {
        result.push({
          id: r.id,
          user: {
            id: prof.id,
            nickname: prof.nickname,
            displayName: prof.display_name || undefined,
            avatarUrl: prof.avatar_url || undefined,
          },
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
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

export const sendFriendRequest = async (targetUserId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) {
    return { error: UNCONFIGURED_ERROR };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { error: UNCONFIGURED_ERROR };
  }

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { error: 'You must be signed in to add friends.' };
    }
    if (user.id === targetUserId) {
      return { error: 'You cannot send a friend request to yourself.' };
    }

    // Check if an existing relationship already exists in either direction
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
          // If the other user already sent a request to us, automatically accept it!
          await client
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          return { message: 'Friend request accepted!' };
        }
      }
      // If rejected, allow re-requesting by updating to pending
      await client
        .from('friendships')
        .update({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

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
  }
};

export const acceptFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

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
  }
};

export const rejectFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

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
  }
};

export const removeFriend = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

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
  }
};

export const cancelFriendRequest = async (friendshipId: string): Promise<FriendServiceResponse> => {
  if (!isSupabaseConfigured()) return { error: UNCONFIGURED_ERROR };
  const client = getSupabaseClient();
  if (!client) return { error: UNCONFIGURED_ERROR };

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
  }
};
