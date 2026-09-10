import type { AtmosphereTheme } from '../types';

export const ATMOSPHERES: AtmosphereTheme[] = [
  {
    id: 'tokyo',
    name: 'Tokyo Rain',
    tagline: 'Neon reflections on wet Shibuya streets',
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

export const getAtmosphereById = (id: string): AtmosphereTheme => {
  return ATMOSPHERES.find((item) => item.id === id) || ATMOSPHERES[0];
};
