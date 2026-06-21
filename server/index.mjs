import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendJson, handleOptions, readJsonBody } from '../api/_lib/http.js';
import { createProLicense, verifyLicense } from '../api/_lib/license.js';
import { createRoom, getRoom, saveRoom } from '../api/_lib/rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

function json(res, status, data) {
  sendJson(res, status, data);
}

function readBody(req) {
  return readJsonBody(req);
}

function serveStatic(req, res) {
  const dist = path.join(__dirname, '..', 'dist');
  let urlPath = req.url?.split('?')[0] || '/';
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(dist, urlPath);
  if (!filePath.startsWith(dist) || !fs.existsSync(filePath)) {
    const fallback = path.join(dist, 'index.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(fallback));
      return true;
    }
    return false;
  }
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
  return true;
}

const server = http.createServer(async (req, res) => {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const { pathname } = url;

  if (pathname === '/api/health') {
    json(res, 200, { ok: true, platform: 'local' });
    return;
  }

  if (pathname === '/api/rooms' && req.method === 'POST') {
    const room = await createRoom();
    json(res, 201, { id: room.id, remoteUrl: `/remote.html?room=${room.id}` });
    return;
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
  if (roomMatch) {
    const id = roomMatch[1];
    if (req.method === 'GET') {
      const room = await getRoom(id);
      if (!room) return json(res, 404, { error: 'Room not found' });
      json(res, 200, { id, state: room.state, updatedAt: room.updatedAt });
      return;
    }
    if (req.method === 'PUT') {
      let state = {};
      try { state = await readBody(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      const room = (await getRoom(id)) || { id, state: {}, updatedAt: Date.now() };
      room.state = state;
      room.updatedAt = Date.now();
      await saveRoom(room);
      json(res, 200, { ok: true });
      return;
    }
  }

  if (pathname.startsWith('/api/license/') && req.method === 'GET' && pathname !== '/api/license/activate') {
    const key = decodeURIComponent(pathname.slice('/api/license/'.length));
    if (key === 'BTD-DEV-PRO' && process.env.NODE_ENV !== 'production') {
      return json(res, 200, { valid: true, tier: 'pro', dev: true });
    }
    const payload = verifyLicense(key);
    if (payload) return json(res, 200, { valid: true, tier: payload.tier || 'pro', exp: payload.exp });
    return json(res, 200, { valid: false });
  }

  if (pathname === '/api/license/activate' && req.method === 'POST') {
    let data = {};
    try { data = await readBody(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    const { subscriptionId, email } = data;
    if (!subscriptionId) return json(res, 400, { error: 'subscriptionId required' });
    json(res, 200, createProLicense({ subscriptionId, email }));
    return;
  }

  if (pathname === '/api/paypal/webhook' && req.method === 'POST') {
    try {
      const event = await readBody(req);
      if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || event.event_type === 'PAYMENT.SALE.COMPLETED') {
        const subId = event.resource?.id || event.resource?.billing_agreement_id || 'unknown';
        const email = event.resource?.subscriber?.email_address || '';
        createProLicense({ subscriptionId: subId, email });
      }
    } catch { /* ignore */ }
    json(res, 200, { received: true });
    return;
  }

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distPath) && !pathname.startsWith('/api')) {
    if (serveStatic(req, res)) return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`BigTextDisplay API on http://localhost:${PORT}`);
});