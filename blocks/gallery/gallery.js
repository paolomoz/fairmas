/*
 * gallery — filterable logo/name gallery (clones the live Essential-Addons
 * Filterable Gallery on /who-we-are/integrations + /who-we-are/customers).
 *
 * Category filter tabs + text search over a responsive grid of mini-cards,
 * each showing the LOGO and the NAME (the live site shows logo only; this
 * adds the name for readability). Fully client-side, accessible.
 *
 * ENCODE (authored rows):
 *   - config row, 1 cell containing "|"  -> category tab order.
 *       tokens split on "|"; FIRST token = the "All" tab label
 *       (e.g. "All Partners | PMS | Accounting / ERP | ...").
 *   - config row, 1 cell without "|"     -> search input placeholder
 *       (e.g. "Search Partner").
 *   - item row, 2-3 cells: [picture]? | Name | Category
 *       an item with no logo renders a brand-mark tile + name.
 * Category order, when no config row, is derived by first appearance.
 */

const slug = (s) => (s || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function decorate(block) {
  const rows = [...block.children];
  let placeholder = '';
  let orderLabels = null; // [allLabel, cat1, cat2, ...]
  const items = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const hasImg = !!row.querySelector('img');
    if (cells.length === 1 && !hasImg) {
      const text = cells[0].textContent.trim();
      if (text.includes('|')) orderLabels = text.split('|').map((t) => t.trim()).filter(Boolean);
      else placeholder = text;
      return;
    }
    // item row, positional: [logo] | Name | Category
    //   3 cells -> logo (may be empty), name, category
    //   2 cells -> name, category (no logo column)
    const pic = row.querySelector('picture, img');
    let name; let category;
    if (cells.length >= 3) {
      name = (cells[1]?.textContent || '').trim();
      category = (cells[2]?.textContent || '').trim();
    } else {
      name = (cells[0]?.textContent || '').trim();
      category = (cells[1]?.textContent || '').trim();
    }
    if (!name && !pic) return;
    items.push({ pic, name, category });
  });

  // category set (first-appearance order) unless an explicit order is authored
  const seen = [];
  items.forEach((it) => {
    if (it.category && !seen.includes(it.category)) seen.push(it.category);
  });
  const allLabel = orderLabels ? orderLabels[0] : 'All';
  const cats = orderLabels ? orderLabels.slice(1) : seen;

  // per-category counts (shown as a badge on each filter)
  const counts = {};
  items.forEach((it) => { const s = slug(it.category); counts[s] = (counts[s] || 0) + 1; });

  block.textContent = '';
  block.setAttribute('role', 'group');
  block.setAttribute('aria-label', 'Filterable gallery');

  // --- controls: filter tabs + search ---
  const controls = document.createElement('div');
  controls.className = 'gallery-controls';

  const filters = document.createElement('div');
  filters.className = 'gallery-filters';
  filters.setAttribute('role', 'toolbar');
  filters.setAttribute('aria-label', 'Filter by category');

  const makeBtn = (label, value, pressed, count) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gallery-filter';
    b.dataset.cat = value;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    const t = document.createElement('span');
    t.className = 'gallery-filter-label';
    t.textContent = label;
    const c = document.createElement('span');
    c.className = 'gallery-filter-count';
    c.textContent = count;
    b.append(t, c);
    return b;
  };
  filters.append(makeBtn(allLabel, '*', true, items.length));
  cats.forEach((c) => filters.append(makeBtn(c, slug(c), false, counts[slug(c)] || 0)));

  const search = document.createElement('div');
  search.className = 'gallery-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'gallery-search-input';
  input.placeholder = placeholder || 'Search';
  input.setAttribute('aria-label', placeholder || 'Search the gallery');
  search.append(input);

  controls.append(search, filters);

  // --- grid ---
  const grid = document.createElement('ul');
  grid.className = 'gallery-grid';

  items.forEach((it) => {
    const li = document.createElement('li');
    li.className = 'gallery-card';
    li.dataset.cat = slug(it.category);
    li.dataset.name = it.name.toLowerCase();

    const tile = document.createElement('div');
    tile.className = 'gallery-card-logo';
    if (it.pic) {
      const p = it.pic.tagName === 'PICTURE' ? it.pic : it.pic.closest('picture') || it.pic;
      tile.append(p);
      const img = tile.querySelector('img');
      if (img && !img.getAttribute('alt')) img.alt = it.name;
      if (img) img.loading = 'lazy';
    } else {
      tile.classList.add('gallery-card-noimg');
      tile.textContent = (it.name || '?').trim().charAt(0).toUpperCase();
      tile.setAttribute('aria-hidden', 'true');
    }

    const label = document.createElement('span');
    label.className = 'gallery-card-name';
    label.textContent = it.name;

    li.append(tile, label);
    grid.append(li);
  });

  // --- status (live region) ---
  const status = document.createElement('p');
  status.className = 'gallery-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const empty = document.createElement('p');
  empty.className = 'gallery-empty';
  empty.hidden = true;
  empty.textContent = 'No matches found.';

  block.append(controls, status, grid, empty);

  // --- behaviour ---
  let activeCat = '*';
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll('.gallery-card').forEach((card) => {
      const okCat = activeCat === '*' || card.dataset.cat === activeCat;
      const okQ = !q || card.dataset.name.includes(q);
      const vis = okCat && okQ;
      card.hidden = !vis;
      if (vis) shown += 1;
    });
    empty.hidden = shown !== 0;
    status.textContent = `${shown} of ${items.length} shown`;
  };

  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery-filter');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    filters.querySelectorAll('.gallery-filter').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    apply();
  });
  input.addEventListener('input', apply);

  apply();
}
