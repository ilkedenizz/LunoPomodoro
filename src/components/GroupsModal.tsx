import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Plus,
  Search,
  Award,
  Shield,
  UserPlus,
  Settings,
  Target,
  Flame,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Globe,
  Lock,
  LogOut,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Rocket,
  Brain,
  Code,
  Coffee,
  Palette,
  Compass,
} from 'lucide-react';
import type {
  AppTheme,
  UserProfile,
  AppLanguage,
  StudyGroup,
  GroupMember,
  GroupGoal,
  GroupActivity,
  GroupInvite,
  GroupRole,
  Friend,
  PublicUserProfile,
} from '../types';
import { getTranslations, formatDurationHoursMinutes } from '../utils/translations';
import {
  getUserStudyGroups,
  getDiscoverableGroups,
  createStudyGroup,
  getGroupDetails,
  joinStudyGroup,
  leaveStudyGroup,
  deleteStudyGroup,
  setGroupWeeklyGoal,
  inviteFriendToGroup,
  getPendingGroupInvites,
  respondToGroupInvite,
  updateGroupMemberRole,
  removeGroupMember,
} from '../services/groups';
import { getFriendsList } from '../services/friends';

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  theme?: AppTheme;
  language?: AppLanguage;
  activeGroup?: StudyGroup | null;
  activeGroupId?: string | null;
  onSelectActiveGroup?: (group: StudyGroup | null) => void;
  onOpenAuth?: () => void;
  onPendingInvitesCountChange?: (count: number) => void;
  onOpenFriendProfile?: (friend: PublicUserProfile) => void;
}

type GroupsTab = 'my-groups' | 'discover' | 'invites' | 'create';

// Preset Icons mapping for group avatars
const GROUP_PRESET_ICONS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  book: { label: 'Study', icon: BookOpen },
  rocket: { label: 'Rocket', icon: Rocket },
  brain: { label: 'Brain', icon: Brain },
  code: { label: 'Code', icon: Code },
  fire: { label: 'Focus', icon: Flame },
  coffee: { label: 'Coffee', icon: Coffee },
  art: { label: 'Creative', icon: Palette },
  globe: { label: 'Global', icon: Globe },
};

