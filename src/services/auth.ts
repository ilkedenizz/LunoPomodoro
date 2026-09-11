import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { UserProfile } from '../types';

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
  confirmationRequired?: boolean;
  message?: string;
}

const UNCONFIGURED_AUTH_ERROR =
  'Cloud synchronization is not configured. Add Supabase credentials in .env to enable accounts, or continue using Luno locally in Guest Mode.';

const formatAuthError = (message: string): string => {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid_grant')
  ) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed') ||
    lower.includes('email address not confirmed')
  ) {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation email.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('password is too short') ||
    lower.includes('weak_password')
  ) {
    return 'Password must be at least 6 characters long.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network error')) {
    return 'Unable to reach the authentication server. Please check your internet connection.';
  }
  return message;
};

export const validateNickname = (
  nickname: string
): { valid: boolean; error: string | null; normalized: string } => {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return { valid: false, error: 'Nickname is required.', normalized: '' };
  }
  if (trimmed.length < 3 || trimmed.length > 20) {
    return {
      valid: false,
      error: 'Nickname must be between 3 and 20 characters.',
      normalized: trimmed.toLowerCase(),
    };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Nickname can only contain letters, numbers, and underscores.',
      normalized: trimmed.toLowerCase(),
    };
  }
  return { valid: true, error: null, normalized: trimmed.toLowerCase() };
};

export const checkNicknameAvailability = async (
  nickname: string,
  currentUserId?: string
): Promise<{ available: boolean; error: string | null }> => {
  const validation = validateNickname(nickname);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  if (!isSupabaseConfigured()) {
    return { available: true, error: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { available: true, error: null };
  }

  try {
    // 1. Primary: Call SECURITY DEFINER RPC function
    const { data, error } = await client.rpc('check_nickname_available', {
      username: validation.normalized,
      exclude_user_id: currentUserId || null,
    });

    if (!error && typeof data === 'boolean') {
      return {
        available: data,
        error: data ? null : 'This nickname is already taken.',
      };
    }

    // 2. Fallback: Call RPC function without exclude_user_id
    const fallback = await client.rpc('check_nickname_available', {
      username: validation.normalized,
    });
    if (!fallback.error && typeof fallback.data === 'boolean') {
      return {
        available: fallback.data,
        error: fallback.data ? null : 'This nickname is already taken.',
      };
    }

    return { available: true, error: null };
  } catch {
    return { available: true, error: null };
  }
};

export const getAuthRedirectUrl = (): string => {
  // 1. Explicitly configured App / Site URL from env (production or dev override)
  const envUrl = (
    (typeof import.meta.env.VITE_APP_URL === 'string' && import.meta.env.VITE_APP_URL) ||
    (typeof import.meta.env.VITE_SITE_URL === 'string' && import.meta.env.VITE_SITE_URL) ||
    ''
  ).trim().replace(/\/+$/, '');

  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }

  // 2. Active browser window origin (e.g. http://localhost:5173 or https://your-project.vercel.app)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.trim().replace(/\/+$/, '');
    if (origin && !origin.includes('localhost:5000')) {
      return origin;
    }
  }

  // 3. Default fallback to standard Vite dev server port 5173
  return 'http://localhost:5173';
};

export const handleAuthUrlCallback = (): {
  hasAuthParams: boolean;
  type?: string | null;
  error?: string | null;
} => {
  if (typeof window === 'undefined') return { hasAuthParams: false };

  try {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const rawError =
      hashParams.get('error_description') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error');

    const type = hashParams.get('type') || searchParams.get('type');
    const hasAccessToken = hashParams.has('access_token');
    const hasCode = searchParams.has('code');

    const hasAuthParams = Boolean(rawError || hasAccessToken || hasCode || type);

    // Clean up tokens and error hashes from address bar without reloading the page
    if (hasAccessToken || hasCode || rawError) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    return {
      hasAuthParams,
      type,
      error: rawError ? formatAuthError(decodeURIComponent(rawError.replace(/\+/g, ' '))) : null,
    };
  } catch {
    return { hasAuthParams: false };
  }
};

