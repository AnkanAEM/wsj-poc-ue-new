import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the custom-image block
 * @param {Element} block The custom-image block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const figure = document.createElement('figure');
  figure.className = 'custom-image-content';

  const imageRow = rows[0];
  let picture = imageRow ? imageRow.querySelector('picture') : null;
  let img = imageRow ? imageRow.querySelector('img') : null;
  const link = imageRow ? imageRow.querySelector('a') : null;

  if (!picture && !img && link && link.href) {
    img = document.createElement('img');
    img.src = link.href;
    img.alt = link.textContent || 'Custom Approved Image';
  }

  let altText = '';
  if (rows.length > 1) {
    altText = rows[1].textContent.trim();
  }

  let captionText = '';
  if (rows.length > 2) {
    captionText = rows[2].textContent.trim();
  }

  if (img || picture) {
    const src = img ? img.src : (picture.querySelector('img')?.src || '');
    const finalAlt = altText || (img ? img.alt : '') || 'Approved Asset';

    if (src) {
      const optimizedPicture = createOptimizedPicture(src, finalAlt, false, [
        { media: '(min-width: 900px)', width: '1200' },
        { media: '(min-width: 600px)', width: '800' },
        { width: '400' },
      ]);

      if (img) moveInstrumentation(img, optimizedPicture.querySelector('img'));
      else if (picture) moveInstrumentation(picture, optimizedPicture.querySelector('img'));

      const container = document.createElement('div');
      container.className = 'custom-image-picture-container';
      container.append(optimizedPicture);
      figure.append(container);
    }
  }

  if (captionText) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'custom-image-caption';
    figcaption.textContent = captionText;
    figure.append(figcaption);
  }

  moveInstrumentation(block, figure);
  block.replaceChildren(figure);
}
