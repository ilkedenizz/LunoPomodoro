import React, { useState, useEffect } from 'react';
import type { AtmosphereTheme } from '../types';

interface BackgroundViewProps {
  atmosphere: AtmosphereTheme;
}

export const BackgroundView: React.FC<BackgroundViewProps> = ({ atmosphere }) => {
  const [currentBg, setCurrentBg] = useState<AtmosphereTheme>(atmosphere);
  const [prevBg, setPrevBg] = useState<AtmosphereTheme | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  if (atmosphere.id !== currentBg.id) {
    setPrevBg(currentBg);
    setCurrentBg(atmosphere);
    setImgLoaded(false);
    setImgError(false);
  }

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = currentBg.imageUrl;
    img.onload = () => {
      if (isMounted) {
        setImgLoaded(true);
        setImgError(false);
      }
    };
    img.onerror = () => {
      if (isMounted) {
        setImgError(true);
        setImgLoaded(false);
      }
    };
    return () => {
      isMounted = false;
    };
  }, [currentBg.imageUrl]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Previous Background for crossfade */}
      {prevBg && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${prevBg.imageUrl})`,
            background: prevBg.fallbackGradient,
            opacity: 0,
          }}
        />
      )}

      {/* Current Background Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          imgLoaded && !imgError ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${currentBg.imageUrl})` }}
      />

      {/* Fallback Gradient if image fails or loading */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          imgError || !imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: currentBg.fallbackGradient }}
      />

      {/* Atmospheric Soft Vignette Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundColor: `rgba(5, 5, 10, ${currentBg.overlayOpacity})`,
          backgroundImage:
            'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />
    </div>
  );
};
