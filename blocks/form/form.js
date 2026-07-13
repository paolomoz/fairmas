/*
 * form — contact form (NON-SUBMITTING by design).
 *
 * Model (author contract): one row per field — label cell | type cell |
 * required cell (optional 4th cell: placeholder). Supported types: text,
 * email, tel, textarea, checkbox, button, and `select: Option A, Option B`.
 * For checkbox rows the label cell may hold a second paragraph — the rich
 * checkbox sentence (links preserved).
 *
 * CSP rules (strict-dynamic): no <form> element, no action, the send button
 * is type="button", and no inline handlers.
 *
 * Submission (EDS-native, replaces the retired Elementor/AlanCaptcha stack):
 * client-side required-field validation + inline errors, optional Cloudflare
 * Turnstile, and a JSON POST to a configurable endpoint. Config comes from
 * page metadata (authored, no code change):
 *   <meta name="form-endpoint" content="https://…">      (submission URL)
 *   <meta name="turnstile-sitekey" content="0x4AAA…">     (optional captcha)
 * Until an endpoint is configured the form validates but does not send, and
 * shows a clear notice — nothing is transmitted to a placeholder.
 */

const cfg = (name) => document.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';

function setError(field, msg) {
  const ctrl = field.querySelector('input, select, textarea');
  let err = field.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'form-error';
    field.append(err);
  }
  err.textContent = msg || '';
  if (ctrl) {
    ctrl.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg && !ctrl.getAttribute('aria-describedby')) ctrl.setAttribute('aria-describedby', `${ctrl.id}-err`);
    err.id = `${ctrl.id}-err`;
  }
  return !msg;
}

