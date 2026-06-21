import { handleOptions, readJsonBody, sendJson } from '../_lib/http.js';
import { getRoom, saveRoom } from '../_lib/rooms.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const id = String(req.query.id || '').toUpperCase();
  if (!id) return sendJson(res, 400, { error: 'Room id required' });

  if (req.method === 'GET') {
    const room = await getRoom(id);
    if (!room) return sendJson(res, 404, { error: 'Room not found' });
    return sendJson(res, 200, { id, state: room.state, updatedAt: room.updatedAt });
  }

  if (req.method === 'PUT') {
    let state = {};
    try {
      state = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
    const room = (await getRoom(id)) || { id, state: {}, updatedAt: Date.now() };
    room.state = state;
    room.updatedAt = Date.now();
    await saveRoom(room);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
}