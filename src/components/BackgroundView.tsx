import React, { useState, useEffect } from 'react';
import type { AtmosphereTheme } from '../types';

interface BackgroundViewProps {
  atmosphere: AtmosphereTheme;
}

export const BackgroundView: React.FC<BackgroundViewProps> = ({ atmosphere }) => {
  const [currentBg, setCurrentBg] = useState<AtmosphereTheme>(atmosphere);
  const [prevBg, setPrevBg] = useState<AtmosphereTheme | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);

  if (atmosphere.id !== currentBg.id) {
    setPrevBg(currentBg);
    setCurrentBg(atmosphere);
    setIsCrossfading(true);
  }

  useEffect(() => {
    if (isCrossfading) {
      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPrevBg(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isCrossfading]);

  const renderBackgroundLayer = (theme: AtmosphereTheme) => {
    const bgStyle = theme.cssBackground || theme.fallbackGradient;
    return (
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-[1.02]"
        style={{
          background: bgStyle,
          backgroundImage: theme.imageUrl ? `url(${theme.imageUrl}), ${bgStyle}` : bgStyle,
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
      {/* Previous Background layer for crossfade */}
      {prevBg && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            isCrossfading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {renderBackgroundLayer(prevBg)}
        </div>
      )}

      {/* Current Background layer */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isCrossfading ? 'opacity-100 animate-fadeIn' : 'opacity-100'
        }`}
      >
        {renderBackgroundLayer(currentBg)}
      </div>

      {/* Cinematic Vignette Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundColor: `rgba(5, 5, 10, ${currentBg.overlayOpacity ?? 0.35})`,
          backgroundImage:
            'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.75) 100%)',
        }}
      />

      {/* Subtle Noise / Film Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
