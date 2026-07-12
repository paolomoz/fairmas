import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  getMetadata,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
const ORG = {
  '@type': 'Organization',
  '@id': 'https://fairmas.com/#organization',
  name: 'Fairmas GmbH',
  url: 'https://fairmas.com',
  logo: 'https://fairmas.com/wp-content/uploads/2022/09/Logo-Fairmas_new-orange_newarrow.png',
  sameAs: ['https://de.linkedin.com/company/fairmas-gmbh', 'https://www.facebook.com/FairmasGmbH'],
};

/**
 * Restore the structured-data graph on every page (client-side; the migrated
 * prototypes carried it inline in <head>, which EDS content pages cannot).
 * Per-template entities are built from REAL on-page data — never fabricated;
 * a field whose source isn't confidently present on the page is omitted.
 */
function addStructuredData() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
  const title = (document.querySelector('main h1')?.textContent || document.title).trim();
  const description = getMetadata('description');
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  const graph = [
    ORG,
    {
      '@type': 'WebSite', '@id': 'https://fairmas.com/#website', url: 'https://fairmas.com', name: 'Fairmas', publisher: { '@id': 'https://fairmas.com/#organization' },
    },
    {
      '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: document.title, ...(description ? { description } : {}), isPartOf: { '@id': 'https://fairmas.com/#website' }, about: { '@id': 'https://fairmas.com/#organization' },
    },
  ];

  // BreadcrumbList from path segments
  const segs = path.split('/').filter(Boolean);
  const crumbs = [{
    '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fairmas.com/',
  }];
  segs.forEach((seg, i) => {
    const name = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({
      '@type': 'ListItem', position: i + 2, name, ...(i === segs.length - 1 ? {} : { item: `https://fairmas.com/${segs.slice(0, i + 1).join('/')}/` }),
    });
  });
  if (crumbs.length > 1) graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs });

  if (path === '/fairplanner') {
    graph.push({
      '@type': 'SoftwareApplication', name: 'FairPlanner', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', provider: { '@id': 'https://fairmas.com/#organization' }, ...(description ? { description } : {}),
    });
  } else if (path.startsWith('/blogs/') || path.startsWith('/whats-new/')) {
    const meta = document.querySelector('main .article-card .article-byline, main [class*="byline"]')?.textContent || '';
    const author = meta.split('|')[0]?.split('·')[0]?.trim();
    const article = {
      '@type': 'Article', headline: title, ...(ogImage ? { image: ogImage } : {}), publisher: { '@id': 'https://fairmas.com/#organization' }, mainEntityOfPage: { '@id': `${canonical}#webpage` },
    };
    if (author && /^[A-Za-z].{2,40}$/.test(author) && !/\d/.test(author)) article.author = { '@type': 'Person', name: author };
    if (path.startsWith('/blogs/')) graph.push(article);
  } else if (path.startsWith('/events/')) {
    const venue = document.querySelector('main .event-meta')?.textContent || '';
    const event = { '@type': 'Event', name: title, organizer: { '@id': 'https://fairmas.com/#organization' } };
    if (/San Antonio|Convention Center/.test(venue)) {
      event.location = { '@type': 'Place', name: 'Henry B. Gonzalez Convention Center', address: '900 E. Market Street, San Antonio, TX 78205, United States' };
    }
    graph.push(event);
  } else if (path === '/contact') {
    graph.push({ '@type': 'ContactPage', '@id': `${canonical}#webpage`, url: canonical });
  }

  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  document.head.append(el);
}

async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  addStructuredData();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
