/*
 * post-nav — article previous/next navigation + share row.
 *
 * ENCODE (rows in authored order, one cell each):
 *   row 1: <a href="…">Previous post title</a>
 *   row 2: <a href="…">Next post title</a>
 *   row 3: Share this post: <a href="…linkedin…">LinkedIn</a>
 *          <a href="…facebook…">Facebook</a>
 *
 * DECODE (reconstructive): flatten-first collector (#62/#68); classify by
 * content (#48) — a row holding a social-network link (or several links) is
 * the share row; the remaining single-link rows are prev then next in
 * authored order. Share icons are block-owned inline SVGs (brand chrome).
 */

const SHARE_ICONS = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.31h4.52V23H.24V8.31zM8.34 8.31h4.33v2h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V23h-4.51v-7.16c0-1.71-.03-3.91-2.38-3.91-2.39 0-2.75 1.86-2.75 3.78V23H8.34V8.31z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 22v-9h3l.5-3.5h-3.5V7.2c0-1.02.28-1.7 1.74-1.7H17V2.14C16.68 2.1 15.57 2 14.28 2 11.6 2 9.75 3.66 9.75 6.7v2.8H6.7V13h3.05v9h3.75z"/></svg>',
};

const SOCIAL_RE = /linkedin\.com|facebook\.com|twitter\.com|x\.com|xing\.com/i;

function socialNetwork(href) {
  if (/linkedin\.com/i.test(href)) return 'linkedin';
  if (/facebook\.com/i.test(href)) return 'facebook';
  return null;
}

function buildPostLink(a, dir) {
  const link = document.createElement('a');
  link.className = `post-nav-link ${dir}`;
  link.href = a.href;
  link.rel = dir;
  const title = a.textContent.trim();
  link.setAttribute('aria-label', `${dir === 'prev' ? 'Previous' : 'Next'} post: ${title}`);
  const dirSpan = document.createElement('span');
  dirSpan.className = 'post-nav-dir';
  dirSpan.setAttribute('aria-hidden', 'true');
  dirSpan.textContent = dir === 'prev' ? '← Previous' : 'Next →';
  const titleSpan = document.createElement('span');
  titleSpan.className = 'post-nav-title';
  titleSpan.textContent = title;
  link.append(dirSpan, ' ', titleSpan);
  return link;
}

function buildShareRow(row) {
  const share = document.createElement('div');
  share.className = 'post-nav-share';
  const label = document.createElement('p');
  const labelText = row.textContent.replace(/\s+/g, ' ').trim();
  [...row.querySelectorAll('a')].forEach((a) => {
    const network = socialNetwork(a.href);
    const link = document.createElement('a');
    link.href = a.href;
    link.setAttribute('aria-label', `Share this post on ${a.textContent.trim() || network || 'social media'}`);
    if (network) link.innerHTML = SHARE_ICONS[network];
    else link.textContent = a.textContent.trim();
    share.append(link);
    a.remove();
  });
  label.textContent = labelText
    .replace(/\s*(LinkedIn|Facebook|Twitter|X|Xing)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Share this post:';
  share.prepend(label);
  return share;
}

export default function decorate(block) {
  const rows = [...block.children];
  let shareRow = null;
  const postLinks = [];
  rows.forEach((row) => {
    const links = [...row.querySelectorAll('a[href]')];
    const isShare = links.length > 1 || links.some((a) => SOCIAL_RE.test(a.href));
    if (!shareRow && links.length && isShare) {
      shareRow = row;
    } else if (links.length) {
      postLinks.push(links[0]);
    }
  });

  const nav = document.createElement('nav');
  nav.className = 'post-nav-links';
  nav.setAttribute('aria-label', 'More posts');
  const [prev, next] = postLinks;
  if (prev) nav.append(buildPostLink(prev, 'prev'));
  if (next) nav.append(buildPostLink(next, 'next'));

  const share = shareRow ? buildShareRow(shareRow) : null;
  block.replaceChildren();
  if (nav.children.length) block.append(nav);
  if (share) block.append(share);
}
