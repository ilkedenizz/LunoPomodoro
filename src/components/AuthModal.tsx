import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  KeyRound,
  Info,
  ArrowLeft,
  Send,
  Check,
  RotateCw,
  AtSign,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  signUp,
  signIn,
  resetPasswordForEmail,
  updateUserPassword,
  resendConfirmationEmail,
  validateNickname,
  checkNicknameAvailability,
} from '../services/auth';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { SyncEngine } from '../services/syncEngine';
import type { AppTheme, UserProfile, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

export type AuthModalMode =
  | 'signin'
  | 'signup'
  | 'forgot-password'
  | 'update-password'
  | 'email-confirmation-pending';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: AppTheme;
  language?: AppLanguage;
  initialMode?: AuthModalMode;
  initialError?: string | null;
  initialSuccess?: string | null;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  language = 'en',
  initialMode = 'signup',
  initialError = null,
  initialSuccess = null,
  onAuthSuccess,
}) => {
  const t = getTranslations(language);
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [pendingConfirmationEmailState, setPendingConfirmationEmailState] = useState<string>('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess || null);

  const handleNicknameChange = (val: string) => {
    const cleanVal = val.toLowerCase().replace(/\s+/g, '');
    setNickname(cleanVal);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!cleanVal) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }

    const valRes = validateNickname(cleanVal);
    if (!valRes.valid) {
      setNicknameStatus('invalid');
      setNicknameMessage(valRes.error || t.nicknameInvalid);
      return;
    }

    setNicknameStatus('checking');
    setNicknameMessage(t.nicknameChecking);

    debounceRef.current = setTimeout(async () => {
      try {
        const avail = await checkNicknameAvailability(cleanVal);
        if (avail.available) {
          setNicknameStatus('available');
          setNicknameMessage(t.nicknameAvailable);
        } else {
          setNicknameStatus('taken');
          setNicknameMessage(avail.error || t.nicknameTaken);
        }
      } catch {
        setNicknameStatus('idle');
        setNicknameMessage('');
      }
    }, 350);
  };

  const [prevInitialMode, setPrevInitialMode] = useState<AuthModalMode>(initialMode);
  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
    setErrorMessage(initialError || null);
    setSuccessMessage(initialSuccess || null);
    setStatusMessage(null);
  }

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();
  const isLight = theme === 'light';

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage(null);
  };

  const handleModeChange = (newMode: AuthModalMode) => {
    clearMessages();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!isConfigured) {
      setErrorMessage(
        'Cloud synchronization backend is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable remote accounts, or continue enjoying Luno locally.'
      );
      return;
    }

    if (isLoading) return;

    // 1. SIGN UP FLOW
    if (mode === 'signup') {
      if (nickname.trim()) {
        const valRes = validateNickname(nickname);
        if (!valRes.valid) {
          setErrorMessage(valRes.error || (language === 'tr' ? 'Geçersiz kullanıcı adı.' : 'Invalid nickname.'));
          return;
        }
        if (nicknameStatus === 'taken') {
          setErrorMessage(language === 'tr' ? 'Bu kullanıcı adı zaten alınmış. Lütfen başka bir ad seçin.' : 'This nickname is already taken. Please choose another.');
          return;
        }
      } else {
        setErrorMessage(language === 'tr' ? 'Lütfen bir kullanıcı adı belirleyin.' : 'Please choose a nickname.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage(language === 'tr' ? 'Şifreler eşleşmiyor. Lütfen şifrenizi tekrar girin.' : 'Passwords do not match. Please re-enter your password.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage(language === 'tr' ? 'Şifre en az 6 karakter uzunluğunda olmalıdır.' : 'Password must be at least 6 characters long.');
        return;
      }

      setIsLoading(true);
      setStatusMessage(language === 'tr' ? 'Hesabınız oluşturuluyor...' : 'Creating your account...');

      try {
        const res = await signUp(email, password, nickname);

        if (res.error) {
          setErrorMessage(res.error);
          setIsLoading(false);
          return;
        }

        if (res.confirmationRequired) {
          setPendingConfirmationEmailState(email.trim().toLowerCase());
          setMode('email-confirmation-pending');
          setSuccessMessage(res.message || (language === 'tr' ? 'Hesap oluşturuldu! Lütfen e-postanızı doğrulayın.' : 'Account created! Please verify your email.'));
          setIsLoading(false);
          return;
        }

        if (res.user) {
          setStatusMessage(language === 'tr' ? 'Yerel odak verileriniz hesabınıza aktarılıyor...' : 'Synchronizing your local focus data with your account...');
          // Migrate local records to the newly created account so no local work is lost
          await SyncEngine.migrateLocalDataToAccount(res.user.id);

          setSuccessMessage(language === 'tr' ? "Hesap oluşturuldu! Luno'ya hoş geldiniz." : 'Account created! Welcome to Luno.');
          onAuthSuccess(res.user);
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (language === 'tr' ? 'Kayıt başarısız oldu.' : 'Sign up failed.');
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
      return;
    }

    // 2. SIGN IN FLOW
    if (mode === 'signin') {
      setIsLoading(true);
      setStatusMessage(language === 'tr' ? 'Giriş yapılıyor ve verileriniz eşitleniyor...' : 'Signing in & synchronizing your cloud records...');

      try {
        const res = await signIn(email, password);

        if (res.error || !res.user) {
          setErrorMessage(res.error || (language === 'tr' ? 'Giriş yapılamadı.' : 'Failed to sign in.'));
          setIsLoading(false);
          return;
        }

        setStatusMessage(language === 'tr' ? 'Bulut odak kayıtlarınız yükleniyor...' : 'Loading your cloud focus records...');
        await SyncEngine.pullAndMerge(res.user.id);
        setSuccessMessage(language === 'tr' ? 'Giriş başarılı! Verileriniz senkronize edildi.' : 'Signed in successfully! Your data is synchronized.');

        onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (language === 'tr' ? 'Giriş başarısız oldu.' : 'Sign in failed.');
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
      return;
    }

    // 3. FORGOT PASSWORD FLOW
    if (mode === 'forgot-password') {
      setIsLoading(true);
      setStatusMessage(language === 'tr' ? 'Şifre sıfırlama talimatları gönderiliyor...' : 'Sending password recovery instructions...');

      try {
        const res = await resetPasswordForEmail(email);
        if (!res.success) {
          setErrorMessage(res.error || (language === 'tr' ? 'Şifre sıfırlama e-postası gönderilemedi.' : 'Failed to send password reset email.'));
        } else {
          setSuccessMessage(
            language === 'tr'
              ? `Şifre sıfırlama bağlantısı ${email} adresine gönderildi. Lütfen gelen kutunuzu kontrol edin.`
              : `Password reset link sent to ${email}. Please check your inbox and click the link to choose a new password.`
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (language === 'tr' ? 'Şifre kurtarma bağlantısı gönderilemedi.' : 'Failed to send password recovery link.');
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
      return;
    }

    // 4. UPDATE PASSWORD FLOW (Password Recovery Link clicked)
    if (mode === 'update-password') {
      if (newPassword !== confirmNewPassword) {
        setErrorMessage(language === 'tr' ? 'Yeni şifreler eşleşmiyor. Lütfen şifrenizi tekrar girin.' : 'New passwords do not match. Please re-enter your password.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage(language === 'tr' ? 'Şifre en az 6 karakter uzunluğunda olmalıdır.' : 'Password must be at least 6 characters long.');
        return;
      }

      setIsLoading(true);
      setStatusMessage(language === 'tr' ? 'Şifreniz güncelleniyor...' : 'Updating your password...');

      try {
        const res = await updateUserPassword(newPassword);
        if (!res.success) {
          setErrorMessage(res.error || (language === 'tr' ? 'Şifre güncellenemedi.' : 'Failed to update password.'));
        } else {
          setSuccessMessage(language === 'tr' ? 'Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.' : 'Password updated successfully! You can now use your new password.');
          setTimeout(() => {
            handleModeChange('signin');
          }, 1800);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (language === 'tr' ? 'Şifre güncellenemedi.' : 'Failed to update password.');
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = pendingConfirmationEmailState || email;
    if (!targetEmail) return;

    setIsResending(true);
    clearMessages();

    try {
      const res = await resendConfirmationEmail(targetEmail);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(
          language === 'tr'
            ? `Doğrulama e-postası ${targetEmail} adresine yeniden gönderildi. Lütfen gelen kutunuzu kontrol edin.`
            : `Confirmation email resent to ${targetEmail}. Please check your inbox.`
        );
      }
    } catch {
      setErrorMessage(language === 'tr' ? 'Doğrulama e-postası yeniden gönderilemedi. Lütfen daha sonra tekrar deneyin.' : 'Failed to resend confirmation email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md p-4 sm:p-7 rounded-t-3xl sm:rounded-3xl glass-modal shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92dvh] flex flex-col cursor-default pb-[max(1.25rem,var(--sab))] ${
          isLight ? 'text-slate-900 border-slate-200/80' : 'text-white border-white/15'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3.5 border-b shrink-0 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            {mode === 'forgot-password' || mode === 'update-password' || mode === 'email-confirmation-pending' ? (
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                aria-label={t.backToSignIn}
                className={`p-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className={`p-2 rounded-xl border shrink-0 ${
                isLight ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white/10 text-white border-white/15'
              }`}>
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="text-base sm:text-lg font-bold tracking-tight truncate">
                {mode === 'signup'
                  ? (language === 'tr' ? 'Luno Hesabı Oluştur' : 'Create Luno Account')
                  : mode === 'signin'
                  ? (language === 'tr' ? "Luno'ya Giriş Yap" : 'Sign In to Luno')
                  : mode === 'forgot-password'
                  ? (language === 'tr' ? 'Şifre Sıfırlama' : 'Reset Password')
                  : mode === 'update-password'
                  ? (language === 'tr' ? 'Yeni Şifre Belirle' : 'Set New Password')
                  : (language === 'tr' ? 'E-postanızı Doğrulayın' : 'Verify Your Email')}
              </h2>
              <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                {mode === 'signup'
                  ? (language === 'tr' ? 'Odak verilerinizi yedekleyin ve eşitleyin' : 'Back up and sync your focus data')
                  : mode === 'signin'
                  ? (language === 'tr' ? 'Senkronize çalışma alanınıza erişin' : 'Access your synced workspace')
                  : mode === 'forgot-password'
                  ? (language === 'tr' ? 'Size bir kurtarma bağlantısı göndereceğiz' : 'We will email you a recovery link')
                  : mode === 'update-password'
                  ? (language === 'tr' ? 'Güvenli yeni bir şifre seçin' : 'Choose a secure new password')
                  : (language === 'tr' ? 'Etkinleştirmek için gelen kutunuzu kontrol edin' : 'Check your email inbox to activate')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.close}
            className={`p-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400'
                : 'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white/50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto py-3.5 space-y-3.5 pr-0.5">
          {/* Unconfigured Backend Status Notice */}
          {!isConfigured ? (
            <div className={`p-3 rounded-2xl border flex items-start space-x-2.5 text-xs leading-relaxed ${
              isLight
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
            }`}>
              <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">{language === 'tr' ? 'Misafir Modu Aktif' : 'Guest Mode Active'}</span>
                {language === 'tr'
                  ? 'Bulut senkronizasyon bilgileri henüz yapılandırılmamış. Tüm görevleriniz, zamanlayıcı ayarlarınız ve geçmişiniz bu cihazda %100 yerel olarak kaydedilmeye devam eder.'
                  : 'Cloud synchronization credentials have not been configured yet. All your tasks, timer settings, and history continue to be saved 100% locally on this device.'}
              </div>
            </div>
          ) : (mode === 'signup' || mode === 'signin') ? (
            <div className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 text-xs ${
              isLight ? 'bg-indigo-50/70 border-indigo-100 text-indigo-900' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
            }`}>
              <Cloud className="w-4 h-4 shrink-0 text-indigo-500" />
              <div className="leading-snug">
                <span className="font-semibold">{language === 'tr' ? 'Yerel Öncelikli Güvence:' : 'Local-First Guarantee:'}</span> {language === 'tr' ? 'Mevcut görevleriniz, istatistikleriniz ve ayarlarınız veri kaybı olmadan korunur.' : 'Your existing tasks, statistics, and settings will be preserved without data loss.'}
              </div>
            </div>
          ) : null}

          {/* Mode Switch Tabs (Signup / Signin only) */}
          {(mode === 'signup' || mode === 'signin') && (
            <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all min-h-[38px] ${
                  mode === 'signup'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white/20 text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t.createAccountBtn}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all min-h-[38px] ${
                  mode === 'signin'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-white/20 text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t.signInBtn}
              </button>
            </div>
          )}

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex flex-col space-y-2 animate-in fade-in">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
              {errorMessage.toLowerCase().includes('confirm your email') && (
                <button
                  type="button"
                  onClick={() => {
                    setPendingConfirmationEmailState(email.trim().toLowerCase());
                    handleModeChange('email-confirmation-pending');
                  }}
                  className="self-start text-[11px] font-semibold underline text-indigo-300 hover:text-indigo-200 mt-1 cursor-pointer"
                >
                  {language === 'tr' ? 'E-posta doğrulama ekranına git ve yeniden gönder' : 'Go to email verification screen & resend'}
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMessage}</span>
            </div>
          )}

          {/* 1. EMAIL CONFIRMATION PENDING VIEW */}
          {mode === 'email-confirmation-pending' ? (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">{language === 'tr' ? 'Gelen kutunuzu kontrol edin' : 'Check your inbox'}</h3>
                <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                  {language === 'tr' ? (
                    <>
                      <span className="font-semibold text-indigo-400">{pendingConfirmationEmailState || email}</span> adresine bir doğrulama bağlantısı gönderdik. Hesabınızı etkinleştirmek için e-postadaki bağlantıya tıklayın.
                    </>
                  ) : (
                    <>
                      We sent a confirmation link to <span className="font-semibold text-indigo-400">{pendingConfirmationEmailState || email}</span>. Click the link in the email to activate your account.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer shadow-md ${
                    isLight
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Doğruladım — Giriş Yap' : "I've Confirmed — Sign In"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className={`w-full py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-center space-x-1.5 min-h-[40px] cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'tr' ? 'E-posta yeniden gönderiliyor...' : 'Resending email...'}</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{t.resendEmail}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* 2. FORM VIEW (SIGN UP / SIGN IN / FORGOT PASSWORD / UPDATE PASSWORD) */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nickname field (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="auth-nickname"
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
                      id="auth-nickname"
                      type="text"
                      autoComplete="username"
                      required
                      value={nickname}
                      onChange={(e) => handleNicknameChange(e.target.value)}
                      placeholder={t.nicknamePlaceholder}
                      maxLength={20}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
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
              )}

              {/* Email field (not needed in update-password) */}
              {mode !== 'update-password' && (
                <div>
                  <label
                    htmlFor="auth-email"
                    className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                  >
                    {t.emailLabel}
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
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                          : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Password field (Sign In & Sign Up) */}
              {(mode === 'signup' || mode === 'signin') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="auth-password"
                      className={`block text-xs font-medium ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                    >
                      {t.passwordLabel}
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot-password')}
                        className={`text-[11px] font-medium transition-colors hover:underline ${
                          isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-indigo-300 hover:text-indigo-200'
                        }`}
                      >
                        {t.forgotPassword}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-slate-400' : 'text-white/40'
                    }`} />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                          : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors focus:outline-none ${
                        isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password field (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                  >
                    {t.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-slate-400' : 'text-white/40'
                    }`} />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                          : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors focus:outline-none ${
                        isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password & Confirm New Password (Update Password only) */}
              {mode === 'update-password' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-new-password"
                      className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                    >
                      {t.newPasswordLabel}
                    </label>
                    <div className="relative">
                      <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${
                        isLight ? 'text-slate-400' : 'text-white/40'
                      }`} />
                      <input
                        id="auth-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                            : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors focus:outline-none ${
                          isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'
                        }`}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-confirm-new-password"
                      className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-white/80'}`}
                    >
                      {t.confirmPasswordPlaceholder}
                    </label>
                    <div className="relative">
                      <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${
                        isLight ? 'text-slate-400' : 'text-white/40'
                      }`} />
                      <input
                        id="auth-confirm-new-password"
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 min-h-[44px] ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                            : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                        aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors focus:outline-none ${
                          isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'
                        }`}
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Status Indicator */}
              {statusMessage && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-pulse ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white/80'
                }`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <span className="truncate">{statusMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50 min-h-[44px] ${
                  isLight
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'tr' ? 'İşleniyor...' : 'Processing...'}</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.createAccountBtn}</span>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t.signInBtn}</span>
                  </>
                ) : mode === 'forgot-password' ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.sendResetLink}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t.updatePasswordBtn}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className={`pt-3 border-t text-center text-[11px] shrink-0 ${
          isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-white/50'
        }`}>
          {language === 'tr'
            ? 'Luno hesap olmadan %100 işlevseldir. Cihazlar arası eşitlemek için istediğiniz zaman giriş yapabilirsiniz.'
            : 'Luno is 100% functional without an account. Sign in anytime to sync across devices.'}
        </div>
      </div>
    </div>
  );
};

