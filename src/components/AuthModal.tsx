import React, { useState } from 'react';
import { X, User, Lock, Mail, Cloud, CheckCircle2, AlertCircle, Loader2, Sparkles, KeyRound, Info } from 'lucide-react';
import { signUp, signIn } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { SyncEngine } from '../services/syncEngine';
import type { AppTheme, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: AppTheme;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();
  const isLight = theme === 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isConfigured) {
      setErrorMessage(
        'Cloud synchronization backend is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable remote accounts, or continue enjoying Luno locally.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        setStatusMessage('Creating account & securely syncing your local data...');
        const res = await signUp(email, password);

        if (res.error) {
          setErrorMessage(res.error);
          setIsLoading(false);
          return;
        }

        if (res.confirmationRequired) {
          setSuccessMessage(res.message || 'Account created! Please check your email inbox to confirm your address before signing in.');
          setIsLoading(false);
          return;
        }

        if (res.user) {
          // Migrate existing local data into the newly created account
          setStatusMessage('Backing up your focus history and presets...');
          const migrationRes = await SyncEngine.migrateLocalDataToAccount(res.user.id);
          if (!migrationRes.success) {
            setErrorMessage(migrationRes.error || 'Account created, but cloud migration encountered a problem. Local data is intact.');
          } else {
            setSuccessMessage('Account created! Your local data has been safely backed up to the cloud.');
          }

          onAuthSuccess(res.user);
          setTimeout(() => {
            onClose();
          }, 1400);
        }
      } else {
        setStatusMessage('Signing in & pulling your latest focus records...');
        const res = await signIn(email, password);

        if (res.error || !res.user) {
          setErrorMessage(res.error || 'Failed to sign in.');
          setIsLoading(false);
          return;
        }

        // Pull remote data and merge seamlessly with existing local records
        setStatusMessage('Merging cloud and local records...');
        await SyncEngine.pullAndMerge(res.user.id);
        setSuccessMessage('Signed in successfully! Your data is synchronized.');

        onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col cursor-default ${
          isLight ? 'text-slate-900 border-slate-200/80' : 'text-white border-white/15'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-4 border-b shrink-0 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white/10 text-white border-white/15'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-bold tracking-tight">
                {mode === 'signup' ? 'Create Luno Account' : 'Sign In to Luno'}
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                {mode === 'signup' ? 'Back up and sync your focus data' : 'Access your synced workspace'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close account modal"
            className={`p-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400'
                : 'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white/50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backend Configuration Status Notice */}
        {!isConfigured ? (
          <div className={`my-4 p-3.5 rounded-2xl border flex items-start space-x-3 text-xs leading-relaxed ${
            isLight
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
          }`}>
            <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Guest Mode Active</span>
              Cloud synchronization credentials have not been configured yet. All your tasks, timer settings, and history continue to be saved 100% locally on this device.
            </div>
          </div>
        ) : (
          <div className={`my-4 p-3 rounded-2xl border flex items-center space-x-3 text-xs ${
            isLight ? 'bg-indigo-50/70 border-indigo-100 text-indigo-900' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
          }`}>
            <Cloud className="w-4 h-4 shrink-0 text-indigo-500" />
            <div className="leading-snug">
              <span className="font-semibold">Local-First Guarantee:</span> Your existing tasks, statistics, and settings will be preserved and synchronized.
            </div>
          </div>
        )}

        {/* Mode Switch Tabs */}
        <div className={`grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-white/20 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-white/20 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-white/40'
              }`} />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                    : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
            >
              Password
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-white/40'
              }`} />
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                    : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                }`}
              />
            </div>
          </div>

          {statusMessage && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-pulse ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white/80'
            }`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50 ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Account & Save Data</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In & Sync</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className={`mt-5 pt-3 border-t text-center text-[11px] ${
          isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-white/50'
        }`}>
          Luno is 100% functional without an account. Sign in anytime to sync across devices.
        </div>
      </div>
    </div>
  );
};
