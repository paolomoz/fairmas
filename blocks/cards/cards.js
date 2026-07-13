/*
 * cards — generic card grid. One row per card; cells classified by content
 * (picture / title-h3 / meta / excerpt / link), flatten-first collector for
 * the DA-flattened shape (#62). Variants style the same decoded structure:
 *   brands     — white logo chips (picture-only cards)
 *   news       — listing/article news cards (chips + title + date·read-time
 *                meta + excerpt + Read more affordance; whole-card link;
 *                rhythm inferred by index — see NEWS section below)
 *   routing / crosslinks — sibling-agent CSS in cards.css
 *
 * Decoded shape per card:
 *   li.cards-card > div.cards-card-image? + div.cards-card-body?
 *   body children keep source order and gain classes:
 *   cards-card-title (heading), cards-card-meta (p before the title),
 *   cards-card-link (link-only p), everything else = excerpt.
 *
 * NEWS variant additions (owned by the listing/article templates agent):
 *   ENCODE — one ROW per card, cells flat: [picture]? · chips text
 *   ("All News, Blogs") · h3>a (title, full post URL) · meta
 *   ("July 2, 2026 · 5 min read") · excerpt p? · [authored "Read more" a]?
 *   An optional LEADING row holding only an h2 is the grid's accessible
 *   heading (visually hidden — bridges h1 → card h3s on the listing).
 *   DECODE — chips = short text BEFORE the h3 (#48/#76 buffer); meta = the
 *   date-pattern line after it (#79 textContent); media 'picture, img' (#72).
 *   Cards with no image get the brand-mark tile with category watermark.
 *   Whole-card link = single tab stop ("Read more" stays visual-only).
 *   RHYTHM (R1, inferred by index, grids > 6 cards): card 1 = split feature,
 *   every 7th thereafter = full-width wide, alternating navy/tint grounds.
 */

/** flatten a row into cells, recovering bare text as <p> (#62) */
function cellsOf(row) {
  const cells = [...row.children].filter((el) => el.tagName === 'DIV');
  const list = cells.length ? cells : [row];
  list.forEach((cell) => {
    [...cell.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const p = document.createElement('p');
        node.replaceWith(p);
        p.append(node);
      }
    });
  });
  return list;
}

const isMedia = (el) => el.matches('picture, img') || !!el.querySelector('picture, img');
const isHeading = (el) => el.matches('h1, h2, h3, h4, h5, h6');

function isLinkOnly(el) {
  const a = el.querySelector('a');
  return !!a && el.textContent.trim() === a.textContent.trim();
}

/* ============================================================
   NEWS variant helpers (listing/article templates agent)
   ============================================================ */

const DATE_RE = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/;
const AFFORDANCE_RE = /^(read more|continue reading|learn more)$/i;
const NOIMG_LOGO = '/img/fairmas/logo.png'; /* fixed brand asset (#9b/#67) */

/** rebuild a news meta line as <time> + separator + read-time */
function buildNewsMeta(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  const p = document.createElement('p');
  p.className = 'cards-card-meta';
  const match = text.match(DATE_RE);
  if (!match) {
    p.textContent = text;
    return p;
  }
  const time = document.createElement('time');
  const [dateText] = match;
  time.textContent = dateText;
  const d = new Date(dateText);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    time.dateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  p.append(time);
  const rest = text.replace(dateText, '').replace(/^\s*[·|–-]\s*/, '').trim();
  if (rest) {
    const sep = document.createElement('span');
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = '·';
    p.append(' ', sep, ` ${rest}`);
  }
  return p;
}

/** chip pills from the short text authored before the title */
function buildNewsChips(texts) {
  const chips = document.createElement('div');
  chips.className = 'cards-card-chips';
  texts.forEach((t) => {
    const chip = document.createElement('span');
    chip.textContent = t;
    chips.append(chip);
  });
  return chips;
}

/** brand-mark tile with category watermark for image-less news cards */
function buildNoImageTile(category) {
  const tile = document.createElement('div');
  tile.className = 'cards-card-noimg';
  tile.setAttribute('aria-hidden', 'true');
  const mark = document.createElement('span');
  mark.className = 'cards-noimg-mark';
  mark.textContent = category || 'News';
  const logo = document.createElement('img');
  logo.src = NOIMG_LOGO;
  logo.alt = '';
  logo.width = 774;
  logo.height = 351;
  logo.loading = 'lazy';
  tile.append(mark, logo);
  return tile;
}

