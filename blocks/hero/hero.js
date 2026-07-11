/*
 * hero — fairmas hero block (variant-class pattern).
 *
 * Model: one row; media cell (picture) + content cell (h1, lede p, copy,
 * strong/em button paragraphs). Cells may be authored in either order or
 * DA-flattened — the collector below recovers both shapes.
 *
 * Variants (block classes):
 *  - globe   (home): fixed brand video from /img/fairmas, poster-first,
 *              idle-start, pause control. Styled in hero.css (this block owns it).
 *  - photo   (fairplanner/about): authored picture + scrim — CSS added in the
 *              "photo variant" section of hero.css by the owning agent.
 *  - contact / slim: content-only heroes — CSS extension sections in hero.css.
 */

const GLOBE_VIDEO_SRC = '/img/fairmas/world-of-fairmas-720-f1.mp4';
const GLOBE_POSTER_SRC = '/img/fairmas/world-of-fairmas-poster-f1.jpg';

/**
 * flatten-first cell collector (#62): iterate block rows > cells, recover
 * bare-text cells as <p>. Returns the flat list of cell elements.
 */
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

/** classify by content (#53/#72) */
function isMediaCell(cell) {
  return cell.matches('picture, img, video') || !!cell.querySelector('picture, img, video');
}

/** true when the paragraph is (or will be decorated as) a button container */
function isButtonParagraph(p) {
  const a = p.querySelector('a');
  if (!a || p.textContent.trim() !== a.textContent.trim()) return false;
  return !!(a.classList.contains('button') || a.closest('strong, em'));
}

/**
 * globe h1 renders one sentence per line (migrated spec: h1 spans).
 * Split plain-text headings on sentence boundaries.
 */
function splitHeadingLines(heading) {
  if (!heading || heading.children.length) return;
  const parts = heading.textContent.match(/[^.!?]+[.!?]+/g);
  if (!parts || parts.length < 2) return;
  heading.textContent = '';
  parts.forEach((part, i) => {
    const span = document.createElement('span');
    span.textContent = part.trim();
    if (i) heading.append(' ');
    heading.append(span);
  });
}

/** poster-first video: pause button + idle-start when motion is allowed */
function wireVideo(media, video, label) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hero-video-toggle';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = `Play ${label}`;
  const setState = (playing) => {
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.textContent = playing ? `Pause ${label}` : `Play ${label}`;
  };
  video.addEventListener('play', () => setState(true));
  video.addEventListener('pause', () => setState(false));
  toggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  media.append(toggle);
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const start = () => {
      (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => {
        video.play().catch(() => {});
      });
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
  }
}

function buildGlobeVideo() {
  const video = document.createElement('video');
  video.setAttribute('width', '1920');
  video.setAttribute('height', '1920');
  video.setAttribute('poster', GLOBE_POSTER_SRC);
  video.setAttribute('preload', 'none');
  video.muted = true;
  video.loop = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', 'World of Fairmas — animated globe with connection arcs');
  const source = document.createElement('source');
  source.src = GLOBE_VIDEO_SRC;
  source.type = 'video/mp4';
  video.append(source);
  return video;
}

export default function decorate(block) {
  const cells = collectCells(block);
  const content = document.createElement('div');
  content.className = 'hero-content';
  const media = document.createElement('div');
  media.className = 'hero-media';

  cells.forEach((cell) => {
    const target = isMediaCell(cell) ? media : content;
    while (cell.firstChild) target.append(cell.firstChild);
  });

  // buttons → cta row
  const cta = document.createElement('div');
  cta.className = 'hero-cta';
  [...content.querySelectorAll(':scope > p')].forEach((p) => {
    if (isButtonParagraph(p)) cta.append(p);
  });
  if (cta.children.length) content.append(cta);

  // lede = first plain paragraph
  const lede = [...content.querySelectorAll(':scope > p')]
    .find((p) => !p.closest('.hero-cta'));
  if (lede) lede.classList.add('hero-lede');

  block.replaceChildren(content);
  if (media.children.length || block.classList.contains('globe')) {
    block.append(media);
  }

  if (block.classList.contains('globe')) {
    splitHeadingLines(content.querySelector('h1'));
    let video = media.querySelector('video');
    if (!video) {
      video = buildGlobeVideo();
      media.prepend(video);
    }
    wireVideo(media, video, 'globe animation');
  }
}
