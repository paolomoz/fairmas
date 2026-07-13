/*
 * event-meta — event logistics panels (Details + Venue).
 *
 * Model (author contract):
 *  - a row whose cell holds a heading (h2/h3) starts a new panel
 *    ("Details", "Venue");
 *  - two-cell rows are label:value pairs (#50) → dt/dd (links preserved);
 *  - a row labelled "Add to calendar" with a list of links renders as a
 *    native <details> disclosure;
 *  - remaining single-cell rows are plain panel paragraphs (venue name,
 *    address lines).
 */

export default function decorate(block) {
  const grid = document.createElement('div');
  grid.className = 'event-meta-grid';
  let panel = null;
  let dl = null;

  const openPanel = (heading) => {
    panel = document.createElement('div');
    panel.className = 'event-meta-panel';
    if (heading) panel.append(heading);
    dl = null;
    grid.append(panel);
  };

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const heading = row.querySelector('h2, h3, h4');

    if (heading && cells.length === 1) {
      openPanel(heading);
      row.remove();
      return;
    }
    if (!panel) openPanel(null);

    const label = cells.length > 1 ? cells[0].textContent.trim() : '';
    const valueCell = cells.length > 1 ? cells[1] : cells[0];

    if (/add to calendar/i.test(label) && valueCell.querySelector('a')) {
      const details = document.createElement('details');
      details.className = 'event-meta-calendar';
      const summary = document.createElement('summary');
      summary.append(label.replace(/:$/, ''));
      const caret = document.createElement('span');
      caret.className = 'event-meta-caret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = ' ▾';
      summary.append(caret);
      details.append(summary);
      const list = valueCell.querySelector('ul, ol');
      if (list) details.append(list);
      else [...valueCell.querySelectorAll('a')].forEach((a) => details.append(a));
      panel.append(details);
    } else if (cells.length > 1) {
      if (!dl) {
        dl = document.createElement('dl');
        panel.append(dl);
      }
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      while (valueCell.firstChild) dd.append(valueCell.firstChild);
      dl.append(dt, dd);
    } else if (valueCell.querySelector('p, ul, ol')) {
      while (valueCell.firstChild) panel.append(valueCell.firstChild);
    } else {
      // flatten-first (#62): recover a bare-text cell as a paragraph
      const p = document.createElement('p');
      while (valueCell.firstChild) p.append(valueCell.firstChild);
      panel.append(p);
    }
    row.remove();
  });

  block.replaceChildren(grid);
}
