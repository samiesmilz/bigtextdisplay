import { handleOptions, readJsonBody, sendJson } from '../_lib/http.js';
import { createProLicense } from '../_lib/license.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  let data = {};
  try {
    data = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  const { subscriptionId, email } = data;
  if (!subscriptionId) return sendJson(res, 400, { error: 'subscriptionId required' });

  const result = createProLicense({ subscriptionId, email });
  sendJson(res, 200, result);
}