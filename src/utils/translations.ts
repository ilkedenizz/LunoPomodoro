import type { AppLanguage } from '../types';

export interface Translations {
  // Common
  save: string;
  saved: string;
  cancel: string;
  done: string;
  close: string;
  delete: string;
  edit: string;
  upload: string;
  remove: string;
  min: string;
  hrs: string;
  days: string;
  day: string;
  today: string;
  yesterday: string;
  verified: string;
  unverified: string;
  justNow: string;
  notSyncedYet: string;

  // Header & Footer
  brandTagline: string;
  themeDark: string;
  themeLight: string;
  focusHistoryTooltip: string;
  soundMixerTooltip: string;
  atmosphereStudioTooltip: string;
  shortcutsTooltip: string;
  friendsCommunityTooltip: string;
  newRequest: string;
  signIn: string;
  account: string;
  settings: string;
  toggleFullscreen: string;
  todayFocused: string;
  todayPomodoroSingle: string;
  todayPomodoroPlural: string;
  pressKey: string;
  audioKey: string;

  // Timer & Modes
  pomodoro: string;
  shortBreak: string;
  longBreak: string;
  focusSessionHeading: string;
  shortBreakHeading: string;
  longBreakHeading: string;
  cycle: string;
  start: string;
  pause: string;
  resume: string;
  reset: string;
  skip: string;
  startBreak: string;
  continueFocus: string;
  sessionComplete: string;
  breakComplete: string;
  readyToStart: string;
  noActiveTask: string;
  activeTask: string;

  // Daily Focus
  dailyFocus: string;
  dailyGoal: string;
  targetPomodoros: string;
  targetMinutes: string;
  editGoal: string;
  goalAchieved: string;
  goalInProgress: string;

  // Tasks
  tasks: string;
  addTaskPlaceholder: string;
  addTask: string;
  noTasks: string;
  completedTasks: string;
  clearCompleted: string;
  selectAsActive: string;

  // Settings & Preferences
  preferences: string;
  settingsPreferences: string;
  profileHub: string;
  language: string;
  english: string;
  turkish: string;
  appearanceTheme: string;
  darkTheme: string;
  lightTheme: string;
  timerColor: string;
  timerDurations: string;
  automation: string;
  autoStartBreaks: string;
  autoStartPomodoros: string;
  audioNotifications: string;
  completionSound: string;
  browserNotifications: string;
  resetTodayStats: string;
  resetConfirm: string;

  // Profile Hub
  editProfile: string;
  closeEdit: string;
  signOut: string;
  cloudSynced: string;
  syncing: string;
  savedLocally: string;
  offline: string;
  focusStatistics: string;
  totalFocusTime: string;
  allTimeFocus: string;
  pomos: string;
  completed: string;
  todayFocus: string;
  activeStreak: string;
  streak: string;
  firstSessionPrompt: string;
  openFriends: string;
  friendsCommunityDesc: string;
  cloudSyncMembership: string;
  lastCloudSync: string;
  memberSince: string;
  emailUnverified: string;
  resendEmail: string;
  resendSuccess: string;
  syncNow: string;
  syncingRecords: string;
  unsyncedChanges: string;
  autoRetrying: string;

  // Profile Edit Form
  editProfileDetails: string;
  profilePhoto: string;
  photoHint: string;
  changePhoto: string;
  uploadPhoto: string;
  removePhoto: string;
  nicknameLabel: string;
  nicknameHint: string;
  nicknamePlaceholder: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  changePasswordLink: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  updatePassword: string;
  updatingPassword: string;
  saveChanges: string;
  nicknameChecking: string;
  nicknameAvailable: string;
  nicknameTaken: string;
  nicknameRequired: string;
  nicknameInvalid: string;
  passwordUpdatedSuccess: string;
  passwordsDoNotMatch: string;
  passwordMinLength: string;
  photoUpdatedSuccess: string;
  photoRemovedSuccess: string;

  // Guest Mode
  localGuestMode: string;
  guestModeDesc: string;
  signInCreateAccount: string;
  localFocusStats: string;

  // Friends Modal
  friendsTitle: string;
  searchFriendsPlaceholder: string;
  myFriendsTab: string;
  findFriendsTab: string;
  requestsTab: string;
  noFriendsYet: string;
  noRequests: string;
  addFriend: string;
  requestSent: string;
  alreadyFriends: string;
  accept: string;
  reject: string;
  removeFriend: string;
  removeFriendConfirm: string;
  searchPrompt: string;
  searching: string;
  noUsersFound: string;
  pendingRequestBadge: string;
  streakDays: string;

