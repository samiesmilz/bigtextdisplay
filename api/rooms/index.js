import { handleOptions, sendJson } from '../_lib/http.js';
import { createRoom } from '../_lib/rooms.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const room = await createRoom();
  sendJson(res, 201, { id: room.id, remoteUrl: `/remote.html?room=${room.id}` });
}