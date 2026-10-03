import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Check,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Calendar,
  AtSign,
  ArrowLeft,
  Eye,
  Swords,
  BookOpen,
} from 'lucide-react';
import type { AppTheme, UserProfile, Friend, FriendRequest, PublicUserProfile, AppLanguage, StudyGroup } from '../types';
import { getTranslations, formatDurationHoursMinutes } from '../utils/translations';
import {
  searchUsers,
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
  getFriendPublicStats,
  type FriendPublicStats,
} from '../services/friends';
import { getUserStudyGroups, inviteFriendToGroup } from '../services/groups';
import { loadSessions } from '../utils/storage';
import { isToday } from '../utils/dates';
import { getSessionMinutes } from '../utils/statistics';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  theme?: AppTheme;
  language?: AppLanguage;
  onOpenAuth?: () => void;
  onRequestCountChange?: (count: number) => void;
  initialSelectedFriend?: PublicUserProfile | Friend | null;
}

type FriendsTab = 'friends' | 'requests' | 'search';

const formatFriendSinceDate = (since: number | string | undefined | null, lang: AppLanguage): string => {
  if (!since) return lang === 'tr' ? 'Arkadaş' : 'Friends';
  const timestamp = typeof since === 'string' ? Number(since) : since;
  const d = new Date(isNaN(timestamp) ? since : timestamp);
  if (isNaN(d.getTime())) {
    return lang === 'tr' ? 'Arkadaş' : 'Friends';
  }
  return lang === 'tr'
    ? `${d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })} tarihinden beri arkadaşsınız`
    : `Friends since ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const FriendAvatar: React.FC<{
  avatarUrl?: string | null;
  nickname?: string | null;
  displayName?: string | null;
  size?: 'sm' | 'md';
}> = ({ avatarUrl, nickname, displayName, size = 'md' }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = (displayName || nickname || 'U').slice(0, 2).toUpperCase();

  const isFailed = Boolean(avatarUrl && failedUrl === avatarUrl);
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm';

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-md overflow-hidden shrink-0 border border-white/15`}
    >
      {avatarUrl && !isFailed ? (
        <img
          src={avatarUrl}
          alt={nickname || 'User'}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            if (import.meta.env.DEV) {
              console.warn('[Luno FriendAvatar Image Load Failed]:', {
                nickname,
                avatarUrl,
                error: e,
              });
            }
            setFailedUrl(avatarUrl);
          }}
          loading="lazy"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  user,
  theme = 'dark',
  language = 'en',
  onOpenAuth,
  onRequestCountChange,
  initialSelectedFriend,
}) => {
  const t = getTranslations(language);
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<FriendsTab>('friends');

  // Lists state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedCountRef = useRef<number>(-1);

  // Action loading IDs
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Selected Friend Profile & Comparison State
  const [selectedFriend, setSelectedFriend] = useState<Friend | PublicUserProfile | null>(initialSelectedFriend || null);
  const [friendStats, setFriendStats] = useState<FriendPublicStats | null>(null);
  const [isLoadingFriendStats, setIsLoadingFriendStats] = useState(false);

  // Group Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [userGroups, setUserGroups] = useState<StudyGroup[]>([]);
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(false);
  const [sendingInviteGroupId, setSendingInviteGroupId] = useState<string | null>(null);

  // User's own focus stats for comparison
  const myStats = useMemo(() => {
    if (!isOpen) return { todayMinutes: 0, weekMinutes: 0, monthMinutes: 0, totalMinutes: 0, totalSessions: 0, dailyAverageMinutes: 0 };
    const sessions = loadSessions();
    const todaySes = sessions.filter((s) => isToday(s.timestamp) && s.mode === 'pomodoro');
    const weekSes = sessions.filter((s) => s.timestamp >= Date.now() - 7 * 86400 * 1000 && s.mode === 'pomodoro');
    const monthSes = sessions.filter((s) => s.timestamp >= Date.now() - 30 * 86400 * 1000 && s.mode === 'pomodoro');
    const totalSes = sessions.filter((s) => s.mode === 'pomodoro');

    const todayMins = todaySes.reduce((acc, s) => acc + getSessionMinutes(s), 0);
    const weekMins = weekSes.reduce((acc, s) => acc + getSessionMinutes(s), 0);
    const monthMins = monthSes.reduce((acc, s) => acc + getSessionMinutes(s), 0);
    const totalMins = totalSes.reduce((acc, s) => acc + getSessionMinutes(s), 0);
    const totalCount = totalSes.filter((s) => s.completed !== false).length;
    const activeDaysCount = Math.max(1, new Set(totalSes.map((s) => new Date(s.timestamp).toDateString())).size);
    const dailyAvgMins = Math.round(totalMins / activeDaysCount);

    return {
      todayMinutes: todayMins,
      weekMinutes: weekMins,
      monthMinutes: monthMins,
      totalMinutes: totalMins,
      totalSessions: totalCount,
      dailyAverageMinutes: dailyAvgMins,
    };
  }, [isOpen]);

  const handleSelectFriend = useCallback(async (friend: Friend | PublicUserProfile) => {
    setSelectedFriend(friend);
    setIsLoadingFriendStats(true);
    setFriendStats(null);
    try {
      const stats = await getFriendPublicStats(friend.id);
      setFriendStats(stats);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno getFriendPublicStats Error]:', err);
    } finally {
      setIsLoadingFriendStats(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && initialSelectedFriend) {
      handleSelectFriend(initialSelectedFriend);
    }
  }, [isOpen, initialSelectedFriend, handleSelectFriend]);

  const handleOpenGroupInvite = async () => {
    if (!user) {
      setFeedback({
        type: 'error',
        message: language === 'tr' ? 'Gruba davet etmek için hesabınızla giriş yapmalısınız.' : 'Please sign in to invite friends to a study group.',
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    setIsInviteModalOpen(true);
    setIsLoadingUserGroups(true);
    try {
      const groups = await getUserStudyGroups(user.id);
      setUserGroups(groups);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno invite friend load groups error]:', err);
    } finally {
      setIsLoadingUserGroups(false);
    }
  };

  const handleSendGroupInvite = async (groupId: string) => {
    if (!selectedFriend || !user) return;
    setSendingInviteGroupId(groupId);
    try {
      const res = await inviteFriendToGroup(groupId, selectedFriend.id, user.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: language === 'tr' ? `@${selectedFriend.nickname || 'kullanıcı'} gruba davet edildi!` : `Invited @${selectedFriend.nickname || 'user'} to group!`,
        });
        setTimeout(() => setFeedback(null), 3500);
        setIsInviteModalOpen(false);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (language === 'tr' ? 'Davet gönderilemedi.' : 'Failed to send invite.'),
        });
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (language === 'tr' ? 'Hata oluştu.' : 'An error occurred.'),
      });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setSendingInviteGroupId(null);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  // Load friends and requests
  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingLists(true);
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        getFriendsList(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      const safeFriends = Array.isArray(friendsData) ? friendsData : [];
      const safeIncoming = Array.isArray(incomingData) ? incomingData : [];
      const safeOutgoing = Array.isArray(outgoingData) ? outgoingData : [];

      setFriends(safeFriends);
      setIncomingRequests(safeIncoming);
      setOutgoingRequests(safeOutgoing);
      if (lastReportedCountRef.current !== safeIncoming.length) {
        lastReportedCountRef.current = safeIncoming.length;
        onRequestCountChange?.(safeIncoming.length);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Luno Friends Load Error]:', err);
      }
    } finally {
      setIsLoadingLists(false);
    }
  }, [user, onRequestCountChange]);

  useEffect(() => {
    if (!isOpen || !user) return;
    let isCurrent = true;

    (async () => {
      try {
        const [friendsData, incomingData, outgoingData] = await Promise.all([
          getFriendsList(),
          getIncomingFriendRequests(),
          getOutgoingFriendRequests(),
        ]);
        if (!isCurrent) return;
        const safeFriends = Array.isArray(friendsData) ? friendsData : [];
        const safeIncoming = Array.isArray(incomingData) ? incomingData : [];
        const safeOutgoing = Array.isArray(outgoingData) ? outgoingData : [];

        setFriends(safeFriends);
        setIncomingRequests(safeIncoming);
        setOutgoingRequests(safeOutgoing);
        if (lastReportedCountRef.current !== safeIncoming.length) {
          lastReportedCountRef.current = safeIncoming.length;
          onRequestCountChange?.(safeIncoming.length);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Luno Friends Load Error]:', err);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingLists(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, user, onRequestCountChange]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const clean = value.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(clean);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Luno Friends Search Error]:', err);
        }
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Action handlers
  const handleSendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      const res = await sendFriendRequest(targetUserId);
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', language === 'tr' ? 'Arkadaşlık isteği gönderildi!' : (res.message || 'Friend request sent!'));
        await loadAllData();
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await acceptFriendRequest(friendshipId);
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', language === 'tr' ? 'Arkadaşlık isteği kabul edildi!' : 'Friend request accepted!');
        await loadAllData();
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await rejectFriendRequest(friendshipId);
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', language === 'tr' ? 'İstek reddedildi.' : 'Friend request declined.');
        await loadAllData();
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await cancelFriendRequest(friendshipId);
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', language === 'tr' ? 'İstek iptal edildi.' : 'Friend request cancelled.');
        await loadAllData();
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    const confirmPrompt =
      language === 'tr'
        ? `@${friendName} adlı kullanıcıyı arkadaşlarınızdan çıkarmak istediğinize emin misiniz?`
        : `Are you sure you want to remove @${friendName} from your friends?`;
    if (!window.confirm(confirmPrompt)) {
      return;
    }
    setActionLoadingId(friendshipId);
    try {
      const res = await removeFriend(friendshipId);
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', language === 'tr' ? 'Arkadaş listeden çıkarıldı.' : 'Friend removed.');
        await loadAllData();
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to remove friend');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const totalIncomingCount = incomingRequests?.length || 0;
  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeIncomingRequests = Array.isArray(incomingRequests) ? incomingRequests : [];
  const safeOutgoingRequests = Array.isArray(outgoingRequests) ? outgoingRequests : [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl p-4 sm:p-7 rounded-t-3xl sm:rounded-3xl glass-modal overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col cursor-default pb-[max(1.25rem,var(--sab))] ${
          isLight ? 'text-slate-900 border-slate-200/80' : 'text-white border-white/15'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friends-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center shadow-inner ${
              isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="friends-modal-title" className="text-lg font-bold tracking-tight">
                {t.friendsTitle}
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                {t.friendsCommunityDesc}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.close}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Guest Mode Guard */}
        {!user ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
              <UserPlus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold">{language === 'tr' ? 'Arkadaş eklemek için giriş yapın' : 'Sign in to add friends'}</h3>
              <p className={`text-xs max-w-sm mx-auto mt-1.5 leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-white/70'
              }`}>
                {language === 'tr'
                  ? 'Kullanıcı adına göre arama yapmak, istek göndermek ve diğer odaklananlarla bağlantı kurmak için ücretsiz Luno hesabı oluşturun veya giriş yapın.'
                  : 'Create a free Luno account or sign in to search by nickname, send requests, and connect with other focus partners.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                {t.signInCreateAccount}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Bar (hidden when friend profile is selected) */}
            {!selectedFriend && (
              <div className="grid grid-cols-3 gap-1.5 p-1 my-4 rounded-2xl bg-black/20 border border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'friends'
                    ? isLight
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-white/15 text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.myFriendsTab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                  activeTab === 'friends'
                    ? isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-white/20 text-white'
                    : isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/70'
                }`}>
                  {safeFriends.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  activeTab === 'requests'
                    ? isLight
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-white/15 text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.requestsTab}</span>
                {totalIncomingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                  totalIncomingCount > 0
                    ? 'bg-indigo-500 text-white'
                    : activeTab === 'requests'
                    ? isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-white/20 text-white'
                    : isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/70'
                }`}>
                  {safeIncomingRequests.length + safeOutgoingRequests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'search'
                    ? isLight
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-white/15 text-white shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.findFriendsTab}</span>
              </button>
            </div>
            )}

            {/* Modal Body / Tab Contents */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[280px]">
              {/* FRIEND PROFILE & COMPARISON DETAIL VIEW */}
              {selectedFriend ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Profile Header Banner */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-white/10 border-white/15'
                  }`}>
                    <div className="flex items-center space-x-3.5">
                      <FriendAvatar
                        avatarUrl={friendStats?.avatarUrl || selectedFriend.avatarUrl}
                        nickname={friendStats?.nickname || selectedFriend.nickname}
                        displayName={friendStats?.displayName || selectedFriend.displayName}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-bold tracking-tight">
                            @{selectedFriend.nickname || 'user'}
                          </h3>
                        </div>
                        {selectedFriend.displayName && (
                          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                            {selectedFriend.displayName}
                          </p>
                        )}
                        <div className={`flex items-center space-x-2 text-[10px] mt-1 ${
                          isLight ? 'text-slate-500' : 'text-white/50'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>{formatFriendSinceDate('since' in selectedFriend ? selectedFriend.since : undefined, language)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenGroupInvite}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                          isLight
                            ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                            : 'bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/30'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{t.inviteToGroup}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFriend(null)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t.backToFriends}</span>
                      </button>
                    </div>
                  </div>

                  {/* Friend Stats Summary Cards */}
                  {isLoadingFriendStats ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-white/50">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">{t.searching}</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className={`p-3 rounded-2xl border text-center ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                        }`}>
                          <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1 ${
                            isLight ? 'text-slate-500' : 'text-white/50'
                          }`}>{t.friendTodayFocus}</span>
                          <span className="text-base font-bold text-emerald-400">
                            {formatDurationHoursMinutes(friendStats?.todayMinutes || 0, language)}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-center ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                        }`}>
                          <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1 ${
                            isLight ? 'text-slate-500' : 'text-white/50'
                          }`}>{t.friendWeekFocus}</span>
                          <span className="text-base font-bold text-indigo-400">
                            {formatDurationHoursMinutes(friendStats?.weekMinutes || 0, language)}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-center ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                        }`}>
                          <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1 ${
                            isLight ? 'text-slate-500' : 'text-white/50'
                          }`}>{t.friendTotalFocus}</span>
                          <span className="text-base font-bold text-purple-400">
                            {formatDurationHoursMinutes(friendStats?.totalMinutes || 0, language)}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-center ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                        }`}>
                          <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1 ${
                            isLight ? 'text-slate-500' : 'text-white/50'
                          }`}>{t.totalSessions}</span>
                          <span className="text-base font-bold text-amber-400">
                            {friendStats?.totalSessions || 0}
                          </span>
                        </div>
                      </div>

                      {/* SIDE-BY-SIDE STATS COMPARISON SECTION */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        isLight
                          ? 'bg-indigo-50/70 border-indigo-200 text-slate-800'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-white'
                      }`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center space-x-2 text-indigo-400">
                            <Swords className="w-4 h-4" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">{t.comparison}</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                            {t.compareStats}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center font-bold text-[11px] uppercase tracking-wider mb-1">
                          <div className={`py-1 px-2.5 rounded-xl border ${
                            isLight ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-indigo-600/30 border-indigo-500/30 text-indigo-200'
                          }`}>
                            {t.youLabel} ({user?.nickname ? `@${user.nickname}` : 'You'})
                          </div>
                          <div className={`py-1 px-2.5 rounded-xl border ${
                            isLight ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-600/30 border-purple-500/30 text-purple-200'
                          }`}>
                            @{selectedFriend.nickname || 'friend'}
                          </div>
                        </div>

                        {/* Metric 1: Today */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-emerald-500">{formatDurationHoursMinutes(myStats.todayMinutes, language)}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.friendTodayFocus}</span>
                            <span className="text-emerald-400">{formatDurationHoursMinutes(friendStats?.todayMinutes || 0, language)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.todayMinutes + (friendStats?.todayMinutes || 0) > 0
                                    ? (myStats.todayMinutes / (myStats.todayMinutes + (friendStats?.todayMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.todayMinutes + (friendStats?.todayMinutes || 0) > 0
                                    ? ((friendStats?.todayMinutes || 0) / (myStats.todayMinutes + (friendStats?.todayMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Metric 2: This Week */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-indigo-500">{formatDurationHoursMinutes(myStats.weekMinutes, language)}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.friendWeekFocus}</span>
                            <span className="text-purple-400">{formatDurationHoursMinutes(friendStats?.weekMinutes || 0, language)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.weekMinutes + (friendStats?.weekMinutes || 0) > 0
                                    ? (myStats.weekMinutes / (myStats.weekMinutes + (friendStats?.weekMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.weekMinutes + (friendStats?.weekMinutes || 0) > 0
                                    ? ((friendStats?.weekMinutes || 0) / (myStats.weekMinutes + (friendStats?.weekMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Metric 3: This Month */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-cyan-500">{formatDurationHoursMinutes(myStats.monthMinutes, language)}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.monthFocus}</span>
                            <span className="text-cyan-400">{formatDurationHoursMinutes(friendStats?.monthMinutes || 0, language)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.monthMinutes + (friendStats?.monthMinutes || 0) > 0
                                    ? (myStats.monthMinutes / (myStats.monthMinutes + (friendStats?.monthMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.monthMinutes + (friendStats?.monthMinutes || 0) > 0
                                    ? ((friendStats?.monthMinutes || 0) / (myStats.monthMinutes + (friendStats?.monthMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Metric 4: Total Focus */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-purple-500">{formatDurationHoursMinutes(myStats.totalMinutes, language)}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.friendTotalFocus}</span>
                            <span className="text-pink-400">{formatDurationHoursMinutes(friendStats?.totalMinutes || 0, language)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.totalMinutes + (friendStats?.totalMinutes || 0) > 0
                                    ? (myStats.totalMinutes / (myStats.totalMinutes + (friendStats?.totalMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.totalMinutes + (friendStats?.totalMinutes || 0) > 0
                                    ? ((friendStats?.totalMinutes || 0) / (myStats.totalMinutes + (friendStats?.totalMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Metric 5: Total Sessions */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-amber-500">{myStats.totalSessions} {language === 'tr' ? 'Oturum' : 'Sessions'}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.totalSessions}</span>
                            <span className="text-amber-400">{friendStats?.totalSessions || 0} {language === 'tr' ? 'Oturum' : 'Sessions'}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.totalSessions + (friendStats?.totalSessions || 0) > 0
                                    ? (myStats.totalSessions / (myStats.totalSessions + (friendStats?.totalSessions || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.totalSessions + (friendStats?.totalSessions || 0) > 0
                                    ? ((friendStats?.totalSessions || 0) / (myStats.totalSessions + (friendStats?.totalSessions || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Metric 6: Daily Average */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-teal-500">{formatDurationHoursMinutes(myStats.dailyAverageMinutes, language)}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{t.dailyAverage}</span>
                            <span className="text-teal-400">{formatDurationHoursMinutes(friendStats?.dailyAverageMinutes || 0, language)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 flex overflow-hidden">
                            <div
                              className="h-full bg-teal-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.dailyAverageMinutes + (friendStats?.dailyAverageMinutes || 0) > 0
                                    ? (myStats.dailyAverageMinutes / (myStats.dailyAverageMinutes + (friendStats?.dailyAverageMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${
                                  myStats.dailyAverageMinutes + (friendStats?.dailyAverageMinutes || 0) > 0
                                    ? ((friendStats?.dailyAverageMinutes || 0) / (myStats.dailyAverageMinutes + (friendStats?.dailyAverageMinutes || 0))) * 100
                                    : 50
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 30-DAY ACTIVITY HEATMAP SECTION */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">{t.activityHeatmap}</h4>
                        </div>

                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 pt-1">
                          {(() => {
                            const historyMap = new Map((friendStats?.dailyHistory || []).map((h) => [h.date, h.minutes]));
                            const boxes = [];
                            const today = new Date();
                            for (let i = 29; i >= 0; i--) {
                              const d = new Date(today.valueOf() - i * 86400 * 1000);
                              const dateStr = d.toISOString().split('T')[0];
                              const mins = historyMap.get(dateStr) || 0;
                              const displayLabel = `${d.getDate()} ${d.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' })} — ${formatDurationHoursMinutes(mins, language)}`;

                              let bgClass = isLight ? 'bg-slate-200' : 'bg-white/10';
                              if (mins > 0 && mins < 30) bgClass = 'bg-indigo-400/40';
                              else if (mins >= 30 && mins < 60) bgClass = 'bg-indigo-500/70';
                              else if (mins >= 60 && mins < 120) bgClass = 'bg-indigo-600';
                              else if (mins >= 120) bgClass = 'bg-purple-500 font-bold';

                              boxes.push(
                                <div
                                  key={dateStr}
                                  className={`h-7 rounded-lg ${bgClass} flex items-center justify-center text-[9px] transition-all hover:scale-110 cursor-pointer shadow-sm`}
                                  title={displayLabel}
                                >
                                  {mins > 0 ? `${mins}m` : ''}
                                </div>
                              );
                            }
                            return boxes;
                          })()}
                        </div>
                      </div>

                      {/* RECENT ACTIVITIES FEED SECTION */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-purple-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">{t.recentActivityTitle}</h4>
                        </div>

                        {!friendStats?.recentActivities || friendStats.recentActivities.length === 0 ? (
                          <div className={`text-center py-4 text-xs italic ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                            {t.noRecentActivity}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {friendStats.recentActivities.map((act) => (
                              <div
                                key={act.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                  isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="truncate font-medium">{act.description}</span>
                                </div>
                                <span className={`text-[10px] shrink-0 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                                  {new Date(act.timestamp).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* TAB 1: FRIENDS LIST */}
              {!selectedFriend && activeTab === 'friends' && (
                <div className="space-y-2.5">
                  {isLoadingLists ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-white/50">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">{language === 'tr' ? 'Arkadaşlar yükleniyor...' : 'Loading friends...'}</span>
                    </div>
                  ) : safeFriends.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.noFriendsYet}</p>
                        <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                          {language === 'tr' ? 'Çalışma arkadaşları eklemek için yukarıdan kullanıcı adı arayın!' : 'Search by @nickname to connect with focus partners!'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('search')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isLight
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                            : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30'
                        }`}
                      >
                        {t.findFriendsTab}
                      </button>
                    </div>
                  ) : (
                    safeFriends.map((friend) => (
                      <div
                        key={friend.friendshipId || friend.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isLight
                            ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <FriendAvatar
                            avatarUrl={friend.avatarUrl}
                            nickname={friend.nickname}
                            displayName={friend.displayName}
                            size="md"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold truncate">
                                @{friend.nickname || 'user'}
                              </span>
                              {friend.displayName && (
                                <span className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                                  ({friend.displayName})
                                </span>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${
                              isLight ? 'text-slate-400' : 'text-white/40'
                            }`}>
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{formatFriendSinceDate(friend.since, language)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSelectFriend(friend)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              isLight
                                ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                            }`}
                            title={t.viewProfile}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t.viewProfile}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend.friendshipId, friend.nickname)}
                            disabled={actionLoadingId === friend.friendshipId}
                            className={`p-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                              isLight
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-white/50 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title={t.removeFriend}
                            aria-label={`Remove @${friend.nickname}`}
                          >
                            {actionLoadingId === friend.friendshipId ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
              {!selectedFriend && activeTab === 'requests' && (
                <div className="space-y-4">
                  {/* Incoming Requests Section */}
                  <div className="space-y-2">
                    <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      {language === 'tr' ? `Gelen İstekler (${safeIncomingRequests.length})` : `Incoming Requests (${safeIncomingRequests.length})`}
                    </h3>

                    {safeIncomingRequests.length === 0 ? (
                      <p className={`text-xs italic py-2 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        {t.noRequests}
                      </p>
                    ) : (
                      safeIncomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                            isLight
                              ? 'bg-indigo-50/50 border-indigo-200'
                              : 'bg-indigo-500/10 border-indigo-500/20'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <FriendAvatar
                              avatarUrl={req.user?.avatarUrl}
                              nickname={req.user?.nickname}
                              displayName={req.user?.displayName}
                              size="md"
                            />

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold truncate block">
                                @{req.user?.nickname || 'user'}
                              </span>
                              {req.user?.displayName && (
                                <span className={`text-[11px] truncate block ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                                  {req.user.displayName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {actionLoadingId === req.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t.accept}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className={`p-1.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 ${
                                isLight
                                  ? 'bg-slate-200 text-slate-700 hover:bg-rose-100 hover:text-rose-600'
                                  : 'bg-white/10 text-white/70 hover:bg-rose-500/20 hover:text-rose-300'
                              }`}
                              title={t.reject}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Outgoing Requests Section */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      {language === 'tr' ? `Gönderilen İstekler (${safeOutgoingRequests.length})` : `Sent Requests (${safeOutgoingRequests.length})`}
                    </h3>

                    {safeOutgoingRequests.length === 0 ? (
                      <p className={`text-xs italic py-2 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        {language === 'tr' ? 'Bekleyen gönderilmiş istek yok.' : 'No outgoing pending requests.'}
                      </p>
                    ) : (
                      safeOutgoingRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <FriendAvatar
                              avatarUrl={req.user?.avatarUrl}
                              nickname={req.user?.nickname}
                              displayName={req.user?.displayName}
                              size="sm"
                            />

                            <div className="min-w-0">
                              <span className="text-xs font-bold truncate block">
                                @{req.user?.nickname || 'user'}
                              </span>
                              <span className="text-[10px] text-amber-400 font-medium">
                                {language === 'tr' ? 'Yanıt bekleniyor...' : 'Awaiting response...'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={actionLoadingId === req.id}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                              isLight
                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>{t.cancel}</span>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: SEARCH & ADD FRIENDS */}
              {!selectedFriend && activeTab === 'search' && (
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isLight ? 'text-slate-400' : 'text-white/40'
                    }`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder={t.searchFriendsPlaceholder}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20'
                          : 'bg-white/10 border-white/20 text-white focus:border-white/60 focus:ring-white/20'
                      }`}
                      autoFocus
                    />
                    {isSearching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  <div className="space-y-2">
                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                      <div className="py-8 text-center space-y-2 text-white/50">
                        <AtSign className="w-6 h-6 mx-auto opacity-40" />
                        <p className="text-xs">{t.noUsersFound}</p>
                      </div>
                    )}

                    {searchResults.map((foundUser) => {
                      if (!foundUser || !foundUser.id) return null;
                      const isAlreadyFriend = safeFriends.some((f) => f?.id === foundUser.id);
                      const isPendingOutgoing = safeOutgoingRequests.some((r) => r?.user?.id === foundUser.id);
                      const incomingReq = safeIncomingRequests.find((r) => r?.user?.id === foundUser.id);

                      return (
                        <div
                          key={foundUser.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            isLight
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <FriendAvatar
                              avatarUrl={foundUser.avatarUrl}
                              nickname={foundUser.nickname}
                              displayName={foundUser.displayName}
                              size="md"
                            />

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold truncate block">
                                @{foundUser.nickname || 'user'}
                              </span>
                              {foundUser.displayName && (
                                <span className={`text-[11px] truncate block ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                                  {foundUser.displayName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAlreadyFriend ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{t.alreadyFriends}</span>
                              </span>
                            ) : isPendingOutgoing ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{t.requestSent}</span>
                              </span>
                            ) : incomingReq ? (
                              <button
                                type="button"
                                onClick={() => handleAcceptRequest(incomingReq.id)}
                                disabled={actionLoadingId === incomingReq.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === incomingReq.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{t.accept}</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendRequest(foundUser.id)}
                                disabled={actionLoadingId === foundUser.id}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm ${
                                  isLight
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-white text-black hover:bg-white/90'
                                }`}
                              >
                                {actionLoadingId === foundUser.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>{t.addFriend}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {searchQuery.trim().length === 0 && (
                    <div className="py-6 text-center space-y-2">
                      <Sparkles className="w-6 h-6 mx-auto text-indigo-400 opacity-60" />
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                        {t.searchPrompt}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {/* GROUP INVITE SELECTION MODAL */}
        {isInviteModalOpen && selectedFriend && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsInviteModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold">
                    {language === 'tr' ? 'Gruba Davet Et' : 'Invite to Study Group'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className={`p-1.5 rounded-xl transition-all ${
                    isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white/60'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                {language === 'tr'
                  ? `@${selectedFriend.nickname || 'kullanıcı'} için bir çalışma grubu seçin:`
                  : `Select a group to invite @${selectedFriend.nickname || 'user'}:`}
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {isLoadingUserGroups ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      {language === 'tr' ? 'Henüz yönettiğiniz veya katıldığınız bir grup yok.' : 'You have not created or joined any groups yet.'}
                    </p>
                  </div>
                ) : (
                  userGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate">{group.name}</h4>
                        <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                          {group.memberCount} {language === 'tr' ? 'üye' : 'members'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendGroupInvite(group.id)}
                        disabled={sendingInviteGroupId === group.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                          isLight
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                      >
                        {sendingInviteGroupId === group.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{language === 'tr' ? 'Davet Et' : 'Invite'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