  // Auth Modal
  authWelcome: string;
  authSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  forgotPassword: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  backToSignIn: string;
  createAccountBtn: string;
  signInBtn: string;
  sendResetLink: string;
  updatePasswordBtn: string;
  resetLinkSent: string;
  verificationEmailSent: string;

  // Background & Atmosphere
  atmosphereStudioTitle: string;
  atmosphereStudioSubtitleLight: string;
  atmosphereStudioSubtitleDark: string;
  atmospheresTab: string;
  soundMixerTab: string;
  presetsTab: string;
  all: string;
  favorites: string;
  noFavoritesYet: string;
  noFavoritesHint: string;
  customWallpaper: string;
  yourUploadedPhoto: string;
  uploadWallpaper: string;
  optimizingImage: string;
  changeWallpaper: string;
  removeWallpaper: string;
  activeBadge: string;
  dismiss: string;
  customBg: string;
  uploadCustomBg: string;
  customBgHint: string;
  removeCustomBg: string;

  // Sound Mixer
  masterSoundVolume: string;
  overallAudioOutput: string;
  toggleMasterMute: string;
  ambientSoundTracks: string;
  resetMix: string;
  mute: string;
  trackRain: string;
  trackCafe: string;
  trackFire: string;
  trackWaves: string;
  trackLofi: string;

  // Presets
  presetsTitle: string;
  saveCurrentSetup: string;
  nameYourPreset: string;
  presetPlaceholder: string;
  noPresetsYet: string;
  noPresetsHint: string;
  applyPreset: string;
  deletePreset: string;

  // Ambience Audio Player
  multiTrackMixerTitle: string;
  multiTrackMixerSubtitle: string;

  // Shortcuts Modal
  shortcutsTitle: string;
  shortcutSpace: string;
  shortcutR: string;
  shortcutS: string;
  shortcutM: string;
  shortcutEsc: string;

