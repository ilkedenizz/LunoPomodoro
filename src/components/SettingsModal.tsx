import React, { useState, useRef } from 'react';
import {
  X,
  Volume2,
  Bell,
  RefreshCw,
  Sparkles,
  Sliders,
  Moon,
  Sun,
  Palette,
  Check,
  User,
  Cloud,
  LogOut,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Flame,
  Clock,
  Award,
  Calendar,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Send,
  AtSign,
  Camera,
  Edit3,
  Users,
  ChevronRight,
  Trash2,
  Upload,
  Globe,
} from 'lucide-react';
import type {
  TimerSettings,
  AppTheme,
  TimerColorId,
  UserProfile,
  SyncStatus,
  FocusSession,
  Task,
  AppLanguage,
} from '../types';
import { TIMER_COLORS } from '../utils/timerColors';
import {
  getCurrentStreak,
  getPomodoroCount,
  getTotalFocusMinutes,
  formatTotalFocusTime,
} from '../utils/statistics';
import { isToday } from '../utils/dates';
import { getTranslations } from '../utils/translations';
import {
  updateUserProfile,
  updateUserPassword,
  resendConfirmationEmail,
  validateNickname,
  checkNicknameAvailability,
  uploadAvatar,
  removeAvatar,
  validateAvatarFile,
} from '../services/auth';

interface DurationInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  isLight: boolean;
  unit?: string;
  language?: AppLanguage;
}

const DurationInput: React.FC<DurationInputProps> = ({
  id,
  label,
  value,
  onChange,
  isLight,
  unit = 'min',
  language = 'en',
}) => {
  const [localText, setLocalText] = useState<string | null>(null);

  const displayValue = localText !== null ? localText : value.toString();

  const commitValue = () => {
    if (localText === null) return;
    const parsed = parseInt(localText.trim(), 10);
    if (isNaN(parsed) || parsed < 1) {
      const safeVal = Math.max(1, Math.min(180, isNaN(parsed) ? value : 1));
      setLocalText(null);
      onChange(safeVal);
    } else {
      const clamped = Math.max(1, Math.min(180, parsed));
      setLocalText(null);
      onChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^\d+$/.test(raw)) {
      setLocalText(raw);
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
        onChange(parsed);
      }
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center transition-all ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
      }`}
    >
      <label
        htmlFor={id}
        className={`text-xs font-semibold tracking-wide mb-2.5 text-center ${
          isLight ? 'text-slate-700' : 'text-white/80'
        }`}
      >
        {label}
      </label>

      <div className="flex items-center space-x-1.5 w-full justify-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayValue}
          onFocus={() => setLocalText(value.toString())}
          onChange={handleInputChange}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          aria-label={language === 'tr' ? `${label} (dakika)` : `${label} in minutes`}
          className={`w-16 h-10 px-2 text-center font-timer font-bold text-lg sm:text-xl rounded-xl border transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20 shadow-sm'
              : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20 shadow-inner'
          }`}
        />
        <span className={`text-xs font-mono font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
          {unit}
        </span>
      </div>
    </div>
  );
};

export type SettingsModalTab = 'preferences' | 'account';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onSaveSettings: (newSettings: TimerSettings) => void;
  onResetStats: () => void;
  user?: UserProfile | null;
  syncStatus?: SyncStatus;
  sessions?: FocusSession[];
  tasks?: Task[];
  initialTab?: SettingsModalTab;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onSignOut?: () => void;
  onSyncNow?: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
  onOpenFriends?: () => void;
  incomingRequestsCount?: number;
  language?: AppLanguage;
}

