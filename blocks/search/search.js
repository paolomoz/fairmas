/*
 * search — client-side site search over /search-index.json (built by
 * helix-query.yaml). Reads the ?q= param, ranks results by field weight
 * (title > headings > description > path), and renders a results list.
 * Authored as an empty block: <div class="search"></div>.
 */
const TEMPLATE_LABEL = {
  article: 'Article',
  event: 'Event',
  product: 'Product',
  company: 'Company',
  legal: 'Legal',
  glossary: 'Glossary',
  listing: 'News',
};

function labelFor(item) {
  if (item.template && TEMPLATE_LABEL[item.template]) return TEMPLATE_LABEL[item.template];
  const seg = (item.path || '').split('/').filter(Boolean)[0] || '';
  return seg ? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Page';
}

function score(item, terms) {
  const title = (item.title || '').toLowerCase();
  const kw = (Array.isArray(item.keywords) ? item.keywords.join(' ') : (item.keywords || '')).toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  let s = 0;
  terms.forEach((t) => {
    if (!t) return;
    if (title.includes(t)) s += title.startsWith(t) ? 6 : 4;
    if (kw.includes(t)) s += 2;
    if (desc.includes(t)) s += 1;
    if (path.includes(t)) s += 1;
  });
  // require every term to hit somewhere
  const hay = `${title} ${kw} ${desc} ${path}`;
  if (!terms.every((t) => !t || hay.includes(t))) return 0;
  return s;
}

export default async function decorate(block) {
  block.textContent = '';

  const form = document.createElement('div');
  form.className = 'search-box';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = 'Search fairmas.com…';
  input.setAttribute('aria-label', 'Search the site');
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'button search-submit';
  submit.textContent = 'Search';
  form.append(input, submit);

  const status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const list = document.createElement('ul');
  list.className = 'search-results';

  block.append(form, status, list);

  let data = null;
  const load = async () => {
    if (data) return data;
    try {
      const resp = await fetch('/search-index.json');
      const json = await resp.json();
      data = json.data || [];
    } catch (e) { data = []; }
    return data;
  };

  const run = async (q) => {
    const query = (q || '').trim();
    input.value = query;
    list.textContent = '';
    if (!query) { status.textContent = 'Type a term and press Search.'; return; }
    const rows = await load();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = rows
      .map((item) => ({ item, s: score(item, terms) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 60);
    status.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'} for “${query}”`;
    hits.forEach(({ item }) => {
      const li = document.createElement('li');
      li.className = 'search-result';
      const badge = document.createElement('span');
      badge.className = 'search-badge';
      badge.textContent = labelFor(item);
      const h3 = document.createElement('h3');
      const a = document.createElement('a');
      a.href = item.path;
      a.textContent = item.title || item.path;
      h3.append(a);
      li.append(badge, h3);
      if (item.description) {
        const d = document.createElement('p');
        d.className = 'search-desc';
        d.textContent = item.description;
        li.append(d);
      }
      const u = document.createElement('span');
      u.className = 'search-url';
      u.textContent = item.path;
      li.append(u);
      list.append(li);
    });
    if (!hits.length) status.textContent = `No results for “${query}”. Try a different term.`;
  };

  const submitQuery = () => {
    const q = input.value.trim();
    const url = new URL(window.location);
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
    run(q);
  };
  submit.addEventListener('click', submitQuery);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitQuery(); });

  // deep-link: run the ?q= param on load
  const initial = new URLSearchParams(window.location.search).get('q');
  run(initial);
  if (!initial) input.focus();
}
