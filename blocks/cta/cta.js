/*
 * cta — shared pre-footer call-to-action band (all pages).
 *
 * Model (reconstructive): kicker p / h2 / copy paragraph(s) with a visible
 * email link / strong+em button paragraphs. Rows single-cell; flatten-first
 * collector tolerates DA-flattened or multi-cell authoring.
 */

/** flatten-first cell collector (#62) */
function collectCells(block) {
  const cells = [];
  [...block.children].forEach((row) => {
    const rowCells = [...row.children].filter((el) => el.tagName === 'DIV');
    (rowCells.length ? rowCells : [row]).forEach((cell) => {
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          const p = document.createElement('p');
          node.replaceWith(p);
          p.append(node);
        }
      });
      cells.push(cell);
    });
  });
  return cells;
}

function isButtonParagraph(p) {
  const a = p.querySelector('a');
  if (!a || p.textContent.trim() !== a.textContent.trim()) return false;
  return !!(a.classList.contains('button') || a.closest('strong, em'));
}

export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'cta-content';
  collectCells(block).forEach((cell) => {
    while (cell.firstChild) content.append(cell.firstChild);
  });

  // buttons → action row
  const actions = document.createElement('div');
  actions.className = 'cta-actions';
  [...content.querySelectorAll(':scope > p')].forEach((p) => {
    if (isButtonParagraph(p)) actions.append(p);
  });
  if (actions.children.length) content.append(actions);

  // kicker = paragraph immediately before the heading
  const heading = content.querySelector('h1, h2, h3');
  if (heading) {
    const prev = heading.previousElementSibling;
    if (prev && prev.tagName === 'P') prev.classList.add('cta-kicker');
  }

  block.replaceChildren(content);
}
