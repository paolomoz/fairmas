/*
 * embed — responsive video embed (Vimeo / YouTube) with a click-to-load
 * facade so the heavy player script never touches LCP/TBT. Authored as a
 * single cell holding the video URL (a link or plain text).
 */
function providerFrom(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host.includes('youtube.com') || host === 'youtu.be') {
      const id = host === 'youtu.be'
        ? u.pathname.slice(1)
        : (u.searchParams.get('v') || u.pathname.split('/').pop());
      if (id) return { src: `https://www.youtube.com/embed/${id}?autoplay=1`, label: 'YouTube video' };
    }
    if (host.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return { src: `https://player.vimeo.com/video/${id}?autoplay=1`, label: 'Vimeo video' };
    }
  } catch (e) { /* not a URL */ }
  return null;
}

export default function decorate(block) {
  const link = block.querySelector('a');
  const raw = (link?.href || block.textContent || '').trim();
  const info = providerFrom(raw);
  block.textContent = '';

  if (!info) {
    // unknown provider — fall back to a plain link so nothing is lost
    if (raw) {
      const a = document.createElement('a');
      a.href = raw;
      a.textContent = 'Watch the video';
      a.className = 'button secondary';
      block.append(a);
    }
    return;
  }

  const facade = document.createElement('button');
  facade.type = 'button';
  facade.className = 'embed-facade';
  facade.setAttribute('aria-label', `Play ${info.label}`);
  const play = document.createElement('span');
  play.className = 'embed-play';
  play.setAttribute('aria-hidden', 'true');
  facade.append(play);

  facade.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'embed-iframe';
    iframe.src = info.src;
    iframe.title = info.label;
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.loading = 'lazy';
    facade.replaceWith(iframe);
  });

  block.append(facade);
}