const formatLastSynced = (timestamp: number | null): string => {
  if (!timestamp) return 'Not synced yet';
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 30) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetStats,
  user,
  syncStatus,
  sessions = [],
  initialTab = 'preferences',
  onOpenAuth,
  onSignOut,
  onSyncNow,
  onUserUpdate,
  onOpenFriends,
  incomingRequestsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsModalTab>(initialTab);

  // Profile Edit Mode Toggle & Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [nicknameInput, setNicknameInput] = useState(user?.nickname || '');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState<string>('');
  const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Avatar Upload State
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const isAvatarFailed = Boolean(user?.avatarUrl && failedAvatarUrl === user?.avatarUrl);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so identical file can be re-selected if needed
    e.target.value = '';

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      if (import.meta.env.DEV) {
        console.warn('[Luno Avatar Validation Warning]:', validation.error, file);
      }
      setAvatarError(validation.error);
      setAvatarSuccess(null);
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const res = await uploadAvatar(file);
      if (res.error) {
        setAvatarError(res.error);
      } else if (res.user) {
        setAvatarSuccess('Profile photo updated successfully!');
        onUserUpdate?.(res.user);
        setTimeout(() => setAvatarSuccess(null), 3500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload profile photo.';
      setAvatarError(msg);
      if (import.meta.env.DEV) {
        console.error('[Luno Avatar Error]:', err);
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl) return;

    setIsRemovingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const res = await removeAvatar();
      if (res.error) {
        setAvatarError(res.error);
      } else if (res.user) {
        setAvatarSuccess('Profile photo removed.');
        onUserUpdate?.(res.user);
        setTimeout(() => setAvatarSuccess(null), 3000);
      }
    } catch {
      setAvatarError('Failed to remove profile photo.');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Resend Email Verification State
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Sync now feedback state
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Sync initial tab when changed
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Update local inputs when user prop changes
  const [prevUserDisplayName, setPrevUserDisplayName] = useState(user?.displayName);
  if (user?.displayName !== prevUserDisplayName) {
    setPrevUserDisplayName(user?.displayName);
    setDisplayNameInput(user?.displayName || '');
  }

  const [prevUserNickname, setPrevUserNickname] = useState(user?.nickname);
  if (user?.nickname !== prevUserNickname) {
    setPrevUserNickname(user?.nickname);
    setNicknameInput(user?.nickname || '');
  }

  const handleNicknameChange = (val: string) => {
    const cleanVal = val.toLowerCase().replace(/\s+/g, '');
    setNicknameInput(cleanVal);

    if (nicknameDebounceRef.current) {
      clearTimeout(nicknameDebounceRef.current);
    }

    if (!cleanVal) {
      setNicknameStatus('invalid');
      setNicknameMessage('Nickname is required.');
      return;
    }

    if (cleanVal === (user?.nickname || '').toLowerCase()) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }

    const valRes = validateNickname(cleanVal);
    if (!valRes.valid) {
      setNicknameStatus('invalid');
      setNicknameMessage(valRes.error || 'Nickname must be 3-20 letters, numbers, or underscores.');
      return;
    }

    setNicknameStatus('checking');
    setNicknameMessage('Checking availability...');

    nicknameDebounceRef.current = setTimeout(async () => {
      try {
        const avail = await checkNicknameAvailability(cleanVal, user?.id);
        if (avail.available) {
          setNicknameStatus('available');
          setNicknameMessage('Nickname is available!');
        } else {
          setNicknameStatus('taken');
          setNicknameMessage(avail.error || 'This nickname is already taken.');
        }
      } catch {
        setNicknameStatus('idle');
        setNicknameMessage('');
      }
    }, 350);
  };

  if (!isOpen) return null;

  const language: AppLanguage = settings.language || 'en';
  const t = getTranslations(language);

  const handleChange = (key: keyof TimerSettings, value: unknown) => {
    onSaveSettings({ ...settings, [key]: value });
  };

  const isLight = settings.theme === 'light';

  // Real Focus Statistics
  const totalFocusMinutes = getTotalFocusMinutes(sessions);
  const completedPomodoros = getPomodoroCount(sessions);
  const todayFocusMinutes = sessions
    .filter((s) => isToday(s.timestamp) && s.mode === 'pomodoro')
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const currentStreakDays = getCurrentStreak(sessions);

  // Handle Profile Save (Nickname & Display Name)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanNickname = nicknameInput.trim().toLowerCase();
    const isNicknameChanged = cleanNickname !== (user.nickname || '').toLowerCase();
    const isDisplayNameChanged = displayNameInput.trim() !== (user.displayName || '');

    if (!isNicknameChanged && !isDisplayNameChanged) return;

    if (isNicknameChanged) {
      const valRes = validateNickname(cleanNickname);
      if (!valRes.valid) {
        setProfileSaveError(valRes.error || t.nicknameInvalid);
        return;
      }
      if (nicknameStatus === 'taken') {
        setProfileSaveError(t.nicknameTaken);
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      const res = await updateUserProfile({
        displayName: displayNameInput.trim(),
        ...(isNicknameChanged ? { nickname: cleanNickname } : {}),
      });

      if (res.error) {
        setProfileSaveError(res.error);
      } else if (res.user) {
        setProfileSaveSuccess(true);
        setNicknameStatus('idle');
        setNicknameMessage('');
        onUserUpdate?.(res.user);
        setTimeout(() => {
          setProfileSaveSuccess(false);
          setIsEditingProfile(false);
        }, 1200);
      }
    } catch {
      setProfileSaveError(language === 'tr' ? 'Profil güncellenemedi.' : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayNameInput(user?.displayName || '');
    setNicknameInput(user?.nickname || '');
    setNicknameStatus('idle');
    setNicknameMessage('');
    setIsEditingProfile(false);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  // Handle Password Change
  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(t.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch);
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await updateUserPassword(newPassword);
      if (res.error) {
        setPasswordError(res.error);
      } else {
        setPasswordSuccess(t.passwordUpdatedSuccess);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess(null);
        }, 2000);
      }
    } catch {
      setPasswordError(language === 'tr' ? 'Şifre güncellenemedi.' : 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Resend Email Confirmation
  const handleResendEmail = async () => {
    if (!user?.email || isResendingEmail) return;

    setIsResendingEmail(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      const res = await resendConfirmationEmail(user.email);
      if (res.error) {
        setResendError(res.error);
      } else {
        setResendSuccess(t.resendSuccess);
        setTimeout(() => setResendSuccess(null), 4000);
      }
    } catch {
      setResendError(language === 'tr' ? 'Doğrulama e-postası yeniden gönderilemedi.' : 'Failed to resend confirmation email.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Handle Manual Sync
  const handleTriggerSync = async () => {
    if (!onSyncNow) return;
    setIsManualSyncing(true);
    try {
      await onSyncNow();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  // Safe avatar initials
  const avatarInitials = user?.displayName
    ? user.displayName.trim().slice(0, 2).toUpperCase()
    : user?.nickname
    ? user.nickname.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'G';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg p-5 sm:p-7 rounded-t-3xl sm:rounded-3xl glass-modal overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col cursor-default ${
          isLight ? 'text-slate-900 border-slate-200/80' : 'text-white border-white/15'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header & Tab Navigation */}
        <div className={`pb-3.5 border-b shrink-0 space-y-3 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-white border-white/15'
              }`}>
                {activeTab === 'preferences' ? <Sliders className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <h2 id="settings-title" className={`text-lg sm:text-xl font-bold tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {activeTab === 'preferences' ? t.settingsPreferences : t.profileHub}
              </h2>
            </div>

            <button
              onClick={onClose}
              aria-label={t.close}
              className={`p-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400'
                  : 'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white/50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
                activeTab === 'preferences'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-white/20 text-white shadow-md border border-white/20'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.preferences}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
                activeTab === 'account'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-white/20 text-white shadow-md border border-white/20'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.profileHub}</span>
              {user && (
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus?.state === 'syncing'
                    ? 'bg-amber-400 animate-spin'
                    : (syncStatus?.pendingCount ?? 0) > 0
                    ? 'bg-amber-300'
                    : 'bg-emerald-400'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="space-y-6 py-4 overflow-y-auto pr-1 flex-1">
          {activeTab === 'preferences' ? (
            /* ==========================================================
               TAB 1: PREFERENCES & TIMER SETTINGS
               ========================================================== */
            <>
              {/* Language Selection */}
              <div>
                <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  <Globe className="w-3.5 h-3.5" /> {t.language}
                </h3>
                <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleChange('language', 'en')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      language === 'en'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                          : 'bg-white/20 text-white shadow-md border border-white/25 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('language', 'tr')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      language === 'tr'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                          : 'bg-white/20 text-white shadow-md border border-white/25 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🇹🇷</span>
                    <span>Türkçe</span>
                  </button>
                </div>
              </div>

              {/* Appearance / Theme Mode */}
              <div>
                <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  <Sun className="w-3.5 h-3.5" /> {t.appearanceTheme}
                </h3>
                <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleChange('theme', 'dark' as AppTheme)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      settings.theme !== 'light'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                          : 'bg-white/20 text-white shadow-md border border-white/25 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>{t.darkTheme}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('theme', 'light' as AppTheme)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      settings.theme === 'light'
                        ? 'bg-slate-900 text-white shadow-md font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>{t.lightTheme}</span>
                  </button>
                </div>
              </div>

              {/* Timer Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                    isLight ? 'text-slate-500' : 'text-white/50'
                  }`}>
                    <Palette className="w-3.5 h-3.5" /> {t.timerColor}
                  </h3>
                  <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                    {(() => {
                      const sel = TIMER_COLORS.find((c) => c.id === (settings.timerColor || 'default'));
                      return language === 'tr' ? sel?.nameTr : sel?.name;
                    })()}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
                    {TIMER_COLORS.map((color) => {
                      const isSelected = (settings.timerColor || 'default') === color.id;
                      const colLabel = language === 'tr' ? color.nameTr : color.name;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => handleChange('timerColor', color.id as TimerColorId)}
                          aria-label={`Select ${colLabel} timer color`}
                          title={`${color.name} (${color.nameTr})`}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 ${
                            isSelected
                              ? isLight
                                ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 ring-offset-white shadow-md'
                                : 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/50 shadow-lg'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: color.swatchHex,
                          }}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time Durations */}
              <div>
                <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  {t.timerDurations}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <DurationInput
                    id="setting-duration-focus"
                    label={language === 'tr' ? 'Odak' : 'Focus'}
                    value={settings.pomodoroDuration}
                    onChange={(val) => handleChange('pomodoroDuration', val)}
                    isLight={isLight}
                    unit={t.min}
                    language={language}
                  />

                  <DurationInput
                    id="setting-duration-short-break"
                    label={t.shortBreak}
                    value={settings.shortBreakDuration}
                    onChange={(val) => handleChange('shortBreakDuration', val)}
                    isLight={isLight}
                    unit={t.min}
                    language={language}
                  />

                  <DurationInput
                    id="setting-duration-long-break"
                    label={t.longBreak}
                    value={settings.longBreakDuration}
                    onChange={(val) => handleChange('longBreakDuration', val)}
                    isLight={isLight}
                    unit={t.min}
                    language={language}
                  />
                </div>
              </div>

              {/* Automation Toggles */}
              <div>
                <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" /> {t.automation}
                </h3>
                <div className="space-y-2.5">
                  <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                  }`}>
                    <span className="text-sm font-medium">{t.autoStartBreaks}</span>
                    <input
                      type="checkbox"
                      checked={settings.autoStartBreaks}
                      onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                  }`}>
                    <span className="text-sm font-medium">{t.autoStartPomodoros}</span>
                    <input
                      type="checkbox"
                      checked={settings.autoStartPomodoros}
                      onChange={(e) => handleChange('autoStartPomodoros', e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Audio & Notifications */}
              <div>
                <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  <Volume2 className="w-3.5 h-3.5" /> {t.audioNotifications}
                </h3>
                <div className="space-y-2.5">
                  <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Volume2 className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`} />
                      <span className="text-sm font-medium">{t.completionSound}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Bell className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`} />
                      <span className="text-sm font-medium">{t.browserNotifications}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) => {
                        if (e.target.checked && Notification.permission !== 'granted') {
                          Notification.requestPermission();
                        }
                        handleChange('notificationsEnabled', e.target.checked);
                      }}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* ==========================================================
               TAB 2: PROFILE HUB & ACCOUNT EXPERIENCE
               ========================================================== */
            <>
              {user ? (
                <div className="space-y-4">
                  {/* 1. Hero Profile Card */}
                  <div className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden transition-all ${
                    isLight
                      ? 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 border-slate-200 shadow-sm'
                      : 'bg-gradient-to-br from-white/10 via-white/5 to-indigo-950/20 border-white/15 shadow-xl'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        {/* Avatar with Camera Trigger & Live Indicator */}
                        <div className="relative group shrink-0">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl overflow-hidden ring-4 ring-white/15 relative">
                            {user.avatarUrl && !isAvatarFailed ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName || user.nickname || 'Avatar'}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  if (import.meta.env.DEV) {
                                    console.warn('[Luno Profile Avatar Load Failed]:', {
                                      avatarUrl: user.avatarUrl,
                                      error: e,
                                    });
                                  }
                                  setFailedAvatarUrl(user.avatarUrl || null);
                                }}
                              />
                            ) : (
                              <span className="font-timer tracking-wide">{avatarInitials}</span>
                            )}

                            {/* Upload / Remove Loader Overlay */}
                            {(isUploadingAvatar || isRemovingAvatar) && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10 rounded-full">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                            )}

                            {/* Hover Camera Action */}
                            {!isUploadingAvatar && !isRemovingAvatar && (
                              <button
                                type="button"
                                onClick={() => avatarFileInputRef.current?.click()}
                                aria-label={user.avatarUrl ? t.changePhoto : t.uploadPhoto}
                                className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-medium cursor-pointer z-10 rounded-full"
                              >
                                <Camera className="w-5 h-5 mb-0.5" />
                                <span>{user.avatarUrl ? (language === 'tr' ? 'Değiştir' : 'Change') : (language === 'tr' ? 'Yükle' : 'Upload')}</span>
                              </button>
                            )}
                          </div>

                          <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Nickname & Display Name */}
                          <div className="flex flex-wrap items-center gap-2">
                            {user.nickname ? (
                              <h3 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}>
                                @{user.nickname}
                              </h3>
                            ) : (
                              <h3 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}>
                                {user.displayName || user.email.split('@')[0]}
                              </h3>
                            )}
                            {user.displayName && (
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-white/10 text-white/80'
                              }`}>
                                {user.displayName}
                              </span>
                            )}
                          </div>

                          {/* Email & Verified Badge */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <div className="flex items-center space-x-1.5">
                              <Mail className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
                              <p className={`text-xs truncate max-w-[170px] sm:max-w-[220px] ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
                                {user.email}
                              </p>
                            </div>
                            {user.emailVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t.verified}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <AlertCircle className="w-3 h-3" />
                                <span>{t.unverified}</span>
                              </span>
                            )}
                          </div>

                          {/* Badges: Sync State & Total Focus Time */}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              syncStatus?.state === 'syncing'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : syncStatus?.state === 'offline'
                                ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                                : (syncStatus?.pendingCount ?? 0) > 0
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}>
                              <Cloud className="w-3 h-3" />
                              <span>
                                {syncStatus?.state === 'syncing'
                                  ? t.syncing
                                  : syncStatus?.state === 'offline'
                                  ? t.offline
                                  : (syncStatus?.pendingCount ?? 0) > 0
                                  ? t.savedLocally
                                  : t.cloudSynced}
                              </span>
                            </span>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isLight
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            }`}>
                              <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="font-timer">{formatTotalFocusTime(totalFocusMinutes, language)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions: Edit Profile & Sign Out */}
                      <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile((prev) => !prev)}
                          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                            isEditingProfile
                              ? isLight
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                                : 'bg-indigo-500 text-white shadow-indigo-500/30'
                              : isLight
                              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                              : 'bg-white/10 text-white hover:bg-white/15 border border-white/15'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditingProfile ? t.closeEdit : t.editProfile}</span>
                        </button>

                        <button
                          type="button"
                          onClick={onSignOut}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                              : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/25'
                          }`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{t.signOut}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Avatar Feedback Alerts */}
                    {avatarError && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{avatarError}</span>
                      </div>
                    )}
                    {avatarSuccess && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{avatarSuccess}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. "Profili Düzenle" (Edit Profile Panel) */}
                  {isEditingProfile && (
                    <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
                      isLight
                        ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-500/10'
                        : 'bg-slate-900/80 border-indigo-500/40 shadow-xl ring-1 ring-indigo-500/20'
                    }`}>
                      <div className="flex items-center justify-between border-b pb-2.5 border-dashed border-white/10">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-indigo-400" />
                          <h3 className="text-xs sm:text-sm font-bold">{t.editProfileDetails}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={`text-xs px-2 py-1 rounded-lg cursor-pointer ${
                            isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {t.cancel}
                        </button>
                      </div>

                      {/* Photo Actions Row */}
                      <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                            {user.avatarUrl && !isAvatarFailed ? (
                              <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  if (import.meta.env.DEV) {
                                    console.warn('[Luno Edit Avatar Load Failed]:', {
                                      avatarUrl: user.avatarUrl,
                                      error: e,
                                    });
                                  }
                                  setFailedAvatarUrl(user.avatarUrl || null);
                                }}
                              />
                            ) : (
                              avatarInitials
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold">{t.profilePhoto}</p>
                            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                              {t.photoHint}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={isUploadingAvatar || isRemovingAvatar}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                              isLight
                                ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                                : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingAvatar ? (language === 'tr' ? 'Yükleniyor...' : 'Uploading...') : t.uploadPhoto}</span>
                          </button>

                          {user.avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={isUploadingAvatar || isRemovingAvatar}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isRemovingAvatar ? (language === 'tr' ? 'Kaldırılıyor...' : 'Removing...') : t.removePhoto}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nickname & Display Name Form */}
                      <form onSubmit={handleSaveProfile} className="space-y-3.5">
                        {/* Nickname Input */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="edit-account-nickname"
                              className={`block text-xs font-medium ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                            >
                              {t.nicknameLabel}
                            </label>
                            <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
                              {t.nicknameHint}
                            </span>
                          </div>
                          <div className="relative">
                            <AtSign className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 ${
                              isLight ? 'text-slate-400' : 'text-white/40'
                            }`} />
                            <input
                              id="edit-account-nickname"
                              type="text"
                              autoComplete="username"
                              value={nicknameInput}
                              onChange={(e) => handleNicknameChange(e.target.value)}
                              placeholder={t.nicknamePlaceholder}
                              maxLength={20}
                              className={`w-full pl-10 pr-10 py-2 rounded-xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 ${
                                nicknameStatus === 'available'
                                  ? isLight
                                    ? 'bg-emerald-50/50 border-emerald-500 text-slate-900 focus:ring-emerald-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/50 text-white focus:ring-emerald-500/20'
                                  : nicknameStatus === 'taken' || nicknameStatus === 'invalid'
                                  ? isLight
                                    ? 'bg-rose-50/50 border-rose-500 text-slate-900 focus:ring-rose-500/20'
                                    : 'bg-rose-500/10 border-rose-500/50 text-white focus:ring-rose-500/20'
                                  : isLight
                                  ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                                  : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                              }`}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                              {nicknameStatus === 'checking' && (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                              )}
                              {nicknameStatus === 'available' && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              )}
                              {(nicknameStatus === 'taken' || nicknameStatus === 'invalid') && (
                                <AlertCircle className="w-4 h-4 text-rose-400" />
                              )}
                            </div>
                          </div>
                          {nicknameMessage && (
                            <p className={`text-[11px] mt-1 pl-1 flex items-center space-x-1 ${
                              nicknameStatus === 'available'
                                ? 'text-emerald-400'
                                : nicknameStatus === 'checking'
                                ? isLight ? 'text-indigo-600' : 'text-indigo-400'
                                : 'text-rose-400'
                            }`}>
                              <span>{nicknameMessage}</span>
                            </p>
                          )}
                        </div>

                        {/* Display Name Input */}
                        <div>
                          <label
                            htmlFor="edit-account-display-name"
                            className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                          >
                            {t.displayNameLabel}
                          </label>
                          <input
                            id="edit-account-display-name"
                            type="text"
                            value={displayNameInput}
                            onChange={(e) => setDisplayNameInput(e.target.value)}
                            placeholder={t.displayNamePlaceholder}
                            maxLength={40}
                            className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                                : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                            }`}
                          />
                        </div>

                        {/* Password Section Toggle inside Edit Panel */}
                        <div className="pt-2 border-t border-dashed border-white/10">
                          {!isChangingPassword ? (
                            <button
                              type="button"
                              onClick={() => setIsChangingPassword(true)}
                              className={`text-xs font-medium flex items-center gap-1.5 underline transition-colors cursor-pointer ${
                                isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-indigo-300 hover:text-indigo-200'
                              }`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>{t.changePasswordLink}</span>
                            </button>
                          ) : (
                            <div className="space-y-2.5 p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-indigo-400" /> {t.newPasswordLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChangingPassword(false);
                                    setPasswordError(null);
                                    setPasswordSuccess(null);
                                  }}
                                  className="text-[11px] opacity-60 hover:opacity-100 underline cursor-pointer"
                                >
                                  {language === 'tr' ? 'Gizle' : 'Hide'}
                                </button>
                              </div>
                              <input
                                type="password"
                                placeholder={t.newPasswordPlaceholder}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl text-xs border ${
                                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'
                                }`}
                              />
                              <input
                                type="password"
                                placeholder={t.confirmPasswordPlaceholder}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl text-xs border ${
                                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'
                                }`}
                              />
                              {passwordError && (
                                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{passwordError}</span>
                                </p>
                              )}
                              {passwordSuccess && (
                                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>{passwordSuccess}</span>
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={handleSavePassword}
                                disabled={isSavingPassword || !newPassword}
                                className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                                  isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                                }`}
                              >
                                {isSavingPassword ? t.updatingPassword : t.updatePassword}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Error and Form Action Buttons */}
                        <div className="flex items-center justify-between pt-2">
                          {profileSaveError ? (
                            <p className="text-[11px] text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{profileSaveError}</span>
                            </p>
                          ) : <div />}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {t.cancel}
                            </button>

                            <button
                              type="submit"
                              disabled={
                                isSavingProfile ||
                                (displayNameInput.trim() === (user.displayName || '') &&
                                  nicknameInput.trim().toLowerCase() === (user.nickname || '').toLowerCase()) ||
                                nicknameStatus === 'taken' ||
                                nicknameStatus === 'invalid'
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${
                                profileSaveSuccess
                                  ? 'bg-emerald-600 text-white'
                                  : isLight
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-white text-black hover:bg-white/90'
                              }`}
                            >
                              {isSavingProfile ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : profileSaveSuccess ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t.saved}</span>
                                </>
                              ) : (
                                <span>{t.saveChanges}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* 3. Live Focus Analytics Grid */}
                  <div className="space-y-3">
                    <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      <TrendingUp className="w-3.5 h-3.5" /> {t.focusStatistics}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Total Focus Time */}
                      <div className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                        isLight
                          ? 'bg-indigo-50/70 border-indigo-200/80 shadow-xs'
                          : 'bg-gradient-to-br from-indigo-500/15 via-white/5 to-white/5 border-indigo-500/30 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between text-indigo-400 mb-1.5">
                          <Clock className="w-4 h-4" />
                          <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                            {language === 'tr' ? 'TOPLAM' : 'TOTAL'}
                          </span>
                        </div>
                        <div>
                          <div className={`text-base sm:text-lg font-bold font-timer tracking-tight ${
                            isLight ? 'text-indigo-800' : 'text-indigo-200'
                          }`}>
                            {formatTotalFocusTime(totalFocusMinutes, language)}
                          </div>
                          <div className={`text-[10px] font-medium ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                            {t.totalFocusTime}
                          </div>
                        </div>
                      </div>

                      {/* Completed Pomodoros */}
                      <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center justify-between text-purple-400 mb-1.5">
                          <Award className="w-4 h-4" />
                          <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            {t.pomos}
                          </span>
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-bold font-timer">{completedPomodoros}</div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                            {t.completed}
                          </div>
                        </div>
                      </div>

                      {/* Today's Focus */}
                      <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center justify-between text-emerald-400 mb-1.5">
                          <TrendingUp className="w-4 h-4" />
                          <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            {language === 'tr' ? 'BUGÜN' : 'TODAY'}
                          </span>
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-bold font-timer">
                            {formatTotalFocusTime(todayFocusMinutes, language)}
                          </div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                            {t.todayFocus}
                          </div>
                        </div>
                      </div>

                      {/* Current Streak */}
                      <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center justify-between text-amber-400 mb-1.5">
                          <Flame className="w-4 h-4" />
                          <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            {t.streak}
                          </span>
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-bold font-timer">
                            {currentStreakDays} {currentStreakDays === 1 ? t.day : t.days}
                          </div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                            {t.activeStreak}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Friends & Community Hub Card */}
                  {onOpenFriends && (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isLight
                        ? 'bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border-indigo-200/80 hover:border-indigo-300'
                        : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/25 hover:border-indigo-500/40'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold truncate">{language === 'tr' ? 'Arkadaşlar & Topluluk' : 'Friends & Community'}</h4>
                            {incomingRequestsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white animate-pulse">
                                {incomingRequestsCount} {t.newRequest}
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] truncate ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                            {t.friendsCommunityDesc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenFriends();
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-all ${
                          isLight
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md'
                        }`}
                      >
                        <span>{t.openFriends}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* 5. Cloud Sync & Security Details */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Cloud className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
                        <span className={isLight ? 'text-slate-600' : 'text-white/70'}>{t.lastCloudSync}</span>
                      </div>
                      <span className="font-semibold font-mono text-[11px]">
                        {formatLastSynced(syncStatus?.lastSyncedAt ?? null)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-dashed border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
                        <span className={isLight ? 'text-slate-600' : 'text-white/70'}>{t.memberSince}</span>
                      </div>
                      <span className="font-medium">
                        {new Date(user.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Email Verification Row (if unverified) */}
                    {!user.emailVerified && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-amber-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t.emailUnverified}
                          </span>
                          <button
                            type="button"
                            onClick={handleResendEmail}
                            disabled={isResendingEmail}
                            className="text-amber-300 hover:text-amber-200 text-xs font-semibold underline flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isResendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            <span>{t.resendEmail}</span>
                          </button>
                        </div>
                        {resendSuccess && (
                          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>{resendSuccess}</span>
                          </p>
                        )}
                        {resendError && (
                          <p className="text-[11px] text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{resendError}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {(syncStatus?.pendingCount ?? 0) > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                        <span>{syncStatus?.pendingCount} {t.unsyncedChanges}</span>
                        <span className="text-[10px] opacity-80">{t.autoRetrying}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleTriggerSync}
                      disabled={isManualSyncing || syncStatus?.state === 'syncing'}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                          : 'bg-white/10 hover:bg-white/15 border-white/15 text-white shadow-md'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus?.state === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>{isManualSyncing || syncStatus?.state === 'syncing' ? t.syncingRecords : t.syncNow}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* GUEST / LOCAL MODE VIEW */
                <div className="space-y-4 py-2">
                  <div className={`p-6 rounded-3xl border text-center space-y-3.5 ${
                    isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 shadow-lg'
                  }`}>
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">{t.localGuestMode}</h3>
                      <p className={`text-xs max-w-xs mx-auto mt-1 leading-relaxed ${
                        isLight ? 'text-slate-600' : 'text-white/70'
                      }`}>
                        {t.guestModeDesc}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAuth?.('signin');
                        }}
                        className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md ${
                          isLight
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        <Cloud className="w-4 h-4" />
                        <span>{t.signInCreateAccount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Local Focus Statistics */}
                  <div className="space-y-3">
                    <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      <TrendingUp className="w-3.5 h-3.5" /> {t.localFocusStats}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className={`p-3.5 rounded-2xl border ${
                        isLight ? 'bg-indigo-50/70 border-indigo-200/80' : 'bg-indigo-500/15 border-indigo-500/30'
                      }`}>
                        <div className="text-xs font-bold font-timer text-indigo-400">{formatTotalFocusTime(totalFocusMinutes, language)}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{t.allTimeFocus}</div>
                      </div>
                      <div className={`p-3.5 rounded-2xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-xs font-bold font-timer">{completedPomodoros}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{t.pomodoro}</div>
                      </div>
                      <div className={`p-3.5 rounded-2xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-xs font-bold font-timer">{formatTotalFocusTime(todayFocusMinutes, language)}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{t.today}</div>
                      </div>
                      <div className={`p-3.5 rounded-2xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="text-xs font-bold font-timer">{currentStreakDays}{language === 'tr' ? 'g' : 'd'}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{t.streak}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`pt-3.5 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          {activeTab === 'preferences' ? (
            <button
              onClick={() => {
                if (confirm(t.resetConfirm)) {
                  onResetStats();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-all font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t.resetTodayStats}
            </button>
          ) : (
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              Luno Cloud Sync v2
            </span>
          )}

          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                : 'bg-white text-black hover:bg-white/90 shadow-md'
            }`}
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
