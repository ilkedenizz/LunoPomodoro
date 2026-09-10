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

export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { user: null, error: 'Please provide a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: UNCONFIGURED_AUTH_ERROR };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
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
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        createdAt: data.user.created_at ? new Date(data.user.created_at).getTime() : Date.now(),
      };
      return { user: userProfile, error: null };
    }

    return { user: null, error: 'Unable to complete account registration.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sign up encountered an unexpected error.';
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
      return { user: null, error: error.message };
    }

    if (data.user) {
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        createdAt: data.user.created_at ? new Date(data.user.created_at).getTime() : Date.now(),
      };
      return { user: userProfile, error: null };
    }

    return { user: null, error: 'Unable to sign in.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sign in encountered an unexpected error.';
    return { user: null, error: msg };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.auth.signOut();
      if (error) return { error: error.message };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign out failed.' };
    }
  }
  return { error: null };
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
        createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : Date.now(),
      };
    }
  } catch {}
  return null;
};

export const onAuthStateChange = (
  callback: (user: UserProfile | null) => void
): (() => void) => {
  const client = getSupabaseClient();
  if (client) {
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : Date.now(),
        });
      } else {
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  }

  // Not configured: immediately pass null for guest mode
  callback(null);
  return () => {};
};
