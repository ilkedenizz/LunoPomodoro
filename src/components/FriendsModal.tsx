import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import type { AppTheme, UserProfile, Friend, FriendRequest, PublicUserProfile, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';
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
} from '../services/friends';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  theme?: AppTheme;
  language?: AppLanguage;
  onOpenAuth?: () => void;
  onRequestCountChange?: (count: number) => void;
}

type FriendsTab = 'friends' | 'requests' | 'search';

const FriendAvatar: React.FC<{
  avatarUrl?: string | null;
  nickname: string;
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
          alt={nickname}
          className="w-full h-full object-cover rounded-full"
          onError={() => setFailedUrl(avatarUrl)}
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

  // Action loading IDs
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  // Load friends and requests
  const loadAllData = useCallback(async () => {
    if (!user) return;
    setIsLoadingLists(true);
    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        getFriendsList(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      setFriends(friendsData);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
      onRequestCountChange?.(incomingData.length);
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

    Promise.all([
      getFriendsList(),
      getIncomingFriendRequests(),
      getOutgoingFriendRequests(),
    ])
      .then(([friendsData, incomingData, outgoingData]) => {
        if (!isCurrent) return;
        setFriends(friendsData);
        setIncomingRequests(incomingData);
        setOutgoingRequests(outgoingData);
        onRequestCountChange?.(incomingData.length);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Luno Friends Load Error]:', err);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingLists(false);
        }
      });

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
        setSearchResults(results);
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
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const totalIncomingCount = incomingRequests.length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl p-5 sm:p-7 rounded-t-3xl sm:rounded-3xl glass-modal overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col cursor-default ${
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
                  : 'Create a free Luno account or sign in to search by nickname, send requests, and connect with other focusers.'}
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
            {/* Tabs Bar */}
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
                  {friends.length}
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
                  {incomingRequests.length + outgoingRequests.length}
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

            {/* Modal Body / Tab Contents */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[280px]">
              {/* TAB 1: FRIENDS LIST */}
              {activeTab === 'friends' && (
                <div className="space-y-2.5">
                  {isLoadingLists ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-white/50">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">{language === 'tr' ? 'Arkadaşlar yükleniyor...' : 'Loading friends...'}</span>
                    </div>
                  ) : friends.length === 0 ? (
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
                    friends.map((friend) => (
                      <div
                        key={friend.friendshipId}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isLight
                            ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
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
                                @{friend.nickname}
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
                              <Calendar className="w-3 h-3" />
                              <span>
                                {language === 'tr'
                                  ? `${new Date(friend.since).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })} tarihinden beri arkadaşsınız`
                                  : `Friends since ${new Date(friend.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(friend.friendshipId, friend.nickname)}
                          disabled={actionLoadingId === friend.friendshipId}
                          className={`p-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 ${
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
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  {/* Incoming Requests Section */}
                  <div className="space-y-2">
                    <h3 className={`text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      {language === 'tr' ? `Gelen İstekler (${incomingRequests.length})` : `Incoming Requests (${incomingRequests.length})`}
                    </h3>

                    {incomingRequests.length === 0 ? (
                      <p className={`text-xs italic py-2 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        {t.noRequests}
                      </p>
                    ) : (
                      incomingRequests.map((req) => (
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
                              avatarUrl={req.user.avatarUrl}
                              nickname={req.user.nickname}
                              displayName={req.user.displayName}
                              size="md"
                            />

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold truncate block">
                                @{req.user.nickname}
                              </span>
                              {req.user.displayName && (
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
                      {language === 'tr' ? `Gönderilen İstekler (${outgoingRequests.length})` : `Sent Requests (${outgoingRequests.length})`}
                    </h3>

                    {outgoingRequests.length === 0 ? (
                      <p className={`text-xs italic py-2 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        {language === 'tr' ? 'Bekleyen gönderilmiş istek yok.' : 'No outgoing pending requests.'}
                      </p>
                    ) : (
                      outgoingRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <FriendAvatar
                              avatarUrl={req.user.avatarUrl}
                              nickname={req.user.nickname}
                              displayName={req.user.displayName}
                              size="sm"
                            />

                            <div className="min-w-0">
                              <span className="text-xs font-bold truncate block">
                                @{req.user.nickname}
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
              {activeTab === 'search' && (
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
                      const isAlreadyFriend = friends.some((f) => f.id === foundUser.id);
                      const isPendingOutgoing = outgoingRequests.some((r) => r.user.id === foundUser.id);
                      const incomingReq = incomingRequests.find((r) => r.user.id === foundUser.id);

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
                                @{foundUser.nickname}
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
      </div>
    </div>
  );
};
