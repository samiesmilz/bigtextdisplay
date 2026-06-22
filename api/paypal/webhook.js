import { handleOptions, readJsonBody, sendJson } from '../_lib/http.js';
import { createProLicense } from '../_lib/license.js';
import { upsertSubscriber } from '../_lib/subscribers.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const event = await readJsonBody(req);
    if (
      event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
      event.event_type === 'PAYMENT.SALE.COMPLETED'
    ) {
      const subId = event.resource?.id || event.resource?.billing_agreement_id || 'unknown';
        const email = event.resource?.subscriber?.email_address || '';
        createProLicense({ subscriptionId: subId, email });
        if (email) {
          await upsertSubscriber({ email, firstName: '', shareUrl: '' });
        }
    }
  } catch { /* ignore malformed payloads */ }

  sendJson(res, 200, { received: true });
}