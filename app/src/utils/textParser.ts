export interface TextSegment {
  type: 'text' | 'mention' | 'hashtag';
  value: string;
}

export function parseText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match @mentions and #hashtags
  const regex = /(@\w+|#\w+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const val = match[1];
    if (val.startsWith('@')) {
      segments.push({ type: 'mention', value: val });
    } else {
      segments.push({ type: 'hashtag', value: val });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function toCount(val: number | string): number {
  if (typeof val === 'string') return parseInt(val, 10) || 0;
  return val;
}
