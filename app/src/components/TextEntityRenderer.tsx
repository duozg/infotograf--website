import React from 'react';
import { useNavigate } from 'react-router-dom';
import { parseText } from '../utils/textParser';

interface TextEntityRendererProps {
  text: string;
  className?: string;
}

export function TextEntityRenderer({ text, className }: TextEntityRendererProps) {
  const navigate = useNavigate();
  const segments = parseText(text);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'mention') {
          const username = seg.value.slice(1);
          return (
            <span
              key={i}
              style={{ color: 'var(--text-link)', cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation();
                navigate(`/profile/${username}`);
              }}
            >
              {seg.value}
            </span>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <span
              key={i}
              style={{ color: 'var(--text-link)', cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation();
                navigate(`/explore?q=${encodeURIComponent(seg.value.slice(1))}`);
              }}
            >
              {seg.value}
            </span>
          );
        }
        return <React.Fragment key={i}>{seg.value}</React.Fragment>;
      })}
    </span>
  );
}
