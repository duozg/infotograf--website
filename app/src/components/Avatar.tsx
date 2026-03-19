import React from 'react';
import styles from './Avatar.module.css';
import { imageUrl } from '../utils/imageUrl';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface AvatarProps {
  src?: string | null;
  username?: string;
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
}

export function Avatar({ src, username, size = 'md', className, onClick }: AvatarProps) {
  const url = imageUrl(src);
  const letter = username ? username[0] : '?';
  const sizeClass = styles[`size-${size}`];

  const style: React.CSSProperties = {};
  if (size === 'sm') style.fontSize = '11px';
  else if (size === 'md') style.fontSize = '14px';
  else if (size === 'lg') style.fontSize = '17px';
  else if (size === 'xl') style.fontSize = '24px';
  else style.fontSize = '32px';

  return (
    <div
      className={`${styles.avatar} ${sizeClass} ${className || ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {url ? (
        <img src={url} alt={username || 'avatar'} />
      ) : (
        <span className={styles.placeholder} style={style}>{letter}</span>
      )}
    </div>
  );
}
