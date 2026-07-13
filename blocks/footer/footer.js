import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Groups default content into columns: each `<p><strong>Title</strong></p>`
 * starts a new column that collects the elements following it.
 * @param {Element} wrapper A default content wrapper
 */
function classifyColumns(wrapper) {
  const isTitle = (el) => el.tagName === 'P'
    && el.childElementCount === 1
    && el.firstElementChild.tagName === 'STRONG'
    && el.textContent.trim() === el.firstElementChild.textContent.trim();
  const children = [...wrapper.children];
  if (!children.some(isTitle)) return;
  wrapper.classList.add('footer-columns');
  let col = null;
  children.forEach((el) => {
    if (isTitle(el)) {
      col = document.createElement('div');
      col.className = 'footer-col';
      wrapper.append(col);
    }
    if (col) col.append(el);
  });
}

/**
 * Classifies footer sections by their content shape:
 * brand (image only), regions (columns without link lists),
 * sitemap (columns with link lists), legal (everything else).
 * @param {Element} footer The footer content container
 */
function classifySections(footer) {
  footer.querySelectorAll(':scope > .section').forEach((section) => {
    const columns = section.querySelector('.footer-columns');
    if (columns) {
      section.classList.add(columns.querySelector('.footer-col ul') ? 'footer-sitemap' : 'footer-regions');
    } else if (section.querySelector('img')) {
      section.classList.add('footer-brand');
    } else {
      section.classList.add('footer-legal');
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  footer.querySelectorAll('.default-content-wrapper').forEach(classifyColumns);
  classifySections(footer);

  block.append(footer);
}
