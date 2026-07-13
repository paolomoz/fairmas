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
 * is type="button", and no inline handlers. Submit + captcha provider are
 * wired at migrate time, not here.
 */

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
}
