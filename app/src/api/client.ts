const API_BASE = 'https://noiscut-api-production.up.railway.app/api';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!refreshRes.ok) throw new Error('Refresh failed');
        const data = await refreshRes.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        isRefreshing = false;
        onRefreshed(data.accessToken);
        return apiRequest<T>(method, path, body, isFormData);
      } catch {
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } else {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push(async () => {
          try {
            resolve(await apiRequest<T>(method, path, body, isFormData));
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => apiRequest<T>('PATCH', path, body),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => apiRequest<T>('POST', path, form, true),
  uploadPatch: <T>(path: string, form: FormData) => apiRequest<T>('PATCH', path, form, true),
};