export const fetchOrCreateProfile = async (
  client: any,
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      nickname?: string;
      display_name?: string;
      full_name?: string;
      avatar_url?: string;
      [key: string]: unknown;
    };
  }
): Promise<{ nickname?: string; display_name?: string; avatar_url?: string | null } | null> => {
  try {
    const { data: profileRow } = await client
      .from('profiles')
      .select('nickname, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profileRow) {
      return profileRow;
    }

    let defaultNick =
      (typeof user.user_metadata?.nickname === 'string' && user.user_metadata.nickname.trim()) ||
      (user.email ? user.email.split('@')[0] : 'user');
    defaultNick = defaultNick.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    if (defaultNick.length < 3) defaultNick = defaultNick.padEnd(3, '0');

    const defaultDisplay =
      (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()) ||
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      defaultNick;

    const defaultAvatar =
      typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim()
        ? user.user_metadata.avatar_url.trim()
        : null;

    try {
      await client.from('profiles').upsert({
        id: user.id,
        nickname: defaultNick,
        display_name: defaultDisplay,
        avatar_url: defaultAvatar,
        updated_at: new Date().toISOString(),
      });
      return { nickname: defaultNick, display_name: defaultDisplay, avatar_url: defaultAvatar };
    } catch {
      const { data: retryRow } = await client
        .from('profiles')
        .select('nickname, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      return retryRow || { nickname: defaultNick, display_name: defaultDisplay, avatar_url: defaultAvatar };
    }
  } catch {
    return null;
  }
};

export const mapSupabaseUser = (
  user: {
    id: string;
    email?: string;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
    user_metadata?: {
      nickname?: string;
      display_name?: string;
      full_name?: string;
      avatar_url?: string;
      [key: string]: unknown;
    };
    created_at?: string;
  },
  profileData?: { nickname?: string; display_name?: string; avatar_url?: string | null } | null
): UserProfile => {
  const isVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
  const nickname =
    profileData?.nickname ||
    (typeof user.user_metadata?.nickname === 'string' && user.user_metadata.nickname.trim()
      ? user.user_metadata.nickname.trim()
      : undefined) ||
    (user.email ? user.email.split('@')[0] : undefined);

  const displayName =
    profileData?.display_name ||
    (typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : undefined);

  const avatarUrl =
    profileData?.avatar_url !== undefined
      ? (profileData.avatar_url || undefined)
      : (typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim()
          ? user.user_metadata.avatar_url.trim()
          : undefined);

  return {
    id: user.id,
    email: user.email || '',
    nickname,
    displayName,
    avatarUrl,
    emailVerified: isVerified,
    createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
  };
};

export const signUp = async (
  email: string,
  password: string,
  nickname?: string
): Promise<AuthResponse> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { user: null, error: 'Please provide a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters long.' };
  }

  // Validate nickname if provided
  let cleanNickname = '';
  if (nickname) {
    const val = validateNickname(nickname);
    if (!val.valid) {
      return { user: null, error: val.error };
    }
    cleanNickname = val.normalized;

    // Check availability against database
    const avail = await checkNicknameAvailability(cleanNickname);
    if (!avail.available) {
      return { user: null, error: avail.error || 'This nickname is already taken.' };
    }
  } else {
    cleanNickname = trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    if (cleanNickname.length < 3) cleanNickname = `user_${Math.random().toString(36).slice(2, 7)}`;
  }

  if (!isSupabaseConfigured()) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const redirectUrl = getAuthRedirectUrl();
    const { data, error } = await client.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          nickname: cleanNickname,
          display_name: cleanNickname,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return { user: null, error: formatAuthError(error.message) };
    }

    // Try to ensure public.profiles row exists if session was established
    if (data.user) {
      try {
        await client.from('profiles').upsert({
          id: data.user.id,
          nickname: cleanNickname,
          display_name: cleanNickname,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    // Check if Supabase project requires email confirmation
    if (data.user && !data.session) {
      return {
        user: null,
        confirmationRequired: true,
        error: null,
        message: 'Account created! Please check your inbox and verify your email to complete sign in.',
      };
    }

    if (data.user) {
      return {
        user: mapSupabaseUser(data.user, { nickname: cleanNickname, display_name: cleanNickname }),
        error: null,
      };
    }

    return { user: null, error: 'Unable to complete account registration.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Sign up encountered an unexpected error.';
    return { user: null, error: msg };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { user: null, error: 'Please provide a valid email address.' };
  }
  if (!password) {
    return { user: null, error: 'Please enter your password.' };
  }

  if (!isSupabaseConfigured()) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return { user: null, error: formatAuthError(error.message) };
    }

    if (data.user) {
      const profile = await fetchOrCreateProfile(client, data.user);
      return { user: mapSupabaseUser(data.user, profile), error: null };
    }

    return { user: null, error: 'Unable to sign in.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Sign in encountered an unexpected error.';
    return { user: null, error: msg };
  }
};

export const resetPasswordForEmail = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const redirectUrl = getAuthRedirectUrl();
    const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: formatAuthError(error.message) };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Failed to send password reset email.';
    return { success: false, error: msg };
  }
};

