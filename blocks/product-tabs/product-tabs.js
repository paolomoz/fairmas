/*
 * product-tabs — home product family tabs (cloned from live elementor-tabs).
 *
 * Template-slotted (#95): the tablist/panel composition, "Developed for:"
 * chips label and the Revenue Planning & Analytics animation (fixed brand
 * asset, /img/fairmas/arp.mp4 + arp-static.png poster) are dev-placed here;
 * authored rows slot the values. Model — one row per tab, cells:
 *   tab label | copy (h3 + rich text with links) | chips (ul; <em> = active
 *   chip) | media (picture; leave EMPTY to use the block's fixed animation)
 */

const ARP_VIDEO_SRC = '/img/fairmas/arp.mp4';
const ARP_POSTER_SRC = '/img/fairmas/arp-static.png';

/** classify a row's cells by content (#53/#72) */
function parseRow(row) {
  const cells = [...row.children].filter((el) => el.tagName === 'DIV');
  const tab = {
    label: '', copy: null, chips: null, media: null,
  };
  cells.forEach((cell) => {
    if (cell.querySelector('picture, img')) tab.media = cell;
    else if (cell.querySelector('ul, ol')) tab.chips = cell.querySelector('ul, ol');
    else if (cell.querySelector('h1, h2, h3, h4')) tab.copy = cell;
    else if (cell.textContent.trim() && !tab.label) tab.label = cell.textContent.trim();
  });
  if (!tab.label) {
    const h = tab.copy && tab.copy.querySelector('h1, h2, h3, h4');
    tab.label = h ? h.textContent.trim() : '';
  }
  return tab;
}

function buildChips(list) {
  const chips = document.createElement('ul');
  chips.className = 'chips';
  [...list.children].forEach((item) => {
    const chip = document.createElement('li');
    chip.className = 'chip';
    const em = item.querySelector('em');
    if (em && em.textContent.trim() === item.textContent.trim()) {
      chip.classList.add('chip-active');
    }
    chip.textContent = item.textContent.trim();
    chips.append(chip);
  });
  return chips;
}

/** fixed animation media: pausable video + toggle (poster-first, no autoplay) */
function buildAnimationMedia(labelText) {
  const video = document.createElement('video');
  video.className = 'ptabs-video';
  video.setAttribute('poster', ARP_POSTER_SRC);
  video.setAttribute('preload', 'none');
  video.setAttribute('width', '650');
  video.setAttribute('height', '480');
  video.muted = true;
  video.loop = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', `${labelText} dashboard animation`);
  const source = document.createElement('source');
  source.src = ARP_VIDEO_SRC;
  source.type = 'video/mp4';
  video.append(source);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ptabs-video-toggle';
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
  return [video, toggle];
}

export default function decorate(block) {
  const uid = Math.random().toString(36).slice(2, 7);
  const rows = [...block.children].map(parseRow);

  const tablist = document.createElement('div');
  tablist.className = 'ptabs-list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Fairmas products');

  const panels = [];
  const tabs = rows.map((row, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'ptab';
    tab.id = `ptab-${uid}-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(i === 0));
    tab.setAttribute('aria-controls', `ppanel-${uid}-${i}`);
    if (i !== 0) tab.tabIndex = -1;
    tab.textContent = row.label;
    tablist.append(tab);

    const panel = document.createElement('div');
    panel.className = 'ptabs-panel';
    panel.id = `ppanel-${uid}-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    if (i !== 0) panel.hidden = true;

    const copy = document.createElement('div');
    copy.className = 'ptabs-copy';
    if (row.copy) {
      while (row.copy.firstChild) copy.append(row.copy.firstChild);
    }
    if (row.chips) {
      const chipsLabel = document.createElement('p');
      chipsLabel.className = 'chips-label';
      chipsLabel.textContent = 'Developed for:';
      copy.append(chipsLabel, buildChips(row.chips));
    }
    panel.append(copy);

    const media = document.createElement('figure');
    media.className = 'ptabs-media';
    const picture = row.media && row.media.querySelector('picture, img');
    if (picture) {
      const img = picture.matches('img') ? picture : picture.querySelector('img');
      if (img) img.loading = 'lazy';
      media.append(picture);
    } else {
      media.append(...buildAnimationMedia(row.label));
    }
    panel.append(media);
    panels.push(panel);
    return tab;
  });

  block.replaceChildren(tablist, ...panels);

  const select = (i, focus) => {
    tabs.forEach((tab, j) => {
      tab.setAttribute('aria-selected', String(i === j));
      tab.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (e) => {
      let d = 0;
      if (e.key === 'ArrowRight') d = 1;
      else if (e.key === 'ArrowLeft') d = -1;
      if (d) {
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      }
      if (e.key === 'Home') {
        e.preventDefault();
        select(0, true);
      }
      if (e.key === 'End') {
        e.preventDefault();
        select(tabs.length - 1, true);
      }
    });
  });
}
