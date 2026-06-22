import crypto from 'crypto';
import { getRedis } from './redis.js';

const memSubs = new Map();
const memTokens = new Map();
const MAX_DISPLAYS = 20;

function subKey(email) {
  return `sub:${email.toLowerCase()}`;
}

function tokenKey(token) {
  return `tok:${token}`;
}

function refKey(code) {
  return `ref:${code}`;
}

async function kvGet(key) {
  const redis = getRedis();
  if (redis) return redis.get(key);
  if (key.startsWith('sub:')) return memSubs.get(key.slice(4)) || null;
  if (key.startsWith('tok:')) return memTokens.get(key.slice(4)) || null;
  return null;
}

async function kvSet(key, value, exSec) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, exSec ? { ex: exSec } : undefined);
    return;
  }
  if (key.startsWith('sub:')) memSubs.set(key.slice(4), value);
  else if (key.startsWith('tok:')) memTokens.set(key.slice(4), value);
}

function makeRefCode() {
  return crypto.randomBytes(4).toString('hex');
}

function makeToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export async function upsertSubscriber({ email, firstName = '', shareUrl = '', reminders = false, referredBy = '' }) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Invalid email');
  }

  const existing = (await kvGet(subKey(normalized))) || {
    email: normalized,
    firstName: '',
    displays: [],
    reminders: false,
    refCode: makeRefCode(),
    referredBy: '',
    shareCount: 0,
    createdAt: Date.now(),
  };

  if (firstName) existing.firstName = firstName.trim();
  if (reminders) existing.reminders = true;
  if (referredBy && !existing.referredBy) existing.referredBy = referredBy;

  if (shareUrl) {
    const entry = { url: shareUrl, label: shareLabelFromUrl(shareUrl), savedAt: Date.now() };
    existing.displays = [entry, ...existing.displays.filter((d) => d.url !== shareUrl)].slice(0, MAX_DISPLAYS);
    existing.shareCount = (existing.shareCount || 0) + 1;
    existing.lastShareAt = Date.now();
  }

  await kvSet(subKey(normalized), existing);

  let token = existing.magicToken;
  if (!token) {
    token = makeToken();
    existing.magicToken = token;
    await kvSet(subKey(normalized), existing);
    await kvSet(tokenKey(token), normalized, 365 * 24 * 60 * 60);
  }

  return { subscriber: existing, token };
}

export async function getSubscriberByToken(token) {
  const email = await kvGet(tokenKey(token));
  if (!email) return null;
  return kvGet(subKey(email));
}

export async function incrementRef(refCode) {
  if (!refCode) return;
  const redis = getRedis();
  const key = refKey(refCode);
  if (redis) await redis.incr(key);
}

export async function listReminderSubscribers() {
  const redis = getRedis();
  if (!redis) {
    return [...memSubs.values()].filter((s) => s.reminders);
  }
  const keys = await redis.keys('sub:*');
  const subs = [];
  for (const key of keys.slice(0, 500)) {
    const s = await redis.get(key);
    if (s?.reminders) subs.push(s);
  }
  return subs;
}

function shareLabelFromUrl(url) {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q');
    if (q) return q.slice(0, 48);
    const mode = u.searchParams.get('mode');
    if (mode === 'timer') {
      const t = u.searchParams.get('t');
      return t ? `Timer ${Math.floor(+t / 60)}m` : 'Timer';
    }
  } catch { /* */ }
  return 'My display';
}