export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean; error: string | null }> => {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: formatAuthError(error.message) };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Failed to update password.';
    return { success: false, error: msg };
  }
};

export const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const redirectUrl = getAuthRedirectUrl();
    const { error } = await client.auth.resend({
      type: 'signup',
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return { success: false, error: formatAuthError(error.message) };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Failed to resend confirmation email.';
    return { success: false, error: msg };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.auth.signOut();
      if (error) return { error: formatAuthError(error.message) };
    } catch (err: unknown) {
      return { error: err instanceof Error ? formatAuthError(err.message) : 'Sign out failed.' };
    }
  }
  return { error: null };
};

export const updateUserProfile = async (
  updates: { displayName?: string; nickname?: string; avatarUrl?: string | null }
): Promise<{ user: UserProfile | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { data: { user: currentUser }, error: userError } = await client.auth.getUser();
    if (userError || !currentUser) {
      return { user: null, error: 'No active session found.' };
    }

    let cleanNickname: string | undefined = undefined;
    if (updates.nickname !== undefined) {
      const val = validateNickname(updates.nickname);
      if (!val.valid) {
        return { user: null, error: val.error };
      }
      cleanNickname = val.normalized;

      // Check availability excluding current user
      const avail = await checkNicknameAvailability(cleanNickname, currentUser.id);
      if (!avail.available) {
        return { user: null, error: avail.error || 'This nickname is already taken.' };
      }
    }

    // 1. Try calling update_my_profile RPC
    let profileData: { id?: string; nickname?: string; display_name?: string; avatar_url?: string | null } | null = null;
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('update_my_profile', {
        p_nickname: cleanNickname || null,
        p_display_name: updates.displayName !== undefined ? (updates.displayName.trim() || null) : null,
        p_avatar_url: updates.avatarUrl !== undefined ? (updates.avatarUrl || null) : null,
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.profile) {
        profileData = rpcRes.profile;
      } else if (rpcRes && rpcRes.success === false && rpcRes.error) {
        return { user: null, error: rpcRes.error };
      }
    } catch {}

    // 2. Direct table update / upsert fallback
    if (!profileData) {
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName.trim() || null;
      if (cleanNickname !== undefined) dbUpdates.nickname = cleanNickname;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl || null;

      const { data: updateRes, error: updateErr } = await client
        .from('profiles')
        .update(dbUpdates)
        .eq('id', currentUser.id)
        .select('id, nickname, display_name, avatar_url')
        .maybeSingle();

      if (updateErr) {
        if (import.meta.env.DEV) {
          console.error('[Luno Profiles Update Error]:', updateErr);
        }
        return { user: null, error: formatAuthError(updateErr.message) };
      }

      if (updateRes) {
        profileData = updateRes;
      } else {
        const fullProfile = {
          id: currentUser.id,
          nickname: cleanNickname || currentUser.user_metadata?.nickname || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
          display_name: updates.displayName !== undefined ? (updates.displayName.trim() || null) : (currentUser.user_metadata?.display_name || null),
          avatar_url: updates.avatarUrl !== undefined ? (updates.avatarUrl || null) : (currentUser.user_metadata?.avatar_url || null),
          updated_at: new Date().toISOString(),
        };
        const { data: upsertRes, error: upsertErr } = await client
          .from('profiles')
          .upsert(fullProfile)
          .select('id, nickname, display_name, avatar_url')
          .maybeSingle();

        if (upsertErr) {
          if (import.meta.env.DEV) {
            console.error('[Luno Profiles Upsert Error]:', upsertErr);
          }
          return { user: null, error: formatAuthError(upsertErr.message) };
        }
        profileData = upsertRes || fullProfile;
      }
    }

    // 3. Keep auth metadata in sync
    const authDataUpdates: Record<string, string> = {};
    if (profileData.display_name !== undefined) {
      authDataUpdates.display_name = profileData.display_name || '';
    }
    if (profileData.nickname !== undefined) {
      authDataUpdates.nickname = profileData.nickname || '';
    }
    if (profileData.avatar_url !== undefined) {
      authDataUpdates.avatar_url = profileData.avatar_url || '';
    }

    const { data: authData, error: authErr } = await client.auth.updateUser({
      data: authDataUpdates,
    });

    if (authErr) {
      if (import.meta.env.DEV) {
        console.error('[Luno Auth Metadata Update Error]:', authErr);
      }
    }

    const finalUser = mapSupabaseUser(authData?.user || currentUser, profileData);
    return { user: finalUser, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? formatAuthError(err.message) : 'Failed to update profile.';
    return { user: null, error: msg };
  }
};