/** decode one news card row into li.cards-card */
function buildNewsCard(row, index) {
  const li = document.createElement('li');
  li.className = 'cards-card';
  const image = document.createElement('div');
  image.className = 'cards-card-image';
  const body = document.createElement('div');
  body.className = 'cards-card-body';

  let title = null;
  let meta = null;
  let more = null;
  const chipTexts = [];
  const excerpts = [];
  cellsOf(row).forEach((cell) => {
    [...cell.children].forEach((el) => {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (isMedia(el)) {
        image.append(el.matches('picture, img') ? el : el.querySelector('picture, img'));
      } else if (!title && isHeading(el)) {
        el.classList.add('cards-card-title');
        title = el;
      } else if (!title) {
        /* pre-title text = category chips (#76 pre-heading buffer) */
        if (text) chipTexts.push(...text.split(/[,·]/).map((t) => t.trim()).filter(Boolean));
      } else if (!meta && DATE_RE.test(text) && !(isLinkOnly(el) && AFFORDANCE_RE.test(text))) {
        meta = el;
      } else if (isLinkOnly(el) && AFFORDANCE_RE.test(text)) {
        more = el.querySelector('a');
      } else if (text) {
        el.classList.add('cards-card-excerpt');
        excerpts.push(el);
      }
    });
  });

  if (chipTexts.length) body.append(buildNewsChips(chipTexts));
  if (title) body.append(title);
  if (meta) body.append(buildNewsMeta(meta));
  excerpts.forEach((el) => body.append(el));

  /* whole-card link = single tab stop; "Read more" is a visual affordance
     only (aria-hidden, out of the tab order) so N identical link names never
     reach AT. An authored affordance link is kept; otherwise inject the span. */
  const titleLink = title && title.querySelector('a');
  if (more) {
    more.className = 'cards-card-more';
    more.setAttribute('aria-hidden', 'true');
    more.setAttribute('tabindex', '-1');
    body.append(more);
  } else if (titleLink) {
    const span = document.createElement('span');
    span.className = 'cards-card-more';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = 'Read more';
    body.append(span);
  }

  const primaryCat = chipTexts.find((c) => c && c.toLowerCase() !== 'all news') || chipTexts[0] || '';
  if (primaryCat) li.dataset.cat = primaryCat;

  const img = image.querySelector('img');
  if (img && index > 0 && !img.getAttribute('loading')) img.loading = 'lazy';
  if (image.children.length) li.prepend(image);
  else li.prepend(buildNoImageTile(chipTexts[0]));
  if (body.children.length) li.append(body);
  return li;
}

const catSlug = (s) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** category filter bar for a news grid spanning >1 category (e.g. all-news) */
function buildNewsFilter(lis, ul) {
  const cats = [];
  lis.forEach((li) => { const c = li.dataset.cat; if (c && !cats.includes(c)) cats.push(c); });
  if (cats.length < 2) return null;

  const bar = document.createElement('div');
  bar.className = 'cards-filter';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filter by category');
  const mk = (label, val, on) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cards-filter-btn';
    b.textContent = label;
    b.dataset.cat = val;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    return b;
  };
  bar.append(mk('All', '*', true));
  cats.forEach((c) => bar.append(mk(c, catSlug(c), false)));

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.cards-filter-btn');
    if (!btn) return;
    const val = btn.dataset.cat;
    bar.querySelectorAll('.cards-filter-btn').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    ul.querySelectorAll('.cards-card').forEach((li) => {
      li.hidden = !(val === '*' || catSlug(li.dataset.cat) === val);
    });
  });
  return bar;
}

/** news grid decode: optional heading row, one card per row, rhythm by index */
function decorateNews(block) {
  const rows = [...block.children];

  /* optional leading h2-only row = the grid's accessible heading */
  let heading = null;
  if (rows.length > 1) {
    const first = cellsOf(rows[0]).flatMap((cell) => [...cell.children]);
    if (first.length === 1 && first[0].tagName === 'H2' && !first[0].querySelector('a')) {
      [heading] = first;
      rows.shift();
    }
  }

  const ul = document.createElement('ul');
  const lis = rows
    .map((row, i) => buildNewsCard(row, i))
    .filter((li) => li.querySelector('.cards-card-title, .cards-card-excerpt'));

  /* rhythm inferred by index (R1) — large grids only; small related rows stay uniform */
  if (lis.length > 6) {
    lis.forEach((li, i) => {
      if (i === 0) li.classList.add('cards-card-feature');
      else if (i % 7 === 0) {
        li.classList.add('cards-card-wide', (i / 7) % 2 ? 'cards-card-navy' : 'cards-card-tint');
      }
    });
  }

  ul.append(...lis);
  block.replaceChildren(ul);
  const filter = buildNewsFilter(lis, ul);
  if (filter) ul.before(filter);
  if (heading) {
    heading.classList.add('cards-heading');
    block.prepend(heading);
  }
}