const GroupIconBadge: React.FC<{ iconKey?: string; size?: 'sm' | 'md' | 'lg' }> = ({ iconKey = 'book', size = 'md' }) => {
  const IconComponent = (GROUP_PRESET_ICONS[iconKey] || GROUP_PRESET_ICONS.book).icon;
  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
      ? 'w-14 h-14 text-xl'
      : 'w-10 h-10 text-base';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-md shrink-0 border border-white/20`}>
      <IconComponent className={iconSize} />
    </div>
  );
};

export const GroupsModal: React.FC<GroupsModalProps> = React.memo(({
  isOpen,
  onClose,
  user,
  language = 'en',
  activeGroup,
  activeGroupId,
  onSelectActiveGroup,
  onOpenAuth,
  onPendingInvitesCountChange,
  onOpenFriendProfile,
}) => {
  const t = getTranslations(language);

  const [activeTab, setActiveTab] = useState<GroupsTab>('my-groups');
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<StudyGroup[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search in Discover
  const [searchQuery, setSearchQuery] = useState('');

  // Active Selected Group Detail
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    group: StudyGroup;
    members: GroupMember[];
    goals: GroupGoal[];
    activities: GroupActivity[];
    invites: GroupInvite[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Sub-Modals
  const [isInviteFriendsOpen, setIsInviteFriendsOpen] = useState(false);
  const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  // Friends list for invite
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);

  // Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetHours, setGoalTargetHours] = useState('50');

  // Create Group Form
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createIcon, setCreateIcon] = useState('book');
  const [createMaxMembers, setCreateMaxMembers] = useState(10);
  const [createIsDiscoverable, setCreateIsDiscoverable] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load User Groups & Pending Invites
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groupsList, invitesList] = await Promise.all([
        getUserStudyGroups(user?.id),
        getPendingGroupInvites(user?.id),
      ]);
      setMyGroups(groupsList);
      setPendingInvites(invitesList);
      if (onPendingInvitesCountChange) {
        onPendingInvitesCountChange(invitesList.length);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno loadInitialData Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, onPendingInvitesCountChange]);

  // Load Discover Groups
  const loadDiscover = useCallback(async () => {
    try {
      const list = await getDiscoverableGroups(user?.id);
      setDiscoverGroups(list);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno loadDiscover Error]:', err);
    }
  }, [user?.id]);

  // Load Selected Group Detail
  const loadGroupDetail = useCallback(async (groupId: string) => {
    setIsLoadingDetail(true);
    try {
      const details = await getGroupDetails(groupId, user?.id);
      setSelectedGroupDetails(details);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno loadGroupDetail Error]:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, loadInitialData]);

  useEffect(() => {
    if (isOpen && activeTab === 'discover') {
      loadDiscover();
    }
  }, [isOpen, activeTab, loadDiscover]);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupDetail(selectedGroupId);
    } else {
      setSelectedGroupDetails(null);
    }
  }, [selectedGroupId, loadGroupDetail]);

  if (!isOpen) return null;

  // Handlers

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showFeedback('error', language === 'tr' ? 'Grup oluşturmak için hesabınla giriş yapmalısın.' : 'You must sign in to create a study group.');
      if (onOpenAuth) {
        setTimeout(() => onOpenAuth(), 1200);
      }
      return;
    }
    if (!createName.trim()) {
      showFeedback('error', language === 'tr' ? 'Grup adı zorunludur' : 'Group name is required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await createStudyGroup(
        {
          name: createName,
          description: createDesc,
          avatarUrl: createIcon,
          maxMembers: createMaxMembers,
          isDiscoverable: createIsDiscoverable,
        },
        user.id
      );

      if (res.success && res.group) {
        showFeedback('success', language === 'tr' ? 'Çalışma grubu başarıyla oluşturuldu!' : 'Study group created successfully!');
        setCreateName('');
        setCreateDesc('');
        setCreateIcon('book');
        setCreateMaxMembers(10);
        setCreateIsDiscoverable(true);
        await loadInitialData();
        setSelectedGroupId(res.group.id);
        setActiveTab('my-groups');
      } else {
        showFeedback('error', res.error || (language === 'tr' ? 'Grup oluşturulamadı.' : 'Failed to create group.'));
      }
    } catch (err: any) {
      showFeedback('error', err.message || (language === 'tr' ? 'Grup oluşturulurken hata oluştu.' : 'Error creating group.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await joinStudyGroup(groupId, user?.id);
      if (res.success) {
        showFeedback('success', 'Joined group!');
        await loadInitialData();
        setSelectedGroupId(groupId);
        setActiveTab('my-groups');
      } else {
        showFeedback('error', res.error || 'Failed to join group.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error joining group.');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!window.confirm(t.leaveGroupConfirm)) return;
    try {
      const res = await leaveStudyGroup(groupId, user?.id);
      if (res.success) {
        showFeedback('success', 'Left group.');
        if (activeGroupId === groupId && onSelectActiveGroup) {
          onSelectActiveGroup(null);
        }
        setSelectedGroupId(null);
        await loadInitialData();
      } else {
        showFeedback('error', res.error || 'Failed to leave group.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error leaving group.');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm(t.deleteGroupConfirm)) return;
    try {
      const res = await deleteStudyGroup(groupId, user?.id);
      if (res.success) {
        showFeedback('success', 'Group deleted.');
        if (activeGroupId === groupId && onSelectActiveGroup) {
          onSelectActiveGroup(null);
        }
        setSelectedGroupId(null);
        setIsGroupSettingsOpen(false);
        await loadInitialData();
      } else {
        showFeedback('error', res.error || 'Failed to delete group.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error deleting group.');
    }
  };

  const handleStartGroupFocus = (group: StudyGroup) => {
    if (onSelectActiveGroup) {
      onSelectActiveGroup(group);
    }
    showFeedback('success', `${t.focusingWithGroup}: ${group.name}`);
    onClose();
  };

  const handleOpenInviteFriends = async () => {
    setIsInviteFriendsOpen(true);
    try {
      const friendList = await getFriendsList();
      setFriends(friendList);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Luno handleOpenInviteFriends Error]:', err);
    }
  };

  const handleSendFriendInvite = async (friendId: string) => {
    if (!selectedGroupId) return;
    setInvitingFriendId(friendId);
    try {
      const res = await inviteFriendToGroup(selectedGroupId, friendId, user?.id);
      if (res.success) {
        showFeedback('success', 'Invite sent to friend!');
      } else {
        showFeedback('error', res.error || 'Failed to send invite.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error inviting friend.');
    } finally {
      setInvitingFriendId(null);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    const hours = parseFloat(goalTargetHours);
    if (isNaN(hours) || hours <= 0) {
      showFeedback('error', 'Please enter a valid target hours number.');
      return;
    }
    const targetMins = Math.round(hours * 60);
    try {
      const res = await setGroupWeeklyGoal(selectedGroupId, goalTitle || `${hours} Hours Weekly Sprint`, targetMins, user?.id);
      if (res.success) {
        showFeedback('success', 'Weekly goal saved!');
        setIsSetGoalOpen(false);
        await loadGroupDetail(selectedGroupId);
      } else {
        showFeedback('error', res.error || 'Failed to save goal.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error setting goal.');
    }
  };

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      const res = await respondToGroupInvite(inviteId, accept, user?.id);
      if (res.success) {
        showFeedback('success', accept ? 'Joined group!' : 'Invite declined.');
        await loadInitialData();
      } else {
        showFeedback('error', res.error || 'Failed to process invite.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error responding to invite.');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: GroupRole) => {
    if (!selectedGroupId) return;
    try {
      const res = await updateGroupMemberRole(selectedGroupId, targetUserId, newRole, user?.id);
      if (res.success) {
        showFeedback('success', 'Member role updated.');
        await loadGroupDetail(selectedGroupId);
      } else {
        showFeedback('error', res.error || 'Failed to update role.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error updating role.');
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!selectedGroupId || !window.confirm(t.kickMemberConfirm)) return;
    try {
      const res = await removeGroupMember(selectedGroupId, targetUserId, user?.id);
      if (res.success) {
        showFeedback('success', 'Member removed.');
        await loadGroupDetail(selectedGroupId);
      } else {
        showFeedback('error', res.error || 'Failed to remove member.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error kicking member.');
    }
  };

  const filteredDiscover = discoverGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl p-4 sm:p-8 rounded-t-3xl sm:rounded-3xl glass-modal text-white shadow-2xl border border-white/15 animate-in fade-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col overflow-hidden cursor-default pb-[max(1.25rem,var(--sab))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="groups-title"
      >
        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl font-medium text-xs shadow-xl backdrop-blur-md border flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/90 text-white border-emerald-400/30'
                : 'bg-rose-500/90 text-white border-rose-400/30'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            {selectedGroupId ? (
              <button
                onClick={() => setSelectedGroupId(null)}
                className="p-2 rounded-xl glass-panel text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer mr-1"
                title="Back to Groups"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            <div className="p-2.5 rounded-2xl glass-panel text-indigo-300 border border-white/15">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="groups-title" className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{selectedGroupDetails ? selectedGroupDetails.group.name : t.studyGroupsTitle}</span>
              </h2>
              <p className="text-xs text-white/60 font-medium">
                {selectedGroupDetails
                  ? selectedGroupDetails.group.description || `${selectedGroupDetails.group.memberCount} ${t.membersCount}`
                  : t.groupsCommunityTooltip}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs (if no group selected) */}
        {!selectedGroupId && (
          <div className="flex items-center space-x-1.5 pt-4 pb-2 border-b border-white/10 overflow-x-auto shrink-0 no-scrollbar">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'my-groups'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.myGroupsTab}</span>
              {myGroups.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
                  {myGroups.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.discoverGroupsTab}</span>
            </button>

            <button
              onClick={() => setActiveTab('invites')}
              className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'invites'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t.groupInvitesTab}</span>
              {pendingInvites.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                  {pendingInvites.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createGroupTab}</span>
            </button>
          </div>
        )}

        {/* Guest Mode Sign In Banner */}
        {!user && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs flex items-center justify-between shrink-0">
            <span>{t.signInCreateAccount}</span>
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-xs shrink-0"
              >
                {t.signIn}
              </button>
            )}
          </div>
        )}

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* GROUP DETAIL VIEW */}
          {selectedGroupId ? (
            isLoadingDetail ? (
              <div className="p-12 flex flex-col items-center justify-center text-white/60 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <span className="text-xs font-medium tracking-wide">{t.loading}</span>
              </div>
            ) : selectedGroupDetails ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Active Group Indicator Banner */}
                {activeGroup?.id === selectedGroupDetails.group.id && (
                  <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                      <span>{t.focusingWithGroup}</span>
                    </span>
                  </div>
                )}
              {/* Group Header Banner */}
              <div className="p-5 rounded-2xl glass-panel border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <GroupIconBadge iconKey={selectedGroupDetails.group.avatarUrl} size="lg" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">{selectedGroupDetails.group.name}</h3>
                      {selectedGroupDetails.group.isDiscoverable ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>{t.publicDiscoverable}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>{t.privateInviteOnly}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/70 mt-1 max-w-xl">{selectedGroupDetails.group.description || t.noGroupsHint}</p>
                    <div className="flex items-center space-x-3 text-xs text-white/60 mt-2 font-medium">
                      <span>👥 {selectedGroupDetails.members.length} / {selectedGroupDetails.group.maxMembers} {t.membersCount}</span>
                      <span>•</span>
                      <span>⏱ {formatDurationHoursMinutes(selectedGroupDetails.group.weeklyFocusMinutes || 0, language)} {t.thisWeekFocus}</span>
                    </div>
                  </div>
                </div>

                {/* Group Action Buttons */}
                <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => handleStartGroupFocus(selectedGroupDetails.group)}
                    className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{t.startGroupFocus}</span>
                  </button>

                  <button
                    onClick={handleOpenInviteFriends}
                    className="p-2.5 rounded-xl glass-panel text-white/90 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    title={t.inviteFriendsToGroup}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>

                  {(selectedGroupDetails.group.userRole === 'owner' || selectedGroupDetails.group.userRole === 'admin') && (
                    <button
                      onClick={() => setIsGroupSettingsOpen(true)}
                      className="p-2.5 rounded-xl glass-panel text-white/90 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      title={t.groupSettings}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  {selectedGroupDetails.group.userRole !== 'owner' && (
                    <button
                      onClick={() => handleLeaveGroup(selectedGroupDetails.group.id)}
                      className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30"
                      title={t.leaveGroup}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 1: WEEKLY GOAL */}
              <div className="p-5 rounded-2xl glass-panel border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.weeklyGoalLabel}</h4>
                      <p className="text-xs text-white/60">
                        {selectedGroupDetails.group.currentGoal
                          ? selectedGroupDetails.group.currentGoal.title
                          : 'No goal set for this week yet.'}
                      </p>
                    </div>
                  </div>

                  {(selectedGroupDetails.group.userRole === 'owner' || selectedGroupDetails.group.userRole === 'admin') && (
                    <button
                      onClick={() => setIsSetGoalOpen(true)}
                      className="px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      {selectedGroupDetails.group.currentGoal ? t.edit : t.setWeeklyGoalTitle}
                    </button>
                  )}
                </div>

                {selectedGroupDetails.group.currentGoal ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white/80">
                        {formatDurationHoursMinutes(selectedGroupDetails.group.weeklyFocusMinutes || 0, language)} /{' '}
                        {formatDurationHoursMinutes(selectedGroupDetails.group.currentGoal.targetMinutes, language)}
                      </span>
                      <span className={selectedGroupDetails.group.currentGoal.completed ? 'text-emerald-400 font-bold' : 'text-indigo-300'}>
                        {Math.min(
                          100,
                          Math.round(
                            ((selectedGroupDetails.group.weeklyFocusMinutes || 0) /
                              selectedGroupDetails.group.currentGoal.targetMinutes) *
                              100
                          )
                        )}
                        %
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedGroupDetails.group.currentGoal.completed
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((selectedGroupDetails.group.weeklyFocusMinutes || 0) /
                                selectedGroupDetails.group.currentGoal.targetMinutes) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>

                    {selectedGroupDetails.group.currentGoal.completed && (
                      <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>🎉 {t.goalCompletedActivity}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* SECTION 2: MEMBER LEADERBOARD */}
              <div className="p-5 rounded-2xl glass-panel border border-white/15 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">{t.leaderboardTitle}</h4>
                  </div>
                  <div className="text-xs font-semibold text-white/70">
                    {t.groupTotalFocus}:{' '}
                    <span className="text-emerald-400 font-bold">
                      {formatDurationHoursMinutes(selectedGroupDetails.group.weeklyFocusMinutes || 0, language)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedGroupDetails.members.map((member, idx) => (
                    <div
                      key={member.id}
                      onClick={() => {
                        if (onOpenFriendProfile && member.userId !== user?.id) {
                          onOpenFriendProfile({
                            id: member.userId,
                            nickname: member.nickname || 'user',
                            displayName: member.displayName,
                            avatarUrl: member.avatarUrl,
                          });
                        }
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                        onOpenFriendProfile && member.userId !== user?.id ? 'cursor-pointer hover:scale-[1.01]' : ''
                      } ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30'
                          : idx === 1
                          ? 'bg-white/5 border border-white/10'
                          : idx === 2
                          ? 'bg-white/5 border border-white/10'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 text-center font-bold text-xs shrink-0">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500/30 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-white/15">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(member.nickname || 'U').slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white">@{member.nickname}</span>
                            {member.role === 'owner' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                                {t.roleOwner}
                              </span>
                            )}
                            {member.role === 'admin' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                                {t.roleAdmin}
                              </span>
                            )}
                          </div>
                          {member.displayName && (
                            <p className="text-[10px] text-white/60">{member.displayName}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-bold text-emerald-400">
                        {formatDurationHoursMinutes(member.weeklyFocusMinutes || 0, language)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: ACTIVITY FEED */}
              <div className="p-5 rounded-2xl glass-panel border border-white/15 space-y-4">
                <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                  <Clock className="w-4 h-4 text-indigo-300" />
                  <h4 className="text-sm font-bold text-white">{t.activityFeedTitle}</h4>
                </div>

                {selectedGroupDetails.activities.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-4">{t.noActivityYet}</p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedGroupDetails.activities.map((act) => (
                      <div key={act.id} className="text-xs flex items-start space-x-2 text-white/80 p-2 rounded-xl bg-white/5">
                        <span className="mt-0.5">
                          {act.activityType === 'member_joined'
                            ? '👋'
                            : act.activityType === 'focus_completed'
                            ? '🟢'
                            : act.activityType === 'goal_created'
                            ? '🎯'
                            : '🎉'}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-white">@{act.userNickname}</span>{' '}
                          {act.activityType === 'member_joined' && t.memberJoinedActivity}
                          {act.activityType === 'member_left' && t.memberLeftActivity}
                          {act.activityType === 'focus_completed' &&
                            `${t.focusCompletedActivity} (${act.metadata?.durationMinutes || 25} ${t.min})`}
                          {act.activityType === 'goal_created' &&
                            `${t.goalCreatedActivity}: ${act.metadata?.title || ''}`}
                          {act.activityType === 'goal_completed' && t.goalCompletedActivity}
                        </div>
                        <span className="text-[10px] text-white/40 shrink-0">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: MEMBER MANAGEMENT (Admin/Owner) */}
              {(selectedGroupDetails.group.userRole === 'owner' || selectedGroupDetails.group.userRole === 'admin') && (
                <div className="p-5 rounded-2xl glass-panel border border-white/15 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">{t.memberManagementTitle}</h4>
                  </div>

                  <div className="space-y-2">
                    {selectedGroupDetails.members.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">@{m.nickname}</span>
                          <span className="text-white/50">({m.role})</span>
                        </div>

                        {m.userId !== user?.id && m.role !== 'owner' && (
                          <div className="flex items-center space-x-2">
                            {selectedGroupDetails.group.userRole === 'owner' && (
                              <button
                                onClick={() => handleRoleChange(m.userId, m.role === 'admin' ? 'member' : 'admin')}
                                className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[10px] font-semibold"
                              >
                                {m.role === 'admin' ? t.demoteToMember : t.promoteToAdmin}
                              </button>
                            )}

                            <button
                              onClick={() => handleKickMember(m.userId)}
                              className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-semibold"
                            >
                              {t.kickMember}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null) : null}

          {/* TAB 1: MY GROUPS LIST */}
          {!selectedGroupId && activeTab === 'my-groups' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-white/50 flex flex-col items-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">{t.searching}</span>
                </div>
              ) : myGroups.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-white/5 border border-white/10 text-indigo-300">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{t.noGroupsYet}</h3>
                    <p className="text-xs text-white/60 max-w-sm mt-1">{t.noGroupsHint}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
                  >
                    {t.createFirstGroupBtn}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myGroups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className="p-5 rounded-2xl glass-panel glass-panel-hover border border-white/15 flex flex-col justify-between space-y-4 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <GroupIconBadge iconKey={g.avatarUrl} size="md" />
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight">{g.name}</h4>
                            <div className="flex items-center space-x-2 text-[11px] text-white/60 mt-1">
                              <span>{g.memberCount} {t.membersCount}</span>
                              <span>•</span>
                              <span className="text-indigo-300 font-semibold">{g.userRole?.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        {activeGroupId === g.id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {t.activeBadge}
                          </span>
                        ) : null}
                      </div>

                      {g.description && (
                        <p className="text-xs text-white/70 line-clamp-2">{g.description}</p>
                      )}

                      {/* Weekly Goal Progress */}
                      {g.currentGoal ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-white/70">
                            <span>{g.currentGoal.title}</span>
                            <span>{Math.round(((g.weeklyFocusMinutes || 0) / g.currentGoal.targetMinutes) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${Math.min(100, Math.round(((g.weeklyFocusMinutes || 0) / g.currentGoal.targetMinutes) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-semibold">
                        <span className="text-emerald-400">
                          ⏱ {formatDurationHoursMinutes(g.weeklyFocusMinutes || 0, language)} {t.thisWeekFocus}
                        </span>

                        <div className="flex items-center space-x-1 text-indigo-300 group-hover:text-white transition-colors">
                          <span>Detail</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISCOVER GROUPS */}
          {!selectedGroupId && activeTab === 'discover' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search public study groups by name..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {filteredDiscover.length === 0 ? (
                <p className="text-xs text-white/50 text-center py-8">{t.noDiscoverableGroups}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDiscover.map((g) => (
                    <div key={g.id} className="p-5 rounded-2xl glass-panel border border-white/15 flex flex-col justify-between space-y-3">
                      <div className="flex items-center space-x-3">
                        <GroupIconBadge iconKey={g.avatarUrl} size="md" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{g.name}</h4>
                          <p className="text-xs text-white/60">{g.memberCount} / {g.maxMembers} {t.membersCount}</p>
                        </div>
                      </div>

                      {g.description && <p className="text-xs text-white/70 line-clamp-2">{g.description}</p>}

                      <button
                        onClick={() => handleJoinGroup(g.id)}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
                      >
                        {t.joinGroup}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GROUP INVITES */}
          {!selectedGroupId && activeTab === 'invites' && (
            <div className="space-y-4">
              {pendingInvites.length === 0 ? (
                <div className="py-12 text-center text-white/50 text-xs">{t.noGroupInvites}</div>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="p-4 rounded-2xl glass-panel border border-white/15 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <GroupIconBadge iconKey={inv.groupAvatarUrl} size="md" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{inv.groupName}</h4>
                          <p className="text-xs text-white/60">@{inv.inviterNickname} {t.invitedYouToJoin}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRespondInvite(inv.id, true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                        >
                          {t.acceptInvite}
                        </button>
                        <button
                          onClick={() => handleRespondInvite(inv.id, false)}
                          className="px-3 py-1.5 rounded-xl glass-panel text-white/70 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {t.declineInvite}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CREATE GROUP FORM */}
          {!selectedGroupId && activeTab === 'create' && (
            <form onSubmit={handleCreateGroupSubmit} className="space-y-5 max-w-xl mx-auto p-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">{t.groupNameLabel}</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t.groupNamePlaceholder}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">{t.groupDescLabel}</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder={t.groupDescPlaceholder}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-2">{t.groupIconLabel}</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {Object.keys(GROUP_PRESET_ICONS).map((iconKey) => {
                    const isSelected = createIcon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setCreateIcon(iconKey)}
                        className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white ring-2 ring-white/50 shadow-lg scale-105'
                            : 'glass-panel text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <GroupIconBadge iconKey={iconKey} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">
                    {t.maxMembersLabel}: <span className="text-indigo-300 font-bold">{createMaxMembers}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={100}
                    value={createMaxMembers}
                    onChange={(e) => setCreateMaxMembers(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">{t.visibilityLabel}</label>
                  <button
                    type="button"
                    onClick={() => setCreateIsDiscoverable((prev) => !prev)}
                    className="w-full p-2.5 rounded-xl glass-panel text-xs text-left font-semibold flex items-center justify-between text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <span>{createIsDiscoverable ? t.publicDiscoverable : t.privateInviteOnly}</span>
                    {createIsDiscoverable ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{isCreating ? t.creatingGroup : t.createGroupSubmit}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* SUB-MODAL 1: INVITE FRIENDS */}
      {isInviteFriendsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">{t.inviteFriendsToGroup}</h3>
              <button onClick={() => setIsInviteFriendsOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {friends.length === 0 ? (
                <p className="text-xs text-white/50 text-center py-4">{t.noFriendsYet}</p>
              ) : (
                friends.map((f) => {
                  const isAlreadyMember = selectedGroupDetails?.members.some((m) => m.userId === f.id);
                  return (
                    <div key={f.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                          {f.avatarUrl ? <img src={f.avatarUrl} alt={f.nickname} className="w-full h-full object-cover" /> : f.nickname.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-white">@{f.nickname}</span>
                      </div>

                      {isAlreadyMember ? (
                        <span className="text-[10px] text-white/40 font-semibold">{t.alreadyMember}</span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendInvite(f.id)}
                          disabled={invitingFriendId === f.id}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {invitingFriendId === f.id ? 'Sending...' : 'Invite'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: SET WEEKLY GOAL */}
      {isSetGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleSaveGoal} className="relative w-full max-w-md p-6 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">{t.setWeeklyGoalTitle}</h3>
              <button type="button" onClick={() => setIsSetGoalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">{t.goalTitleLabel}</label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder={t.goalTitlePlaceholder}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">{t.goalTargetHoursLabel}</label>
              <input
                type="number"
                min={1}
                max={500}
                value={goalTargetHours}
                onChange={(e) => setGoalTargetHours(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg cursor-pointer"
            >
              {t.saveGoalBtn}
            </button>
          </form>
        </div>
      )}

      {/* SUB-MODAL 3: GROUP SETTINGS (Owner/Admin) */}
      {isGroupSettingsOpen && selectedGroupDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl glass-modal text-white shadow-2xl border border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">{t.groupSettings}</h3>
              <button type="button" onClick={() => setIsGroupSettingsOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedGroupDetails.group.userRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(selectedGroupDetails.group.id)}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.deleteGroup}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

GroupsModal.displayName = 'GroupsModal';
