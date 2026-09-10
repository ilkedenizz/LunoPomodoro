import type { AtmosphereTheme } from '../types';

export const ATMOSPHERES: AtmosphereTheme[] = [
  {
    id: 'tokyo',
    name: 'Tokyo Rain',
    tagline: 'Neon reflections on wet Shibuya streets',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #0d0f18 0%, #1e1b4b 50%, #31103f 100%)',
    overlayOpacity: 0.35,
  },
  {
    id: 'cozy-room',
    name: 'Cozy Study',
    tagline: 'Warm amber glow & desk aesthetic',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)',
    overlayOpacity: 0.4,
  },
  {
    id: 'library',
    name: 'Midnight Library',
    tagline: 'Quiet wooden shelves and antique books',
    imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    overlayOpacity: 0.45,
  },
  {
    id: 'cafe',
    name: 'Rainy Café',
    tagline: 'Dimly lit coffee house by window',
    imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #180e0a 0%, #2c1810 50%, #422015 100%)',
    overlayOpacity: 0.4,
  },
  {
    id: 'rain',
    name: 'Glass Raindrops',
    tagline: 'Soft rainfall against window glass',
    imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #09131d 0%, #132337 50%, #1c324a 100%)',
    overlayOpacity: 0.35,
  },
  {
    id: 'night-city',
    name: 'Night Cityscape',
    tagline: 'Panoramic city lights under starry sky',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=2000&auto=format&fit=crop',
    fallbackGradient: 'linear-gradient(135deg, #0a0a0f 0%, #121324 50%, #1f2038 100%)',
    overlayOpacity: 0.4,
  },
];

export const getAtmosphereById = (id: string): AtmosphereTheme => {
  return ATMOSPHERES.find((item) => item.id === id) || ATMOSPHERES[0];
};