const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/pjpeg',
  'image/x-png',
];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export const formatAvatarError = (rawError: string): string => {
  const lower = rawError.toLowerCase();
  if (
    lower.includes('bucket not found') ||
    lower.includes('the resource was not found') ||
    (lower.includes('bucket') && lower.includes('not found'))
  ) {
    return 'Storage bucket "avatars" not found in Supabase. Please execute the schema.sql migration in Supabase SQL Editor.';
  }
  if (
    lower.includes('row-level security') ||
    lower.includes('violates row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('unauthorized') ||
    lower.includes('security policy')
  ) {
    return 'Upload permission denied by Supabase Storage security policies. Please verify Storage RLS policies in Supabase.';
  }
  if (
    lower.includes('payload too large') ||
    lower.includes('entity too large') ||
    lower.includes('size limit') ||
    lower.includes('exceeded')
  ) {
    return 'The image file exceeds the maximum 5 MB limit.';
  }
  if (
    lower.includes('mime') ||
    lower.includes('unsupported') ||
    lower.includes('invalid file type') ||
    lower.includes('content-type')
  ) {
    return 'Unsupported image format. Please select a JPG, PNG, or WebP image.';
  }
  return formatAuthError(rawError);
};

export const validateAvatarFile = (file: File): { valid: boolean; error: string | null } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const fileType = file.type ? file.type.toLowerCase() : '';

  const isExtValid = ALLOWED_AVATAR_EXTENSIONS.includes(fileExt);
  const isTypeValid = !fileType || ALLOWED_AVATAR_TYPES.includes(fileType) || fileType.startsWith('image/');

  if (!isExtValid && !isTypeValid) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, and WebP images are supported.' };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: 'Image size must be 5 MB or smaller.' };
  }

  return { valid: true, error: null };
};

