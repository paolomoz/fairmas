/*
 * quote — featured testimonial (home navy proof band, fairplanner).
 *
 * Model (reconstructive): logo picture row + blockquote row + attribution
 * row (name | role) + optional CTA rows (lead-in paragraph, strong/em button
 * links). Rows may be authored in any order — classification is by content:
 * picture → logo, button paragraph → CTA, first text row → quote, next text
 * cells → name/role, remaining text → CTA lead-in.
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

function isButtonCell(cell) {
  const a = cell.querySelector('a');
  if (!a || cell.textContent.trim() !== a.textContent.trim()) return false;
  return !!(a.classList.contains('button') || a.closest('strong, em'));
}

export default function decorate(block) {
  let logo = null;
  let quoteCell = null;
  const attribution = [];
  const ctaLead = [];
  const ctaButtons = [];

  [...block.children].forEach((row) => {
    cellsOf(row).forEach((cell) => {
      if (cell.querySelector('picture, img')) {
        logo = cell.querySelector('picture, img');
      } else if (isButtonCell(cell)) {
        ctaButtons.push(...cell.children);
      } else if (!cell.textContent.trim()) {
        /* empty cell */
      } else if (!quoteCell) {
        quoteCell = cell;
      } else if (attribution.length < 2) {
        attribution.push(cell.textContent.trim());
      } else {
        ctaLead.push(...cell.children);
      }
    });
  });

  const figure = document.createElement('figure');
  figure.className = 'quote-figure';

  const blockquote = document.createElement('blockquote');
  if (quoteCell) {
    while (quoteCell.firstChild) blockquote.append(quoteCell.firstChild);
  }
  figure.append(blockquote);

  const caption = document.createElement('figcaption');
  caption.className = 'quote-attrib';
  if (logo) {
    const chip = document.createElement('span');
    chip.className = 'quote-logo';
    chip.append(logo);
    caption.append(chip);
  }
  if (attribution.length) {
    const who = document.createElement('span');
    who.className = 'quote-who';
    const [name, role] = attribution;
    const nameEl = document.createElement('span');
    nameEl.className = 'quote-name';
    nameEl.textContent = name;
    who.append(nameEl);
    if (role) {
      const roleEl = document.createElement('span');
      roleEl.className = 'quote-role';
      roleEl.textContent = role;
      who.append(roleEl);
    }
    caption.append(who);
  }
  if (caption.children.length) figure.append(caption);

  block.replaceChildren(figure);

  if (ctaLead.length || ctaButtons.length) {
    const cta = document.createElement('div');
    cta.className = 'quote-cta';
    cta.append(...ctaLead, ...ctaButtons);
    block.append(cta);
  }
}
