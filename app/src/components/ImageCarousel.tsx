import React, { useState, useRef, useCallback } from 'react';
import styles from './ImageCarousel.module.css';
import { PostImage } from '../models';
import { imageUrl } from '../utils/imageUrl';

interface ImageCarouselProps {
  images: PostImage[];
  filterName?: string;
}

// Map filter names to CSS filter values
function cssFilter(filterName?: string): string {
  if (!filterName) return 'none';
  const filters: Record<string, string> = {
    'Normal': 'none',
    'Clarendon': 'contrast(1.2) saturate(1.35)',
    'Gingham': 'brightness(1.05) hue-rotate(-10deg)',
    'Moon': 'grayscale(1) contrast(1.1) brightness(1.1)',
    'Lark': 'contrast(0.9) brightness(1.1) saturate(1.3)',
    'Reyes': 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)',
    'Juno': 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)',
    'Slumber': 'sepia(0.4) brightness(0.9) saturate(0.85)',
    'Crema': 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)',
    'Ludwig': 'hue-rotate(-10deg) contrast(0.85) saturate(0.9)',
    'Aden': 'sepia(0.2) brightness(1.15) saturate(0.85) hue-rotate(-20deg)',
    'Perpetua': 'contrast(1.1) brightness(1.25) saturate(1.1)',
    'Mayfair': 'contrast(1.1) saturate(1.1)',
    'Rise': 'brightness(1.05) sepia(0.2) contrast(0.9) saturate(0.9)',
    'Hudson': 'brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(-15deg)',
    'Valencia': 'sepia(0.08) contrast(1.08) brightness(1.08) saturate(1.5)',
    'X-Pro II': 'sepia(0.3) saturate(1.3) contrast(1.2)',
    'Sierra': 'sepia(0.25) contrast(1.5) brightness(0.9) hue-rotate(-15deg)',
    'Willow': 'grayscale(0.5) contrast(0.95) brightness(0.9)',
    'Lo-Fi': 'saturate(1.1) contrast(1.5)',
    'Inkwell': 'grayscale(1)',
    'Hefe': 'sepia(0.4) contrast(1.5) brightness(0.9) saturate(1.4)',
    'Nashville': 'sepia(0.4) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(-15deg)',
    'Stinson': 'sepia(0.35) contrast(1.25) brightness(1.1) saturate(0.85)',
    'Vesper': 'sepia(0.35) hue-rotate(-15deg)',
    'Earlybird': 'sepia(0.4) contrast(0.9)',
    'Brannan': 'sepia(0.4) contrast(1.25) brightness(1.1) saturate(0.9) hue-rotate(-2deg)',
    'Sutro': 'sepia(0.4) contrast(1.2) brightness(0.9) saturate(1.4) hue-rotate(-10deg)',
    'Toaster': 'sepia(0.4) contrast(1.5) brightness(0.9)',
    'Walden': 'sepia(0.35) brightness(1.1) saturate(1.6)',
    '1977': 'sepia(0.5) hue-rotate(-30deg) saturate(1.4)',
    'Kelvin': 'sepia(1) brightness(1.15) contrast(0.85)',
    'Maven': 'sepia(0.25) saturate(1.5) hue-rotate(-15deg)',
    'Ginza': 'sepia(0.06) contrast(1.06)',
    'Skyline': 'sepia(0.15) contrast(1.15)',
    'Dogpatch': 'sepia(0.35) saturate(1.1)',
    'Brooklyn': 'sepia(0.25) hue-rotate(-30deg)',
    'Helena': 'sepia(0.5) hue-rotate(-40deg)',
    'Ashby': 'sepia(0.5) hue-rotate(-30deg)',
    'Charmes': 'sepia(0.25) hue-rotate(-20deg)',
  };
  return filters[filterName] || 'none';
}

export function ImageCarousel({ images, filterName }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);

  // Filter out images with invalid URLs (API sends `url`, model has `imageUrl`)
  const validImages = (images || []).filter(img => img.url || img.imageUrl);
  if (validImages.length === 0) return null;

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(validImages.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const threshold = 50;
    if (touchDelta.current < -threshold) next();
    else if (touchDelta.current > threshold) prev();
    touchDelta.current = 0;
  };

  if (validImages.length === 1) {
    const url = imageUrl(validImages[0].url || validImages[0].imageUrl);
    const filter = cssFilter(validImages[0].filterName || filterName);
    return (
      <div className={styles.carousel}>
        <div className={styles.track}>
          <div className={styles.slide}>
            {url && <img src={url} alt="" style={{ filter }} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.carousel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {validImages.map((img, idx) => {
          const url = imageUrl(img.url || img.imageUrl);
          const filter = cssFilter(img.filterName || filterName);
          return (
            <div key={idx} className={styles.slide}>
              {url && <img src={url} alt="" style={{ filter }} />}
            </div>
          );
        })}
      </div>

      {index > 0 && (
        <button className={`${styles.btn} ${styles.btnPrev}`} onClick={prev} aria-label="Previous">
          ‹
        </button>
      )}
      {index < validImages.length - 1 && (
        <button className={`${styles.btn} ${styles.btnNext}`} onClick={next} aria-label="Next">
          ›
        </button>
      )}

      <div className={styles.counter}>{index + 1}/{validImages.length}</div>

      <div className={styles.dots}>
        {validImages.map((_, idx) => (
          <div
            key={idx}
            className={`${styles.dot} ${idx === index ? styles.active : ''}`}
            onClick={() => setIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}
