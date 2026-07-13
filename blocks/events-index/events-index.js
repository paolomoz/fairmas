/*
 * events-index — query-index-driven events listing. Fetches /query-index.json,
 * keeps template=event rows, splits upcoming vs past (by end/start date, falling
 * back to the captured eventstatus), sorts, and renders cards with a toggle.
 * Authored as an empty block: <div class="events-index"></div>.
 */
function card(e) {
  const li = document.createElement('li');
  li.className = 'events-index-card';
  const a = document.createElement('a');
  a.className = 'events-index-link';
  a.href = e.path;
  const fig = document.createElement('div');
  fig.className = 'events-index-media';
  if (e.image) {
    const img = document.createElement('img');
    img.src = e.image;
    img.alt = '';
    img.loading = 'lazy';
    fig.append(img);
  } else {
    fig.classList.add('events-index-media-empty');
  }
  const body = document.createElement('div');
  body.className = 'events-index-body';
  const date = document.createElement('p');
  date.className = 'events-index-date';
  date.textContent = e.daterange || e.startdate || '';
  const h3 = document.createElement('h3');
  h3.className = 'events-index-title';
  h3.textContent = e.title;
  body.append(date, h3);
  if (e.location) {
    const loc = document.createElement('p');
    loc.className = 'events-index-loc';
    loc.textContent = e.location;
    body.append(loc);
  }
  a.append(fig, body);
  li.append(a);
  return li;
}

export default async function decorate(block) {
  block.textContent = '';
  let data = [];
  try {
    const resp = await fetch('/query-index.json');
    const json = await resp.json();
    data = (json.data || []).filter((e) => e.template === 'event');
  } catch (e) {
    block.innerHTML = '<p>Events are temporarily unavailable.</p>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const asDate = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : null);
  const isPast = (e) => {
    const end = asDate(e.enddate) || asDate(e.startdate);
    if (end) return end < today;
    return e.eventstatus === 'past';
  };
  const upcoming = data.filter((e) => !isPast(e)).sort((a, b) => (a.startdate || '').localeCompare(b.startdate || ''));
  const past = data.filter(isPast).sort((a, b) => (b.startdate || '').localeCompare(a.startdate || ''));

  const controls = document.createElement('div');
  controls.className = 'events-index-controls';
  const mkTab = (label, key, on) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'events-index-tab';
    b.dataset.view = key;
    b.textContent = `${label} (${key === 'upcoming' ? upcoming.length : past.length})`;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    return b;
  };
  const hasUpcoming = upcoming.length > 0;
  controls.append(mkTab('Upcoming', 'upcoming', hasUpcoming), mkTab('Past', 'past', !hasUpcoming));

  const grid = document.createElement('ul');
  grid.className = 'events-index-grid';
  const empty = document.createElement('p');
  empty.className = 'events-index-empty';

  const render = (view) => {
    const rows = view === 'upcoming' ? upcoming : past;
    grid.textContent = '';
    rows.forEach((e) => grid.append(card(e)));
    empty.textContent = rows.length ? '' : `No ${view} events.`;
    empty.hidden = !!rows.length;
  };

  controls.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.events-index-tab');
    if (!btn) return;
    controls.querySelectorAll('.events-index-tab').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    render(btn.dataset.view);
  });

  block.append(controls, grid, empty);
  render(hasUpcoming ? 'upcoming' : 'past');
}
