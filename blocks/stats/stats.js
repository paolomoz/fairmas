/*
 * stats — fact tiles (about page "Fairmas Facts").
 *
 * Model (author contract): one row per tile — first cell a numeral (text) OR
 * an image icon, last cell the label. Classified by content (#48/#53/#72):
 * a cell holding an image becomes the tile icon, otherwise the tile numeral.
 */

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'stats-grid';
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'stat';
    const cells = [...row.children];
    const valueCell = cells[0];
    const labelCell = cells.length > 1 ? cells[cells.length - 1] : null;

    if (valueCell) {
      const icon = valueCell.querySelector('picture, img');
      if (icon) {
        const wrap = document.createElement('p');
        wrap.className = 'stat-icon';
        wrap.append(icon);
        li.append(wrap);
      } else if (valueCell.textContent.trim()) {
        const num = document.createElement('p');
        num.className = 'stat-num';
        num.textContent = valueCell.textContent.trim(); // textContent (#79)
        li.append(num);
      }
    }

    if (labelCell && labelCell.textContent.trim()) {
      const label = document.createElement('p');
      label.className = 'stat-label';
      label.textContent = labelCell.textContent.trim();
      li.append(label);
    }

    if (li.children.length) list.append(li);
    row.remove();
  });
  block.replaceChildren(list);
}
