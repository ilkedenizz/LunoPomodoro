import type { AtmosphereTheme, AppTheme } from '../types';

export const DARK_ATMOSPHERES: AtmosphereTheme[] = [
  {
    id: 'tokyo',
    name: 'Tokyo Rain',
    tagline: 'Neon reflections on wet Shibuya streets',
    themeType: 'dark',
    imageUrl: '/atmospheres/tokyo-rain.jpg',
    cssBackground: `
      radial-gradient(circle at 20% 30%, rgba(236, 72, 153, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.2) 0%, transparent 40%),
      linear-gradient(135deg, #070914 0%, #0d1127 40%, #150d2a 100%)
    `,
    overlayOpacity: 0.35,
    recommendedSounds: [
      { track: 'rain', volume: 0.6 },
      { track: 'lofi', volume: 0.3 },
    ],
  },
  {
    id: 'cozy-room',
    name: 'Cozy Study',
    tagline: 'Warm amber lamp glow & quiet desk aesthetic',
    themeType: 'dark',
    imageUrl: '/atmospheres/cozy-study.jpg',
    cssBackground: `
      radial-gradient(circle at 85% 25%, rgba(245, 158, 11, 0.3) 0%, transparent 45%),
      radial-gradient(circle at 15% 85%, rgba(180, 83, 9, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(120, 53, 15, 0.15) 0%, transparent 60%),
      linear-gradient(135deg, #120d0a 0%, #1f140e 50%, #291a12 100%)
    `,
    overlayOpacity: 0.4,
    recommendedSounds: [
      { track: 'fire', volume: 0.5 },
      { track: 'cafe', volume: 0.3 },
    ],
  },
  {
    id: 'library',
    name: 'Midnight Library',
    tagline: 'Quiet wooden shelves and antique spotlights',
    themeType: 'dark',
    imageUrl: '/atmospheres/midnight-library.jpg',
    cssBackground: `
      radial-gradient(circle at 50% 15%, rgba(217, 119, 6, 0.22) 0%, transparent 40%),
      radial-gradient(circle at 10% 75%, rgba(30, 58, 138, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 90% 80%, rgba(15, 23, 42, 0.4) 0%, transparent 50%),
      linear-gradient(135deg, #090e1a 0%, #111a2e 50%, #1a243b 100%)
    `,
    overlayOpacity: 0.45,
    recommendedSounds: [
      { track: 'lofi', volume: 0.4 },
      { track: 'fire', volume: 0.2 },
    ],
  },
  {
    id: 'cafe',
    name: 'Rainy Café',
    tagline: 'Dimly lit coffee house by window glass',
    themeType: 'dark',
    imageUrl: '/atmospheres/rainy-cafe.jpg',
    cssBackground: `
      radial-gradient(circle at 25% 20%, rgba(251, 146, 60, 0.25) 0%, transparent 45%),
      radial-gradient(circle at 75% 65%, rgba(194, 65, 12, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(30, 27, 75, 0.3) 0%, transparent 60%),
      linear-gradient(135deg, #130a06 0%, #21120b 50%, #18111e 100%)
    `,
    overlayOpacity: 0.4,
    recommendedSounds: [
      { track: 'rain', volume: 0.5 },
      { track: 'cafe', volume: 0.5 },
    ],
  },
  {
    id: 'rain',
    name: 'Glass Raindrops',
    tagline: 'Soft rainfall against dark window glass',
    themeType: 'dark',
    imageUrl: '/atmospheres/glass-raindrops.jpg',
    cssBackground: `
      radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.15) 0%, transparent 45%),
      radial-gradient(circle at 80% 85%, rgba(30, 58, 138, 0.25) 0%, transparent 50%),
      linear-gradient(135deg, #060e1a 0%, #0d1b2e 50%, #142740 100%)
    `,
    overlayOpacity: 0.35,
    recommendedSounds: [{ track: 'rain', volume: 0.8 }],
  },
  {
    id: 'night-city',
    name: 'Night Cityscape',
    tagline: 'Panoramic city lights under a starry sky',
    themeType: 'dark',
    imageUrl: '/atmospheres/night-cityscape.jpg',
    cssBackground: `
      radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.25) 0%, transparent 45%),
      radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(244, 63, 94, 0.15) 0%, transparent 40%),
      linear-gradient(135deg, #070712 0%, #101124 50%, #191a38 100%)
    `,
    overlayOpacity: 0.4,
    recommendedSounds: [
      { track: 'lofi', volume: 0.5 },
      { track: 'waves', volume: 0.2 },
    ],
  },
];

