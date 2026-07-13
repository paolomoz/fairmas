/*
 * consent — lightweight opt-in cookie consent replacing Complianz. Loads the
 * existing GTM container (which carries GA4) only after the visitor accepts;
 * the choice persists in localStorage. EU opt-in model (Fairmas is Berlin-based).
 */
const KEY = 'fairmas-consent';
const GTM_ID = 'GTM-TR4HGCPK';
let gtmLoaded = false;

function loadGTM() {
  if (gtmLoaded) return;
  gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.append(s);
}

function renderBanner() {
  const bar = document.createElement('div');
  bar.className = 'consent-bar';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie consent');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = `
    <p class="consent-copy">We use cookies to analyse traffic and improve your experience. You can accept analytics cookies or continue with essential cookies only. See our <a href="/privacy-policy">privacy policy</a>.</p>
    <div class="consent-actions">
      <button type="button" class="button secondary" data-consent="denied">Essential only</button>
      <button type="button" class="button" data-consent="granted">Accept analytics</button>
    </div>`;

  const finish = (choice) => {
    try { localStorage.setItem(KEY, choice); } catch (e) { /* private mode */ }
    if (choice === 'granted') loadGTM();
    bar.remove();
  };
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-consent]');
    if (btn) finish(btn.dataset.consent);
  });
  document.body.append(bar);
  bar.querySelector('[data-consent="granted"]').focus();
}

export default function initConsent() {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (stored === 'granted') { loadGTM(); return; }
  if (stored === 'denied') return;
  renderBanner();
}
