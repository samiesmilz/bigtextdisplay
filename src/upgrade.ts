import { activateSubscription } from './modules/api';
import { storeLicense } from './modules/pro';

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const planId = import.meta.env.VITE_PAYPAL_PLAN_ID || '';
const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
const isDev = import.meta.env.DEV;

if (isDev) {
  const devEl = document.getElementById('upgrade-dev');
  if (devEl) devEl.hidden = false;
}

async function loadPayPal(): Promise<void> {
  if (!clientId || !planId) {
    const el = document.getElementById('paypal-button-container');
    if (el) {
      el.innerHTML = `<p style="color:var(--m-muted);font-size:13px;line-height:1.65">
        PayPal not configured yet. Add credentials to <code style="font-family:var(--m-mono);font-size:11px;background:rgba(255,255,255,0.06);padding:2px 5px;border-radius:3px">.env</code>
        (see checklist below) then rebuild.
      </p>`;
      const checkout = el.closest('.upgrade-checkout');
      if (checkout) {
        const setup = document.createElement('div');
        setup.className = 'upgrade-setup';
        setup.style.margin = '20px 0 0';
        setup.innerHTML = `
          <h3>PayPal setup checklist</h3>
          <ol>
            <li>Create app at <a href="https://developer.paypal.com/dashboard/applications" target="_blank" style="color:var(--m-muted)">developer.paypal.com</a></li>
            <li>Create a <strong>subscription plan</strong> ($6/mo) in PayPal Dashboard</li>
            <li>Copy <code>.env.example</code> → <code>.env</code> and fill in the values below</li>
            <li>Add env vars in Vercel → Settings → Environment Variables</li>
            <li>Set PayPal webhook to <code>https://your-domain.vercel.app/api/paypal/webhook</code></li>
            <li>Connect Upstash Redis in Vercel → Storage (required for phone remote)</li>
          </ol>`;
        checkout.appendChild(setup);
      }
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const paypal = (window as unknown as { paypal: { Buttons: (cfg: object) => { render: (el: string) => void } } }).paypal;

  paypal.Buttons({
    style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
    createSubscription: (_data: unknown, actions: { subscription: { create: (cfg: object) => Promise<string> } }) => {
      return actions.subscription.create({ plan_id: planId });
    },
    onApprove: async (data: { subscriptionID?: string }) => {
      try {
        const { license } = await activateSubscription(data.subscriptionID || '');
        storeLicense(license);
        window.location.href = `${siteUrl}/?license=${encodeURIComponent(license)}`;
      } catch {
        alert('Payment received — enter your license key from email or contact support.');
        window.location.href = siteUrl;
      }
    },
  }).render('#paypal-button-container');
}

loadPayPal().catch(console.error);