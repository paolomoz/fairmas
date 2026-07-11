/*
 * compare — "Without Fairmas / With Fairmas" toggle + Lottie diagram (home).
 *
 * Template-slotted (#95): the toggle + diagram composition is held here
 * verbatim from the migrated page; authored rows only slot values:
 *   row 1: toggle labels — "Without Fairmas" | "With Fairmas"
 *   row 2: diagram text description (becomes the sr-only alternative for the
 *          role="img" Lottie container; pre-decoration it doubles as the
 *          no-JS fallback text)
 *
 * The Lottie player and animation data are fixed brand assets in the repo
 * (/img/fairmas), loaded via script injection when the block scrolls into
 * view. Interactions mirror the live site's initializeAnimation():
 * With = play forward + .slide, Without = reset to frame 0.
 */

const LOTTIE_PLAYER_SRC = '/img/fairmas/lottie.min.js';
const DIAGRAM_DATA_SRC = '/img/fairmas/with-without-fairmas-diagram.js';

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${src}"]`);
    if (script && script.dataset.loaded === 'true') {
      resolve();
      return;
    }
    if (!script) {
      script = document.createElement('script');
      script.src = src;
      document.head.append(script);
    }
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', reject);
  });
}

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

function buildTrigger(label, active) {
  const li = document.createElement('li');
  li.className = `compare-trigger ${active ? 'active' : 'passiv'}`;
  li.dataset.ww = active ? 'without' : 'with';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'inner';
  button.setAttribute('aria-pressed', String(active));
  button.textContent = label;
  li.append(button);
  return li;
}

export default function decorate(block) {
  const cells = collectCells(block);
  const labels = cells.slice(0, 2).map((cell) => cell.textContent.trim());
  const [withoutLabel, withLabel] = [labels[0] || 'Without Fairmas', labels[1] || 'With Fairmas'];

  // description row → sr-only text alternative for the diagram
  const desc = document.createElement('p');
  desc.className = 'compare-desc';
  desc.id = `compare-desc-${Math.random().toString(36).slice(2, 7)}`;
  cells.slice(2).forEach((cell) => {
    while (cell.firstChild) desc.append(cell.firstChild);
  });

  const nav = document.createElement('div');
  nav.className = 'compare-nav';
  const tabs = document.createElement('ul');
  tabs.className = 'compare-tabs';
  tabs.append(buildTrigger(withoutLabel, true), buildTrigger(withLabel, false));
  nav.append(tabs);

  const container = document.createElement('div');
  container.className = 'compare-lottie';
  container.setAttribute('role', 'img');
  if (desc.textContent.trim()) container.setAttribute('aria-labelledby', desc.id);

  block.replaceChildren(nav, container);
  if (desc.textContent.trim()) block.append(desc);

  // Lottie: init on intersection (assets are repo-fixed, loaded on demand)
  let anim = null;
  const init = async () => {
    if (anim) return;
    try {
      await Promise.all([loadScriptOnce(LOTTIE_PLAYER_SRC), loadScriptOnce(DIAGRAM_DATA_SRC)]);
    } catch (e) {
      return;
    }
    if (anim || !window.lottie || !window.FAIRMAS_DIAGRAM_DATA) return;
    anim = window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: window.FAIRMAS_DIAGRAM_DATA,
    });
  };
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        init();
        obs.unobserve(entry.target);
      }
    });
  });
  io.observe(container);

  const triggers = [...tabs.querySelectorAll('.compare-trigger')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  tabs.addEventListener('click', async (e) => {
    const li = e.target.closest('.compare-trigger');
    if (!li) return;
    await init();
    const isWith = li.dataset.ww === 'with';
    tabs.classList.toggle('slide', isWith);
    triggers.forEach((t) => {
      const on = t === li;
      t.classList.toggle('active', on);
      t.classList.toggle('passiv', !on);
      t.querySelector('.inner').setAttribute('aria-pressed', String(on));
    });
    if (!anim) return;
    if (isWith) {
      if (reduced.matches) {
        anim.goToAndStop(anim.totalFrames - 1, true);
      } else {
        anim.goToAndStop(0, true);
        anim.play();
      }
    } else {
      anim.goToAndStop(0, true);
    }
  });
}
