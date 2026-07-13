/*
 * accordion — FAQ-style disclosure list. One row per item: [question] [answer].
 * Rendered as native <details>/<summary> for built-in keyboard + a11y support.
 * A leading single-cell row (no answer) is treated as an optional group intro.
 */
export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  rows.forEach((row) => {
    const cells = [...row.children];
    const q = cells[0];
    const a = cells[1];

    // single-cell row with no answer = intro paragraph, kept as-is
    if (!a) {
      const intro = document.createElement('div');
      intro.className = 'accordion-intro';
      intro.append(...q.childNodes);
      block.append(intro);
      return;
    }

    const details = document.createElement('details');
    details.className = 'accordion-item';

    const summary = document.createElement('summary');
    summary.className = 'accordion-q';
    const qText = document.createElement('span');
    qText.className = 'accordion-q-text';
    qText.append(...q.childNodes);
    const icon = document.createElement('span');
    icon.className = 'accordion-icon';
    icon.setAttribute('aria-hidden', 'true');
    summary.append(qText, icon);

    const answer = document.createElement('div');
    answer.className = 'accordion-a';
    answer.append(...a.childNodes);

    details.append(summary, answer);
    block.append(details);
  });
}
