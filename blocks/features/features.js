/*
 * features — fairplanner capability ledger.
 *
 * Model (author contract): one row per feature — h3 cell + body cell
 * (+ optional media cell with an authored image). Text-only rows render as
 * hairline-topped typographic ledger rows (h3 left, measure-capped body
 * right); rows with media render as split rows whose media side alternates.
 *
 * The payroll feature owns a fixed brand animation (/img/fairmas/
 * fairpayroll.mp4 + fairpayroll-static.png poster) — a block-owned signature
 * asset, never authored. It is detected by heading content and rendered as a
 * poster-first, pausable, CSP-safe video (no inline handlers).
 *
 * Footnote paragraphs (leading '*', e.g. the USALI disclaimer) are classified
 * by content and rendered as small meta text.
 */

const PAYROLL_VIDEO_SRC = '/img/fairmas/fairpayroll.mp4';
const PAYROLL_POSTER_SRC = '/img/fairmas/fairpayroll-static.png';

/** classify by content (#53/#72): a cell is media when it holds an image */
function isMediaCell(cell) {
  return !!cell.querySelector('picture, img, video');
}

function buildPayrollVideo() {
  const video = document.createElement('video');
  video.setAttribute('width', '1200');
  video.setAttribute('height', '704');
  video.setAttribute('poster', PAYROLL_POSTER_SRC);
  video.setAttribute('preload', 'none');
  video.muted = true;
  video.loop = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', 'FairPayroll payroll planning animation');
  const source = document.createElement('source');
  source.src = PAYROLL_VIDEO_SRC;
  source.type = 'video/mp4';
  video.append(source);
  return video;
}

/** poster-first pausable video control (CSP strict-dynamic safe) */
function wireVideoToggle(media, video) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'feature-video-toggle';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = 'Play animation';
  const setState = (playing) => {
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.textContent = playing ? 'Pause animation' : 'Play animation';
  };
  video.addEventListener('play', () => setState(true));
  video.addEventListener('pause', () => setState(false));
  toggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  media.append(toggle);
}

export default function decorate(block) {
  let mediaIndex = 0;
  [...block.children].forEach((row) => {
    row.classList.add('feature-row');
    const copy = document.createElement('div');
    copy.className = 'feature-copy';
    let media = null;
    [...row.children].forEach((cell) => {
      if (!media && isMediaCell(cell)) {
        media = cell;
        media.classList.add('feature-media');
      } else {
        while (cell.firstChild) copy.append(cell.firstChild);
        cell.remove();
      }
    });

    // classify footnotes by content (#48): paragraphs opening with '*'
    copy.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim().startsWith('*')) p.classList.add('feature-footnote');
    });

    // block-owned payroll animation (brand signature, not authored content)
    const heading = copy.querySelector('h2, h3, h4');
    if (!media && heading && /payroll/i.test(heading.textContent)) {
      media = document.createElement('div');
      media.className = 'feature-media feature-media-video';
      const video = buildPayrollVideo();
      media.append(video);
      wireVideoToggle(media, video);
    }

    if (media) {
      row.replaceChildren(copy, media);
      row.classList.add('feature-row-media');
      if (mediaIndex % 2 === 0) row.classList.add('feature-row-flip');
      mediaIndex += 1;
    } else {
      // typographic ledger row: heading left, measure-capped body right
      const head = document.createElement('div');
      head.className = 'feature-head';
      if (heading) head.append(heading);
      copy.classList.add('feature-body');
      row.replaceChildren(head, copy);
      row.classList.add('feature-row-text');
    }
  });
}
