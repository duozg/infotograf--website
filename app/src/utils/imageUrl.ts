const API_BASE = 'https://noiscut-api-production.up.railway.app';

export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