export const uploadAvatar = async (
  file: File
): Promise<{ user: UserProfile | null; avatarUrl: string | null; error: string | null }> => {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    return { user: null, avatarUrl: null, error: validation.error };
  }

  if (!isSupabaseConfigured()) {
    return { user: null, avatarUrl: null, error: UNCONFIGURED_AUTH_ERROR };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, avatarUrl: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { user: null, avatarUrl: null, error: 'Please sign in to upload a profile photo.' };
    }

    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileExt = ALLOWED_AVATAR_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg';
    const fileName = `avatar_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const mimeType = file.type || (fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg');

    // Clean up old avatar files in user's directory
    try {
      const { data: existingFiles } = await client.storage.from('avatars').list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        const toDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
        await client.storage.from('avatars').remove(toDelete);
      }
    } catch {}

    // Upload to Supabase Storage
    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      if (import.meta.env.DEV) {
        console.error('[Luno Avatar Upload Error]:', uploadError);
      }
      return { user: null, avatarUrl: null, error: formatAvatarError(uploadError.message) };
    }

    // Get public URL with timestamp cache buster
    const { data: publicUrlData } = client.storage.from('avatars').getPublicUrl(filePath);
    const basePublicUrl = publicUrlData.publicUrl;
    const publicUrl = `${basePublicUrl}?t=${Date.now()}`;

    // Update public.profiles table
    let profileData: { nickname?: string; display_name?: string; avatar_url?: string | null } | null = null;
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('update_my_profile', {
        p_avatar_url: publicUrl,
      });
      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.profile) {
        profileData = rpcRes.profile;
      }
    } catch {}

    if (!profileData) {
      const { data: updatedProf, error: profErr } = await client
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('nickname, display_name, avatar_url')
        .maybeSingle();

      if (profErr) {
        if (import.meta.env.DEV) {
          console.error('[Luno Avatar Profiles Direct Update Error]:', profErr);
        }
        return { user: null, avatarUrl: null, error: formatAvatarError(profErr.message) };
      }
      profileData = updatedProf || { avatar_url: publicUrl };
    }

    // Update user auth metadata
    const { data: updateUserData, error: authUpdateError } = await client.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (authUpdateError && import.meta.env.DEV) {
      console.warn('[Luno Auth Metadata Update Warning]:', authUpdateError);
    }

    const mappedUser = mapSupabaseUser(updateUserData?.user || user, profileData);
    return { user: mappedUser, avatarUrl: publicUrl, error: null };
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error('[Luno Avatar Upload Exception]:', err);
    }
    const msg = err instanceof Error ? formatAvatarError(err.message) : 'Failed to upload profile photo.';
    return { user: null, avatarUrl: null, error: msg };
  }
};

export const removeAvatar = async (): Promise<{ user: UserProfile | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { user: null, error: 'No active session found.' };
    }

    // Remove files from storage
    try {
      const { data: existingFiles } = await client.storage.from('avatars').list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        const toDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
        await client.storage.from('avatars').remove(toDelete);
      }
    } catch {}

    // Update public.profiles table
    let profileData: { nickname?: string; display_name?: string; avatar_url?: string | null } | null = null;
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('update_my_profile', {
        p_avatar_url: '',
      });
      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.profile) {
        profileData = { ...rpcRes.profile, avatar_url: null };
      }
    } catch {}

    if (!profileData) {
      const { data: updatedProf, error: profErr } = await client
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('nickname, display_name, avatar_url')
        .maybeSingle();

      if (profErr) {
        if (import.meta.env.DEV) {
          console.error('[Luno Avatar Profiles Remove Error]:', profErr);
        }
        return { user: null, error: formatAvatarError(profErr.message) };
      }
      profileData = updatedProf || { avatar_url: null };
    }

    // Clear auth metadata
    const { data: updateUserData, error: authUpdateError } = await client.auth.updateUser({
      data: { avatar_url: '' },
    });

    if (authUpdateError && import.meta.env.DEV) {
      console.warn('[Luno Auth Metadata Clear Warning]:', authUpdateError);
    }

    const mappedUser = mapSupabaseUser(updateUserData?.user || user, { ...profileData, avatar_url: null });
    return { user: mappedUser, error: null };
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error('[Luno Avatar Remove Exception]:', err);
    }
    const msg = err instanceof Error ? formatAvatarError(err.message) : 'Failed to remove avatar.';
    return { user: null, error: msg };
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      const profile = await fetchOrCreateProfile(client, session.user);
      return mapSupabaseUser(session.user, profile);
    }
  } catch {}
  return null;
};

export const onAuthStateChange = (
  callback: (user: UserProfile | null, event?: string) => void
): (() => void) => {
  const client = getSupabaseClient();
  if (client) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void (async () => {
          const profile = await fetchOrCreateProfile(client, session.user);
          callback(mapSupabaseUser(session.user, profile), event);
        })();
      } else {
        callback(null, event);
      }
    });
    return () => subscription.unsubscribe();
  }

  // Not configured: immediately pass null for guest mode
  callback(null);
  return () => {};
};