  // History Modal & Components
  historyTitle: string;
  historySubtitle: string;
  journeyStartsHere: string;
  journeyDesc: string;
  startFocusing: string;
  periodToday: string;
  periodWeek: string;
  periodMonth: string;
  totalFocus: string;
  focusedTime: string;
  pomodorosSessions: string;
  sessionsCompleted: string;
  consecutiveFocus: string;
  bestDay: string;
  noneYet: string;
  noSessionsYet: string;
  weeklyActivity: string;
  hoverForDetailsWeek: string;
  monthlyDistribution: string;
  hoverForDetailsMonth: string;
  less: string;
  more: string;
  allTimeStats: string;
  daysFocused: string;
  avgPerFocusDay: string;
  recentSessions: string;
  sessionSingle: string;
  sessionPlural: string;
  focusSessionDefault: string;
  noSessions: string;
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  en: {
    // Common
    save: 'Save',
    saved: 'Saved',
    cancel: 'Cancel',
    done: 'Done',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    upload: 'Upload',
    remove: 'Remove',
    min: 'min',
    hrs: 'h',
    days: 'days',
    day: 'day',
    today: 'Today',
    yesterday: 'Yesterday',
    verified: 'Verified',
    unverified: 'Unverified',
    justNow: 'Just now',
    notSyncedYet: 'Not synced yet',

    // Header & Footer
    brandTagline: 'Focus in your own atmosphere',
    themeDark: 'Switch to Dark Theme',
    themeLight: 'Switch to Light Theme',
    focusHistoryTooltip: 'Focus History & Stats',
    soundMixerTooltip: 'Ambient Sound Mixer (M)',
    atmosphereStudioTooltip: 'Atmosphere Studio',
    shortcutsTooltip: 'Keyboard Shortcuts',
    friendsCommunityTooltip: 'Friends & Community',
    newRequest: 'new request!',
    signIn: 'Sign In',
    account: 'Account',
    settings: 'Settings',
    toggleFullscreen: 'Toggle Fullscreen',
    todayFocused: 'focused',
    todayPomodoroSingle: 'pomodoro',
    todayPomodoroPlural: 'pomodoros',
    pressKey: 'Press',
    audioKey: 'Audio',

    // Timer & Modes
    pomodoro: 'Pomodoro',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
    focusSessionHeading: 'FOCUS SESSION',
    shortBreakHeading: 'SHORT BREAK',
    longBreakHeading: 'LONG BREAK',
    cycle: 'Cycle',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    skip: 'Skip',
    startBreak: 'Start Break',
    continueFocus: 'Continue Focus',
    sessionComplete: 'Session Complete!',
    breakComplete: 'Break Ended!',
    readyToStart: 'Ready to start',
    noActiveTask: 'No active task selected',
    activeTask: 'Active Task',

    // Daily Focus
    dailyFocus: 'Daily Focus',
    dailyGoal: 'Daily Goal',
    targetPomodoros: 'Target Pomodoros',
    targetMinutes: 'Target Focus (min)',
    editGoal: 'Edit Goal',
    goalAchieved: 'Daily Goal Achieved! 🎉',
    goalInProgress: 'Keep up the momentum',

    // Tasks
    tasks: 'Focus Tasks',
    addTaskPlaceholder: 'Add a new focus task...',
    addTask: 'Add Task',
    noTasks: 'No focus tasks yet. Add one above to stay organized.',
    completedTasks: 'Completed',
    clearCompleted: 'Clear completed',
    selectAsActive: 'Set as active timer task',

    // Settings & Preferences
    preferences: 'Preferences',
    settingsPreferences: 'Settings & Preferences',
    profileHub: 'Profile Hub',
    language: 'Language',
    english: 'English',
    turkish: 'Türkçe',
    appearanceTheme: 'Appearance / Theme',
    darkTheme: 'Dark Theme',
    lightTheme: 'Light Theme',
    timerColor: 'Timer Color',
    timerDurations: 'Timer Durations',
    automation: 'Automation',
    autoStartBreaks: 'Auto-start Breaks',
    autoStartPomodoros: 'Auto-start Pomodoros',
    audioNotifications: 'Audio & Notifications',
    completionSound: 'Completion Sound Chime',
    browserNotifications: 'Browser Notifications',
    resetTodayStats: "Reset Today's Stats",
    resetConfirm: 'Are you sure you want to reset today statistics?',

    // Profile Hub
    editProfile: 'Edit Profile',
    closeEdit: 'Close Edit',
    signOut: 'Sign Out',
    cloudSynced: 'Cloud Synced',
    syncing: 'Syncing...',
    savedLocally: 'Saved Locally',
    offline: 'Offline',
    focusStatistics: 'Focus Statistics',
    totalFocusTime: 'Total Focus Time',
    allTimeFocus: 'Total Focus',
    pomos: 'POMOS',
    completed: 'Completed',
    todayFocus: 'Today Focus',
    activeStreak: 'Active Streak',
    streak: 'STREAK',
    firstSessionPrompt: 'Start your first focus session to build your streak and analytics.',
    openFriends: 'Open Friends',
    friendsCommunityDesc: 'Find study partners, compare streaks, and share focus sessions.',
    cloudSyncMembership: 'Cloud Sync & Membership',
    lastCloudSync: 'Last cloud sync:',
    memberSince: 'Member since:',
    emailUnverified: 'Email unverified',
    resendEmail: 'Resend Email',
    resendSuccess: 'Verification email sent! Check your inbox.',
    syncNow: 'Sync Now',
    syncingRecords: 'Synchronizing records...',
    unsyncedChanges: 'unsynced change(s) saved locally',
    autoRetrying: 'Auto-retrying',

    // Profile Edit Form
    editProfileDetails: 'Edit Profile Details',
    profilePhoto: 'Profile Photo',
    photoHint: 'JPG, PNG or WEBP (max 3MB)',
    changePhoto: 'Change photo',
    uploadPhoto: 'Upload photo',
    removePhoto: 'Remove photo',
    nicknameLabel: 'Nickname / Username',
    nicknameHint: '3-20 chars, unique',
    nicknamePlaceholder: 'zen_master',
    displayNameLabel: 'Display Name (optional)',
    displayNamePlaceholder: 'e.g. Alex, FocusMaster',
    changePasswordLink: 'Change account password...',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'New password (min. 6 chars)',
    confirmPasswordPlaceholder: 'Confirm new password',
    updatePassword: 'Update Password',
    updatingPassword: 'Updating Password...',
    saveChanges: 'Save Changes',
    nicknameChecking: 'Checking availability...',
    nicknameAvailable: 'Nickname is available!',
    nicknameTaken: 'This nickname is already taken.',
    nicknameRequired: 'Nickname is required.',
    nicknameInvalid: 'Nickname must be 3-20 letters, numbers, or underscores.',
    passwordUpdatedSuccess: 'Password updated successfully!',
    passwordsDoNotMatch: 'Passwords do not match.',
    passwordMinLength: 'New password must be at least 6 characters long.',
    photoUpdatedSuccess: 'Profile photo updated successfully!',
    photoRemovedSuccess: 'Profile photo removed.',

    // Guest Mode
    localGuestMode: 'Local Guest Mode',
    guestModeDesc: 'All your tasks, preferences, and focus sessions are saved locally on this browser. Create or sign in to an account anytime to back up, sync across all your devices, and connect with study friends.',
    signInCreateAccount: 'Sign In / Create Account',
    localFocusStats: 'Local Focus Stats',

    // Friends Modal
    friendsTitle: 'Friends & Study Buddies',
    searchFriendsPlaceholder: 'Search by @nickname or name...',
    myFriendsTab: 'My Friends',
    findFriendsTab: 'Find Friends',
    requestsTab: 'Requests',
    noFriendsYet: 'No friends yet. Search by username above to add study partners!',
    noRequests: 'No pending friend requests.',
    addFriend: 'Add Friend',
    requestSent: 'Request Sent',
    alreadyFriends: 'Friends',
    accept: 'Accept',
    reject: 'Reject',
    removeFriend: 'Remove Friend',
    removeFriendConfirm: 'Are you sure you want to remove this friend?',
    searchPrompt: 'Search users by nickname to connect and study together.',
    searching: 'Searching...',
    noUsersFound: 'No users found matching that query.',
    pendingRequestBadge: 'pending',
    streakDays: 'streak',

    // Auth Modal
    authWelcome: 'Welcome to Luno',
    authSubtitle: 'Focus in your own atmosphere',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    dontHaveAccount: "Don't have an account? Sign up",
    alreadyHaveAccount: 'Already have an account? Sign in',
    backToSignIn: 'Back to Sign In',
    createAccountBtn: 'Create Account',
    signInBtn: 'Sign In',
    sendResetLink: 'Send Password Reset Link',
    updatePasswordBtn: 'Update Password',
    resetLinkSent: 'Password reset link sent! Check your email.',
    verificationEmailSent: 'Verification link sent! Check your email to activate your account.',

    // Background & Atmosphere
    atmosphereStudioTitle: 'Atmosphere Studio',
    atmosphereStudioSubtitleLight: 'Curated light atmospheres and ambient soundscapes',
    atmosphereStudioSubtitleDark: 'Craft your custom study backdrop and focus environment',
    atmospheresTab: 'Atmospheres',
    soundMixerTab: 'Sound Mixer',
    presetsTab: 'Presets',
    all: 'All',
    favorites: 'Favorites',
    noFavoritesYet: 'No favorite atmospheres yet.',
    noFavoritesHint: 'Click the heart icon on any atmosphere card to add it to your favorites!',
    customWallpaper: 'Custom Wallpaper',
    yourUploadedPhoto: 'Your uploaded photo',
    uploadWallpaper: 'Upload Wallpaper',
    optimizingImage: 'Optimizing Image...',
    changeWallpaper: 'Change',
    removeWallpaper: 'Remove',
    activeBadge: 'Active',
    dismiss: 'Dismiss',
    customBg: 'Custom Background',
    uploadCustomBg: 'Upload Your Image',
    customBgHint: 'Select a JPG, PNG or WEBP from your device',
    removeCustomBg: 'Remove custom image',

    // Sound Mixer
    masterSoundVolume: 'Master Sound Volume',
    overallAudioOutput: 'Overall audio output level',
    toggleMasterMute: 'Toggle Master Mute',
    ambientSoundTracks: 'AMBIENT SOUND TRACKS',
    resetMix: 'Reset Mix',
    mute: 'Mute',
    trackRain: 'Rainfall',
    trackCafe: 'Café Murmur',
    trackFire: 'Cozy Fireplace',
    trackWaves: 'Ocean Waves',
    trackLofi: 'Lo-Fi Chords',

    // Presets
    presetsTitle: 'Atmosphere & Sound Presets',
    saveCurrentSetup: 'Save Current Setup',
    nameYourPreset: 'Name Your Atmosphere Preset',
    presetPlaceholder: 'e.g., Deep Focus Rain & Lo-Fi',
    noPresetsYet: 'No custom presets saved yet.',
    noPresetsHint: 'Mix your favorite background and sounds, then save it as a quick preset!',
    applyPreset: 'Apply',
    deletePreset: 'Delete Preset',

    // Ambience Audio Player
    multiTrackMixerTitle: 'Multi-Track Ambient Sound Mixer',
    multiTrackMixerSubtitle: 'Layer ambient soundscapes (Rain, Café, Fire, Waves, Lo-Fi) simultaneously',

    // Shortcuts Modal
    shortcutsTitle: 'Keyboard Shortcuts',
    shortcutSpace: 'Start or pause the timer / Continue after break',
    shortcutR: 'Reset current timer',
    shortcutS: 'Skip session / Start break',
    shortcutM: 'Toggle ambient sound mixer',
    shortcutEsc: 'Close active modal / window',

    // History Modal & Components
    historyTitle: 'Focus History & Analytics',
    historySubtitle: 'Your personal focus journey over time',
    journeyStartsHere: 'YOUR FOCUS JOURNEY STARTS HERE',
    journeyDesc: 'Complete your first Pomodoro session in Luno to unlock your statistics, charts, and streak history.',
    startFocusing: 'Start Focusing',
    periodToday: 'Today',
    periodWeek: 'This Week',
    periodMonth: 'This Month',
    totalFocus: 'Total Focus',
    focusedTime: 'focused time',
    pomodorosSessions: 'Pomodoros',
    sessionsCompleted: 'sessions completed',
    consecutiveFocus: 'consecutive focus',
    bestDay: 'Best Day',
    noneYet: 'None yet',
    noSessionsYet: 'no sessions yet',
    weeklyActivity: 'Weekly Focus Activity',
    hoverForDetailsWeek: 'Hover over a day for details',
    monthlyDistribution: 'Monthly Focus Distribution',
    hoverForDetailsMonth: 'Hover over a date for details',
    less: 'Less',
    more: 'More',
    allTimeStats: 'All-Time Stats',
    daysFocused: 'Days Focused',
    avgPerFocusDay: 'Avg / Focus Day',
    recentSessions: 'Recent Sessions',
    sessionSingle: 'session',
    sessionPlural: 'sessions',
    focusSessionDefault: 'Focus Session',
    noSessions: 'No focus sessions recorded yet.',
  },
  tr: {
    // Common
    save: 'Kaydet',
    saved: 'Kaydedildi',
    cancel: 'İptal',
    done: 'Tamam',
    close: 'Kapat',
    delete: 'Sil',
    edit: 'Düzenle',
    upload: 'Yükle',
    remove: 'Kaldır',
    min: 'dk',
    hrs: 'saat',
    days: 'gün',
    day: 'gün',
    today: 'Bugün',
    yesterday: 'Dün',
    verified: 'Doğrulandı',
    unverified: 'Doğrulanmadı',
    justNow: 'Az önce',
    notSyncedYet: 'Henüz senkronize edilmedi',

    // Header & Footer
    brandTagline: 'Kendi atmosferinde odaklan',
    themeDark: 'Karanlık Temaya Geç',
    themeLight: 'Aydınlık Temaya Geç',
    focusHistoryTooltip: 'Çalışma Geçmişi & İstatistikler',
    soundMixerTooltip: 'Ortam Ses Mikseri (M)',
    atmosphereStudioTooltip: 'Atmosfer Stüdyosu',
    shortcutsTooltip: 'Klavye Kısayolları',
    friendsCommunityTooltip: 'Arkadaşlar & Topluluk',
    newRequest: 'yeni istek!',
    signIn: 'Giriş Yap',
    account: 'Hesap',
    settings: 'Ayarlar',
    toggleFullscreen: 'Tam Ekran',
    todayFocused: 'odaklanıldı',
    todayPomodoroSingle: 'pomodoro',
    todayPomodoroPlural: 'pomodoro',
    pressKey: 'Tuş:',
    audioKey: 'Ses',

    // Timer & Modes
    pomodoro: 'Pomodoro',
    shortBreak: 'Kısa Mola',
    longBreak: 'Uzun Mola',
    focusSessionHeading: 'ODAKLANMA OTURUMU',
    shortBreakHeading: 'KISA MOLA',
    longBreakHeading: 'UZUN MOLA',
    cycle: 'Döngü',
    start: 'Başlat',
    pause: 'Duraklat',
    resume: 'Devam Et',
    reset: 'Sıfırla',
    skip: 'Geç',
    startBreak: 'Molayı Başlat',
    continueFocus: 'Odağa Devam Et',
    sessionComplete: 'Oturum Tamamlandı!',
    breakComplete: 'Mola Sona Erdi!',
    readyToStart: 'Başlamaya hazır',
    noActiveTask: 'Aktif görev seçilmedi',
    activeTask: 'Aktif Görev',

    // Daily Focus
    dailyFocus: 'Günlük Hedef',
    dailyGoal: 'Günlük Hedef',
    targetPomodoros: 'Hedef Pomodoro',
    targetMinutes: 'Hedef Süre (dk)',
    editGoal: 'Hedefi Düzenle',
    goalAchieved: 'Günlük Hedef Tamamlandı! 🎉',
    goalInProgress: 'Harika gidiyorsun, devam et',

    // Tasks
    tasks: 'Odak Görevleri',
    addTaskPlaceholder: 'Yeni bir odak görevi ekle...',
    addTask: 'Görev Ekle',
    noTasks: 'Henüz görev yok. Düzenli kalmak için yukarıdan ekleyin.',
    completedTasks: 'Tamamlananlar',
    clearCompleted: 'Tamamlananları temizle',
    selectAsActive: 'Aktif zamanlayıcı görevi yap',

    // Settings & Preferences
    preferences: 'Tercihler',
    settingsPreferences: 'Ayarlar & Tercihler',
    profileHub: 'Profil Merkezi',
    language: 'Dil',
    english: 'English',
    turkish: 'Türkçe',
    appearanceTheme: 'Görünüm / Tema',
    darkTheme: 'Karanlık Tema',
    lightTheme: 'Aydınlık Tema',
    timerColor: 'Zamanlayıcı Rengi',
    timerDurations: 'Süre Ayarları',
    automation: 'Otomasyon',
    autoStartBreaks: 'Molaları Otomatik Başlat',
    autoStartPomodoros: 'Pomodoroları Otomatik Başlat',
    audioNotifications: 'Ses & Bildirimler',
    completionSound: 'Tamamlama Zil Sesi',
    browserNotifications: 'Tarayıcı Bildirimleri',
    resetTodayStats: "Bugünkü İstatistikleri Sıfırla",
    resetConfirm: 'Bugünkü istatistikleri sıfırlamak istediğinize emin misiniz?',

    // Profile Hub
    editProfile: 'Profili Düzenle',
    closeEdit: 'Düzenlemeyi Kapat',
    signOut: 'Çıkış Yap',
    cloudSynced: 'Bulut Senkronize',
    syncing: 'Senkronize ediliyor...',
    savedLocally: 'Yerel Kaydedildi',
    offline: 'Çevrimdışı',
    focusStatistics: 'Çalışma İstatistikleri',
    totalFocusTime: 'Toplam Odaklanma Süresi',
    allTimeFocus: 'Toplam Odak',
    pomos: 'POMODORO',
    completed: 'Tamamlanan',
    todayFocus: 'Bugünkü Odak',
    activeStreak: 'Aktif Seri',
    streak: 'SERİ',
    firstSessionPrompt: 'Serinizi ve istatistiklerinizi oluşturmak için ilk oturumunuzu başlatın.',
    openFriends: 'Arkadaşları Aç',
    friendsCommunityDesc: 'Çalışma arkadaşları bulun, serileri karşılaştırın ve oturumlarınızı paylaşın.',
    cloudSyncMembership: 'Bulut Senkronizasyonu & Üyelik',
    lastCloudSync: 'Son bulut senkronizasyonu:',
    memberSince: 'Üyelik tarihi:',
    emailUnverified: 'E-posta doğrulanmadı',
    resendEmail: 'Yeniden Gönder',
    resendSuccess: 'Doğrulama e-postası gönderildi! Gelen kutunuzu kontrol edin.',
    syncNow: 'Şimdi Senkronize Et',
    syncingRecords: 'Kayıtlar senkronize ediliyor...',
    unsyncedChanges: 'senkronize edilmemiş yerel değişiklik',
    autoRetrying: 'Otomatik deneniyor',

    // Profile Edit Form
    editProfileDetails: 'Profil Bilgilerini Düzenle',
    profilePhoto: 'Profil Fotoğrafı',
    photoHint: 'JPG, PNG veya WEBP (maks 3MB)',
    changePhoto: 'Fotoğrafı değiştir',
    uploadPhoto: 'Fotoğraf yükle',
    removePhoto: 'Fotoğrafı kaldır',
    nicknameLabel: 'Kullanıcı Adı',
    nicknameHint: '3-20 karakter, benzersiz',
    nicknamePlaceholder: 'zen_master',
    displayNameLabel: 'Görünen Ad (isteğe bağlı)',
    displayNamePlaceholder: 'Örn: Alex, OdakUstası',
    changePasswordLink: 'Hesap şifresini değiştir...',
    newPasswordLabel: 'Yeni Şifre',
    newPasswordPlaceholder: 'Yeni şifre (en az 6 karakter)',
    confirmPasswordPlaceholder: 'Yeni şifreyi doğrula',
    updatePassword: 'Şifreyi Güncelle',
    updatingPassword: 'Şifre Güncelleniyor...',
    saveChanges: 'Değişiklikleri Kaydet',
    nicknameChecking: 'Müsaitlik kontrol ediliyor...',
    nicknameAvailable: 'Kullanıcı adı müsait!',
    nicknameTaken: 'Bu kullanıcı adı zaten alınmış.',
    nicknameRequired: 'Kullanıcı adı gereklidir.',
    nicknameInvalid: 'Kullanıcı adı 3-20 harf, rakam veya alt çizgi olmalıdır.',
    passwordUpdatedSuccess: 'Şifre başarıyla güncellendi!',
    passwordsDoNotMatch: 'Şifreler eşleşmiyor.',
    passwordMinLength: 'Yeni şifre en az 6 karakter olmalıdır.',
    photoUpdatedSuccess: 'Profil fotoğrafı başarıyla güncellendi!',
    photoRemovedSuccess: 'Profil fotoğrafı kaldırıldı.',

    // Guest Mode
    localGuestMode: 'Yerel Misafir Modu',
    guestModeDesc: 'Tüm görevleriniz, tercihleriniz ve odak oturumlarınız bu tarayıcıda yerel olarak saklanır. Yedeklemek, tüm cihazlarınız arasında eşitlemek ve çalışma arkadaşlarınızla bağlantı kurmak için istediğiniz zaman giriş yapın veya hesap oluşturun.',
    signInCreateAccount: 'Giriş Yap / Hesap Oluştur',
    localFocusStats: 'Yerel Çalışma İstatistikleri',

    // Friends Modal
    friendsTitle: 'Arkadaşlar & Çalışma Arkadaşları',
    searchFriendsPlaceholder: '@kullaniciadi veya isim ile ara...',
    myFriendsTab: 'Arkadaşlarım',
    findFriendsTab: 'Arkadaş Bul',
    requestsTab: 'İstekler',
    noFriendsYet: 'Henüz arkadaş yok. Çalışma arkadaşı eklemek için yukarıdan arayın!',
    noRequests: 'Bekleyen arkadaşlık isteği yok.',
    addFriend: 'Arkadaş Ekle',
    requestSent: 'İstek Gönderildi',
    alreadyFriends: 'Arkadaşsınız',
    accept: 'Kabul Et',
    reject: 'Reddet',
    removeFriend: 'Arkadaşlıktan Çıkar',
    removeFriendConfirm: 'Bu arkadaşı çıkarmak istediğinize emin misiniz?',
    searchPrompt: 'Birlikte çalışmak ve bağlanmak için kullanıcı adına göre arama yapın.',
    searching: 'Aranıyor...',
    noUsersFound: 'Bu aramayla eşleşen kullanıcı bulunamadı.',
    pendingRequestBadge: 'bekliyor',
    streakDays: 'seri',

    // Auth Modal
    authWelcome: "Luno'ya Hoş Geldin",
    authSubtitle: 'Kendi atmosferinde odaklan',
    emailLabel: 'E-posta Adresi',
    passwordLabel: 'Şifre',
    confirmPasswordLabel: 'Şifreyi Doğrula',
    forgotPassword: 'Şifremi Unuttum',
    dontHaveAccount: 'Hesabınız yok mu? Kayıt olun',
    alreadyHaveAccount: 'Zaten hesabınız var mı? Giriş yapın',
    backToSignIn: "Giriş Yap'a Dön",
    createAccountBtn: 'Hesap Oluştur',
    signInBtn: 'Giriş Yap',
    sendResetLink: 'Sıfırlama Bağlantısı Gönder',
    updatePasswordBtn: 'Şifreyi Güncelle',
    resetLinkSent: 'Şifre sıfırlama bağlantısı gönderildi! E-postanızı kontrol edin.',
    verificationEmailSent: 'Doğrulama bağlantısı gönderildi! Hesabınızı etkinleştirmek için e-postanızı kontrol edin.',

    // Background & Atmosphere
    atmosphereStudioTitle: 'Atmosfer Stüdyosu',
    atmosphereStudioSubtitleLight: 'Özenle seçilmiş aydınlık atmosferler ve ortam sesleri',
    atmosphereStudioSubtitleDark: 'Kişisel çalışma ortamınızı ve odak arka planınızı oluşturun',
    atmospheresTab: 'Atmosferler',
    soundMixerTab: 'Ses Mikseri',
    presetsTab: 'Hazır Şablonlar',
    all: 'Tümü',
    favorites: 'Favoriler',
    noFavoritesYet: 'Henüz favori atmosfer yok.',
    noFavoritesHint: 'Favorilerinize eklemek için herhangi bir atmosfer kartındaki kalp simgesine tıklayın!',
    customWallpaper: 'Özel Görsel',
    yourUploadedPhoto: 'Yüklediğiniz fotoğraf',
    uploadWallpaper: 'Görsel Yükle',
    optimizingImage: 'Görsel İşleniyor...',
    changeWallpaper: 'Değiştir',
    removeWallpaper: 'Kaldır',
    activeBadge: 'Aktif',
    dismiss: 'Kapat',
    customBg: 'Özel Arka Plan',
    uploadCustomBg: 'Kendi Görselini Yükle',
    customBgHint: 'Cihazınızdan JPG, PNG veya WEBP görseli seçin',
    removeCustomBg: 'Özel görseli kaldır',

    // Sound Mixer
    masterSoundVolume: 'Ana Ses Düzeyi',
    overallAudioOutput: 'Genel ses çıkış seviyesi',
    toggleMasterMute: 'Ana Sesi Aç/Kapat',
    ambientSoundTracks: 'ORTAM SES KANALLARI',
    resetMix: 'Mikseri Sıfırla',
    mute: 'Sessiz',
    trackRain: 'Yağmur Sesi',
    trackCafe: 'Kafe Ambiyansı',
    trackFire: 'Şömine Ateşi',
    trackWaves: 'Okyanus Dalgaları',
    trackLofi: 'Lo-Fi Akorları',

    // Presets
    presetsTitle: 'Atmosfer & Ses Şablonları',
    saveCurrentSetup: 'Mevcut Ayarı Kaydet',
    nameYourPreset: 'Şablonunuza İsim Verin',
    presetPlaceholder: 'Örn: Derin Odak Yağmur & Lo-Fi',
    noPresetsYet: 'Henüz kayıtlı özel şablon yok.',
    noPresetsHint: 'Favori arka planınızı ve seslerinizi karıştırın, ardından hızlı şablon olarak kaydedin!',
    applyPreset: 'Uygula',
    deletePreset: 'Şablonu Sil',

    // Ambience Audio Player
    multiTrackMixerTitle: 'Çok Kanallı Ortam Ses Mikseri',
    multiTrackMixerSubtitle: 'Ortam seslerini (Yağmur, Kafe, Şömine, Dalgalar, Lo-Fi) eşzamanlı olarak harmanlayın',

    // Shortcuts Modal
    shortcutsTitle: 'Klavye Kısayolları',
    shortcutSpace: 'Zamanlayıcıyı başlat/duraklat / Moladan sonra devam et',
    shortcutR: 'Mevcut zamanlayıcıyı sıfırla',
    shortcutS: 'Oturumu geç / Molayı başlat',
    shortcutM: 'Ortam ses mikserini aç/kapat',
    shortcutEsc: 'Aktif pencereyi kapat',

    // History Modal & Components
    historyTitle: 'Çalışma Geçmişi & İstatistikler',
    historySubtitle: 'Zaman içindeki kişisel çalışma yolculuğunuz',
    journeyStartsHere: 'ODAKLANMA YOLCULUĞUNUZ BURADA BAŞLIYOR',
    journeyDesc: 'İstatistiklerinizi, grafiklerinizi ve seri geçmişinizi açmak için Luno\'da ilk Pomodoro oturumunuzu tamamlayın.',
    startFocusing: 'Odaklanmaya Başla',
    periodToday: 'Bugün',
    periodWeek: 'Bu Hafta',
    periodMonth: 'Bu Ay',
    totalFocus: 'Toplam Odak',
    focusedTime: 'odaklanılan süre',
    pomodorosSessions: 'Pomodoro',
    sessionsCompleted: 'tamamlanan oturum',
    consecutiveFocus: 'ardışık odak günü',
    bestDay: 'En İyi Gün',
    noneYet: 'Henüz yok',
    noSessionsYet: 'henüz oturum yok',
    weeklyActivity: 'Haftalık Odak Aktivitesi',
    hoverForDetailsWeek: 'Detaylar için bir günün üzerine gelin',
    monthlyDistribution: 'Aylık Odak Dağılımı',
    hoverForDetailsMonth: 'Detaylar için bir tarihin üzerine gelin',
    less: 'Az',
    more: 'Çok',
    allTimeStats: 'Tüm Zamanların İstatistikleri',
    daysFocused: 'Odaklanılan Gün',
    avgPerFocusDay: 'Ort. / Odak Günü',
    recentSessions: 'Son Oturumlar',
    sessionSingle: 'oturum',
    sessionPlural: 'oturum',
    focusSessionDefault: 'Odak Oturumu',
    noSessions: 'Henüz kaydedilmiş çalışma oturumu yok.',
  },
};

export const getTranslations = (lang: AppLanguage = 'en'): Translations => {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
};

export const formatDurationHoursMinutes = (totalMinutes: number, lang: AppLanguage = 'en'): string => {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (lang === 'tr') {
    if (hrs === 0) return `${mins} dk`;
    if (mins === 0) return `${hrs} saat`;
    return `${hrs} saat ${mins} dk`;
  }
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};
