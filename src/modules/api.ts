const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api';

export async function createRoom(): Promise<{ id: string; remoteUrl: string }> {
  const res = await fetch(`${API}/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function fetchRoom(id: string): Promise<{ state: Record<string, unknown>; updatedAt: number } | null> {
  const res = await fetch(`${API}/rooms/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function pushRoom(id: string, state: Record<string, unknown>): Promise<void> {
  await fetch(`${API}/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}

export async function verifyLicense(key: string): Promise<{ valid: boolean; tier?: string; dev?: boolean }> {
  const res = await fetch(`${API}/license/${encodeURIComponent(key)}`);
  return res.json();
}

export async function activateSubscription(subscriptionId: string, email?: string): Promise<{ license: string }> {
  const res = await fetch(`${API}/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId, email }),
  });
  if (!res.ok) throw new Error('Activation failed');
  return res.json();
}