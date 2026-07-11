/*
 * experts — home "From Hotel Experts / For Hotel Experts" block.
 *
 * Model (reconstructive): lead row = picture cell + intro cell (kicker p,
 * h2, lede p, paragraphs); every following row = one blurb (h3 + p, in one
 * cell or split across cells).
 */

/** recover bare-text cell content as <p> (#62) */
function wrapBareText(cell) {
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const p = document.createElement('p');
      node.replaceWith(p);
      p.append(node);
    }
  });
}

function cellsOf(row) {
  const cells = [...row.children].filter((el) => el.tagName === 'DIV');
  const list = cells.length ? cells : [row];
  list.forEach(wrapBareText);
  return list;
}

const hasMedia = (el) => el.matches('picture, img') || !!el.querySelector('picture, img');

export default function decorate(block) {
  const lead = document.createElement('div');
  lead.className = 'experts-lead';
  const media = document.createElement('div');
  media.className = 'experts-media';
  const intro = document.createElement('div');
  intro.className = 'experts-intro';
  const blurbs = document.createElement('div');
  blurbs.className = 'experts-blurbs';

  [...block.children].forEach((row) => {
    if (hasMedia(row)) {
      cellsOf(row).forEach((cell) => {
        const target = hasMedia(cell) ? media : intro;
        while (cell.firstChild) target.append(cell.firstChild);
      });
    } else {
      const blurb = document.createElement('div');
      blurb.className = 'experts-blurb';
      cellsOf(row).forEach((cell) => {
        while (cell.firstChild) blurb.append(cell.firstChild);
      });
      if (blurb.textContent.trim()) blurbs.append(blurb);
    }
  });

  // classify intro copy around the heading
  const heading = intro.querySelector('h2, h3');
  if (heading) {
    const prev = heading.previousElementSibling;
    if (prev && prev.tagName === 'P') prev.classList.add('experts-kicker');
    const next = heading.nextElementSibling;
    if (next && next.tagName === 'P') next.classList.add('experts-lede');
  }

  lead.append(media, intro);
  block.replaceChildren(lead);
  if (blurbs.children.length) block.append(blurbs);
}
