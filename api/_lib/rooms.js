import { Redis } from '@upstash/redis';

const ROOM_TTL_SEC = 24 * 60 * 60;
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const mem = new Map();

function redisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisClient();

async function roomExists(id) {
  if (redis) return Boolean(await redis.exists(`room:${id}`));
  return mem.has(id);
}

export async function makeRoomId() {
  let id = '';
  for (let i = 0; i < 6; i++) id += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  if (await roomExists(id)) return makeRoomId();
  return id;
}

export async function createRoom() {
  const id = await makeRoomId();
  const room = { id, state: {}, updatedAt: Date.now() };
  await saveRoom(room);
  return room;
}

export async function getRoom(id) {
  if (redis) {
    const room = await redis.get(`room:${id}`);
    return room || null;
  }
  return mem.get(id) || null;
}

export async function saveRoom(room) {
  if (redis) {
    await redis.set(`room:${room.id}`, room, { ex: ROOM_TTL_SEC });
    return;
  }
  mem.set(room.id, room);
}

export function hasPersistentStore() {
  return Boolean(redis);
}