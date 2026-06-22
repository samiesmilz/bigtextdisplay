const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api';

export async function subscribeAndEmail(opts: {
  email: string;
  firstName?: string;
  shareUrl: string;
  reminders?: boolean;
  referredBy?: string;
}): Promise<{ ok: boolean; magicUrl?: string; refCode?: string; emailed?: boolean }> {
  const res = await fetch(`${API}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Subscribe failed');
  }
  return res.json();
}

export async function inviteByEmail(opts: {
  to: string;
  fromName?: string;
  shareUrl: string;
}): Promise<void> {
  const res = await fetch(`${API}/email/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Invite failed');
}

export async function fetchMyDisplays(token: string) {
  const res = await fetch(`${API}/mine/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Not found');
  return res.json() as Promise<{
    firstName: string;
    email: string;
    displays: { url: string; label: string; savedAt: number }[];
    refCode: string;
    shareCount: number;
  }>;
}