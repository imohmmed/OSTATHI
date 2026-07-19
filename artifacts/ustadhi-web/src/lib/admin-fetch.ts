const SESSION_KEY = 'admin_session';

export function getAdminSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setAdminSession(id: string): void {
  localStorage.setItem(SESSION_KEY, id);
}
export function clearAdminSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = getAdminSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `Bearer ${session}` } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}