function validate(body) {
  let firstBad = null;
  body.querySelectorAll('.form-field').forEach((field) => {
    const ctrl = field.querySelector('input, select, textarea');
    if (!ctrl) return;
    let msg = '';
    const val = ctrl.type === 'checkbox' ? ctrl.checked : ctrl.value.trim();
    if (ctrl.required && (val === '' || val === false)) msg = 'This field is required.';
    else if (ctrl.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Enter a valid email address.';
    setError(field, msg);
    if (msg && !firstBad) firstBad = ctrl;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

function collect(body) {
  const data = {};
  body.querySelectorAll('input, select, textarea').forEach((ctrl) => {
    if (!ctrl.name) return;
    data[ctrl.name] = ctrl.type === 'checkbox' ? ctrl.checked : ctrl.value;
  });
  return data;
}

function loadTurnstile(body, sitekey) {
  const holder = document.createElement('div');
  holder.className = 'form-turnstile cf-turnstile';
  holder.dataset.sitekey = sitekey;
  const actions = body.querySelector('.form-actions');
  if (actions) actions.before(holder); else body.querySelector('.form-grid').append(holder);
  if (!document.querySelector('script[src*="challenges.cloudflare.com"]')) {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.append(s);
  }
}

function wireSubmit(body) {
  const button = body.querySelector('button.button');
  if (!button) return;
  const endpoint = cfg('form-endpoint');
  const sitekey = cfg('turnstile-sitekey');

  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  body.append(status);

  if (sitekey) loadTurnstile(body, sitekey);

  button.addEventListener('click', async () => {
    status.className = 'form-status';
    status.textContent = '';
    if (!validate(body)) { status.classList.add('form-status-error'); status.textContent = 'Please fix the highlighted fields.'; return; }

    const token = window.turnstile?.getResponse?.();
    if (sitekey && !token) { status.classList.add('form-status-error'); status.textContent = 'Please complete the verification.'; return; }

    if (!endpoint) {
      status.classList.add('form-status-error');
      status.textContent = 'This form is not connected to a submission endpoint yet.';
      return;
    }

    const payload = {
      ...collect(body),
      formName: body.getAttribute('aria-label') || 'Contact form',
      pageUrl: window.location.href,
      ...(token ? { turnstileToken: token } : {}),
    };
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Sending…';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const done = document.createElement('div');
      done.className = 'form-success';
      done.setAttribute('role', 'status');
      done.innerHTML = '<h3>Thank you!</h3><p>Your message has been sent. Our team will be in touch shortly.</p>';
      body.replaceChildren(done);
    } catch (e) {
      button.disabled = false;
      button.textContent = original;
      window.turnstile?.reset?.();
      status.classList.add('form-status-error');
      status.textContent = 'Sorry — something went wrong sending your message. Please try again or email us directly.';
    }
  });
}

const AUTOCOMPLETE = [
  [/e-?mail/i, 'email'],
  [/phone/i, 'tel'],
  [/company|organi[sz]ation/i, 'organization'],
  [/country/i, 'country-name'],
  [/^name$|your name|full name/i, 'name'],
];

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function autocompleteFor(label) {
  const hit = AUTOCOMPLETE.find(([re]) => re.test(label));
  return hit ? hit[1] : null;
}

function buildLabel(id, text, required) {
  const label = document.createElement('label');
  label.className = 'form-field-label';
  label.setAttribute('for', id);
  label.append(text);
  if (required) {
    const req = document.createElement('span');
    req.className = 'form-req';
    req.setAttribute('aria-hidden', 'true');
    req.textContent = ' *';
    label.append(req);
  }
  return label;
}

function buildCheckboxField(field, labelCell, labelText, required, id) {
  field.classList.add('form-field-full');
  const groupLabel = document.createElement('span');
  groupLabel.className = 'form-field-label';
  groupLabel.id = `${id}-label`;
  groupLabel.append(labelText);
  if (required) {
    const req = document.createElement('span');
    req.className = 'form-req';
    req.setAttribute('aria-hidden', 'true');
    req.textContent = ' *';
    groupLabel.append(req);
  }
  const row = document.createElement('span');
  row.className = 'form-checkbox-row';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.name = slug(labelText);
  input.setAttribute('aria-describedby', `${id}-label`);
  if (required) input.required = true;
  const label = document.createElement('label');
  label.setAttribute('for', id);
  // rich checkbox sentence: every node after the first paragraph (links kept)
  const extras = [...labelCell.children].slice(1);
  if (extras.length) extras.forEach((el) => label.append(...el.childNodes));
  else label.append(labelText);
  row.append(input, label);
  field.append(groupLabel, row);
}

export default function decorate(block) {
  const body = document.createElement('div');
  body.className = 'form-body';
  body.id = 'contact-form';
  body.setAttribute('role', 'group');
  body.setAttribute('aria-label', 'Contact form');
  const grid = document.createElement('div');
  grid.className = 'form-grid';
  body.append(grid);

  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    const labelCell = cells[0];
    if (!labelCell) return;
    const labelText = (labelCell.querySelector('p') || labelCell).textContent.trim();
    const typeText = cells[1] ? cells[1].textContent.trim() : 'text';
    // label:value split on first colon (#50) — `select: Option A, Option B`
    const [rawType, typeArgs] = [
      typeText.split(':')[0].trim().toLowerCase(),
      typeText.includes(':') ? typeText.slice(typeText.indexOf(':') + 1).trim() : '',
    ];
    const required = !!cells[2] && /required|yes|true|\*|x/i.test(cells[2].textContent);
    const placeholder = cells[3] ? cells[3].textContent.trim() : '';
    const id = `form-${slug(labelText) || `field-${i}`}`;

    const field = document.createElement('div');
    field.className = 'form-field';

    if (rawType === 'button') {
      field.classList.add('form-field-full', 'form-actions');
      const button = document.createElement('button');
      button.type = 'button'; // non-submitting
      button.className = 'button primary';
      button.append(labelText);
      const arrow = document.createElement('span');
      arrow.className = 'form-button-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      button.append(arrow);
      field.append(button);
    } else if (rawType === 'checkbox') {
      buildCheckboxField(field, labelCell, labelText, required, id);
    } else if (rawType === 'select') {
      field.append(buildLabel(id, labelText, required));
      const select = document.createElement('select');
      select.id = id;
      select.name = slug(labelText);
      if (required) select.required = true;
      const prompt = document.createElement('option');
      prompt.value = '';
      prompt.disabled = true;
      prompt.textContent = 'Please select';
      select.append(prompt);
      typeArgs.split(',').map((o) => o.trim()).filter(Boolean).forEach((opt, oi) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (oi === 0) option.selected = true;
        select.append(option);
      });
      field.append(select);
    } else if (rawType === 'textarea') {
      field.classList.add('form-field-full');
      field.append(buildLabel(id, labelText, required));
      const textarea = document.createElement('textarea');
      textarea.id = id;
      textarea.name = slug(labelText);
      if (required) textarea.required = true;
      if (placeholder) textarea.placeholder = placeholder;
      field.append(textarea);
    } else {
      field.append(buildLabel(id, labelText, required));
      const input = document.createElement('input');
      input.type = ['text', 'email', 'tel'].includes(rawType) ? rawType : 'text';
      input.id = id;
      input.name = slug(labelText);
      if (required) input.required = true;
      if (placeholder) input.placeholder = placeholder;
      const autocomplete = autocompleteFor(labelText);
      if (autocomplete) input.setAttribute('autocomplete', autocomplete);
      field.append(input);
    }

    grid.append(field);
    row.remove();
  });

  block.replaceChildren(body);
  wireSubmit(body);
}