export const LIGHT_ATMOSPHERES: AtmosphereTheme[] = [
  {
    id: 'soft-ivory',
    name: 'Soft Ivory',
    tagline: 'Warm cream & delicate organic ambient shapes',
    themeType: 'light',
    cssBackground: `
      radial-gradient(circle at 15% 20%, rgba(254, 243, 199, 0.7) 0%, transparent 50%),
      radial-gradient(circle at 85% 75%, rgba(254, 215, 170, 0.45) 0%, transparent 50%),
      radial-gradient(circle at 50% 40%, rgba(255, 237, 213, 0.35) 0%, transparent 60%),
      linear-gradient(135deg, #fdfbf7 0%, #f7f4ee 50%, #f2ede4 100%)
    `,
    overlayOpacity: 0.02,
    recommendedSounds: [
      { track: 'cafe', volume: 0.3 },
      { track: 'lofi', volume: 0.3 },
    ],
  },
  {
    id: 'morning',
    name: 'Morning',
    tagline: 'Crisp morning daylight & subtle sky-blue warmth',
    themeType: 'light',
    cssBackground: `
      radial-gradient(circle at 20% 15%, rgba(254, 240, 138, 0.35) 0%, transparent 45%),
      radial-gradient(circle at 80% 30%, rgba(186, 230, 253, 0.5) 0%, transparent 55%),
      radial-gradient(circle at 40% 85%, rgba(224, 242, 254, 0.4) 0%, transparent 50%),
      linear-gradient(135deg, #f8fafc 0%, #f0f7ff 50%, #e6f0fa 100%)
    `,
    overlayOpacity: 0.02,
    recommendedSounds: [
      { track: 'waves', volume: 0.3 },
      { track: 'lofi', volume: 0.3 },
    ],
  },
  {
    id: 'paper',
    name: 'Paper',
    tagline: 'Warm editorial cream linen & tactile stillness',
    themeType: 'light',
    cssBackground: `
      radial-gradient(circle at 75% 20%, rgba(245, 239, 230, 0.8) 0%, transparent 50%),
      radial-gradient(circle at 25% 80%, rgba(238, 229, 218, 0.6) 0%, transparent 50%),
      linear-gradient(135deg, #faf7f2 0%, #f3eee5 50%, #ede6d8 100%)
    `,
    overlayOpacity: 0.02,
    recommendedSounds: [
      { track: 'rain', volume: 0.4 },
      { track: 'cafe', volume: 0.2 },
    ],
  },
  {
    id: 'soft-nature',
    name: 'Soft Nature',
    tagline: 'Calm matcha sage & gentle organic beige tones',
    themeType: 'light',
    cssBackground: `
      radial-gradient(circle at 20% 25%, rgba(220, 252, 231, 0.55) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(254, 243, 199, 0.45) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(240, 253, 244, 0.4) 0%, transparent 60%),
      linear-gradient(135deg, #f7faf7 0%, #edf5ee 50%, #e2ece3 100%)
    `,
    overlayOpacity: 0.02,
    recommendedSounds: [
      { track: 'rain', volume: 0.3 },
      { track: 'fire', volume: 0.2 },
    ],
  },
];

export const ATMOSPHERES: AtmosphereTheme[] = [...DARK_ATMOSPHERES, ...LIGHT_ATMOSPHERES];

export const getAtmospheres = (theme: AppTheme = 'dark'): AtmosphereTheme[] => {
  return theme === 'light' ? LIGHT_ATMOSPHERES : DARK_ATMOSPHERES;
};

export const getDefaultAtmosphere = (theme: AppTheme = 'dark'): AtmosphereTheme => {
  return theme === 'light' ? LIGHT_ATMOSPHERES[0] : DARK_ATMOSPHERES[0];
};

export const getAtmosphereById = (id: string, theme: AppTheme = 'dark'): AtmosphereTheme => {
  const found = ATMOSPHERES.find((item) => item.id === id);
  if (found) return found;
  return getDefaultAtmosphere(theme);
};

