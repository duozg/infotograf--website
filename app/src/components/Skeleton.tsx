import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'avatar' | 'image' | 'rect';
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, variant = 'rect', className, style }: SkeletonProps) {
  const variantClass = variant !== 'rect' ? styles[variant] : '';
  return (
    <div
      className={`${styles.skeleton} ${variantClass} ${className || ''}`}
      style={{ width, height, ...style }}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div style={{ background: 'var(--bg-card)', marginBottom: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 10 }}>
        <Skeleton variant="avatar" width={36} height={36} />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      {/* Image */}
      <Skeleton variant="image" />
      {/* Actions */}
      <div style={{ padding: '10px 12px' }}>
        <Skeleton variant="text" width="30%" style={{ marginBottom: 8 }} />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  );
}
