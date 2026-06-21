const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function isVercelRes(res) {
  return typeof res.status === 'function' && typeof res.json === 'function';
}

export function setCors(res) {
  if (isVercelRes(res)) {
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
    return;
  }
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

export function sendJson(res, status, data) {
  setCors(res);
  if (isVercelRes(res)) {
    res.status(status).json(data);
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(data));
}

export function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  setCors(res);
  if (isVercelRes(res)) {
    res.status(204).end();
  } else {
    res.writeHead(204, CORS_HEADERS);
    res.end();
  }
  return true;
}

export async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}