/* ============================================================
   generic decode (base + brands/routing/crosslinks variants)
   ============================================================ */

/* ============================================================
   directory variant — office cards as a typographic ledger (A),
   person cards as elevated cards with button actions (B). Used on
   the contact pages (distinct from the navy-band `contacts` variant
   on the about page). Discriminator: a card with an <img> is a
   person; without = office.
   ============================================================ */
function buildOfficeCard(row) {
  const li = document.createElement('li');
  li.className = 'cards-card contact-office';
  const h3 = row.querySelector('h3');
  if (h3) { h3.className = 'contact-office-name'; li.append(h3); }
  [...row.querySelectorAll('p')].forEach((p) => {
    const a = p.querySelector('a');
    if (a && a.getAttribute('href')?.startsWith('mailto:')) p.className = 'contact-line contact-email';
    else if (a && a.getAttribute('href')?.startsWith('tel:')) p.className = 'contact-line contact-phone';
    else p.className = 'contact-addr';
    li.append(p);
  });
  return li;
}

function buildPersonCard(row) {
  const li = document.createElement('li');
  li.className = 'cards-card contact-person';
  const img = row.querySelector('img');
  const h3 = row.querySelector('h3');
  const ps = [...row.querySelectorAll('p')];

  const avatar = document.createElement('div');
  avatar.className = 'contact-avatar';
  if (img) { img.loading = 'lazy'; avatar.append(img); }

  let email = null; let linkedin = null; let booking = null;
  const plain = [];
  ps.forEach((p) => {
    const a = p.querySelector('a');
    const href = a?.getAttribute('href') || '';
    if (a && href.startsWith('mailto:')) email = a;
    else if (a && /linkedin\./i.test(href)) linkedin = a;
    else if (a) booking = a;
    else if (p.textContent.trim()) plain.push(p);
  });

  li.append(avatar);
  if (plain[0]) { plain[0].className = 'contact-kicker'; li.append(plain[0]); }
  if (h3) { h3.className = 'contact-person-name'; li.append(h3); }
  if (plain[1]) { plain[1].className = 'contact-role'; li.append(plain[1]); }
  if (email) {
    const line = document.createElement('p');
    line.className = 'contact-person-email';
    line.append(email);
    li.append(line);
  }
  if (booking || linkedin) {
    const acts = document.createElement('div');
    acts.className = 'contact-actions';
    if (booking) { booking.className = 'button'; acts.append(booking); }
    if (linkedin) { linkedin.className = 'button secondary'; acts.append(linkedin); }
    li.append(acts);
  }
  return li;
}

function decorateDirectory(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = row.querySelector('img') ? buildPersonCard(row) : buildOfficeCard(row);
    ul.append(li);
  });
  block.replaceChildren(ul);
}

export default function decorate(block) {
  if (block.classList.contains('news')) {
    decorateNews(block);
    return;
  }
  if (block.classList.contains('directory')) {
    decorateDirectory(block);
    return;
  }

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-card';

    const image = document.createElement('div');
    image.className = 'cards-card-image';
    const body = document.createElement('div');
    body.className = 'cards-card-body';

    let titleSeen = false;
    cellsOf(row).forEach((cell) => {
      [...cell.children].forEach((el) => {
        if (isMedia(el)) {
          image.append(el.matches('picture, img') ? el : el.querySelector('picture, img'));
          return;
        }
        if (isHeading(el)) {
          el.classList.add('cards-card-title');
          titleSeen = true;
        } else if (el.matches('p') && isLinkOnly(el)) {
          el.classList.add('cards-card-link');
        } else if (el.matches('p') && !titleSeen) {
          el.classList.add('cards-card-meta');
        }
        body.append(el);
      });
    });

    if (image.children.length) li.append(image);
    if (body.children.length) li.append(body);
    if (li.children.length) ul.append(li);
  });
  block.replaceChildren(ul);
}
