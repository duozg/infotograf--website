import React from 'react';

/**
 * Official fediverse pentagon logo — 5 colored nodes connected by lines.
 * Always rendered in full color (never monochrome/templated).
 * Use the `size` prop to control dimensions.
 */
interface FediverseIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FediverseIcon({ size = 16, className, style }: FediverseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Fediverse"
    >
      {/* Pentagon connecting lines */}
      <line x1="50" y1="10" x2="90" y2="40" stroke="#F39C12" strokeWidth="4" />
      <line x1="90" y1="40" x2="75" y2="85" stroke="#E74C3C" strokeWidth="4" />
      <line x1="75" y1="85" x2="25" y2="85" stroke="#9B59B6" strokeWidth="4" />
      <line x1="25" y1="85" x2="10" y2="40" stroke="#3498DB" strokeWidth="4" />
      <line x1="10" y1="40" x2="50" y2="10" stroke="#2ECC71" strokeWidth="4" />
      {/* Pentagon nodes */}
      <circle cx="50" cy="10" r="8" fill="#2ECC71" />
      <circle cx="90" cy="40" r="8" fill="#F39C12" />
      <circle cx="75" cy="85" r="8" fill="#E74C3C" />
      <circle cx="25" cy="85" r="8" fill="#9B59B6" />
      <circle cx="10" cy="40" r="8" fill="#3498DB" />
    </svg>
  );
}
