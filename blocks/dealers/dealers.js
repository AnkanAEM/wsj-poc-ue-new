import { moveInstrumentation } from '../../scripts/scripts.js';
import { getApiEndpoint } from '../../scripts/config.js';

/**
 * Creates skeleton loader markup while data is fetching
 * @returns {string} HTML string for skeleton cards
 */
function renderSkeletons() {
  return Array(4)
    .fill(0)
    .map(
      () => `
      <div class="dealers-card skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div class="skeleton-btn"></div>
      </div>
    `,
    )
    .join('');
}

/**
 * Renders individual dealer card
 * @param {Object} dealer Dealer data object
 * @returns {Element} Card DOM element
 */
function createDealerCard(dealer) {
  const card = document.createElement('div');
  card.className = 'dealers-card';
  card.dataset.dealerId = dealer.dealerId;
  card.dataset.city = dealer.city;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${dealer.lat},${dealer.lng}`;

  card.innerHTML = `
    <div class="dealers-card-header">
      <span class="dealers-badge">Authorized Dealer</span>
      <span class="dealers-id">${dealer.dealerId}</span>
    </div>
    <h3 class="dealers-name">${dealer.name}</h3>
    <div class="dealers-info-list">
      <div class="dealers-info-item">
        <svg class="dealers-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span>${dealer.city} - ${dealer.pin}</span>
      </div>
      <div class="dealers-info-item">
        <svg class="dealers-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <a href="tel:${dealer.phone}" class="dealers-phone">${dealer.phone}</a>
      </div>
    </div>
    <div class="dealers-card-actions">
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="dealers-btn-secondary">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Directions
      </a>
      <button type="button" class="dealers-btn-primary book-drive-btn">
        Book Test Drive
      </button>
    </div>
  `;

  const bookBtn = card.querySelector('.book-drive-btn');
  bookBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('select-dealer', { detail: dealer }));
    window.dispatchEvent(new CustomEvent('open-lead-form'));
  });

  return card;
}

/**
 * Main block decorator
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const apiUrl = getApiEndpoint('dealers', block);

  const container = document.createElement('div');
  container.className = 'dealers-container';
  moveInstrumentation(block, container);

  const header = document.createElement('div');
  header.className = 'dealers-header';
  header.innerHTML = `
    <div class="dealers-title-wrap">
      <h2 class="dealers-title">Find a Dealer Near You</h2>
      <p class="dealers-subtitle">Locate authorized dealerships for test drives, pricing, and support.</p>
    </div>
    <div class="dealers-controls">
      <div class="dealers-search-wrap">
        <svg class="dealers-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="dealers-search-input" placeholder="Search by name, city, or PIN..." />
      </div>
      <select class="dealers-city-filter">
        <option value="">All Cities</option>
      </select>
    </div>
  `;

  const grid = document.createElement('div');
  grid.className = 'dealers-grid';
  grid.innerHTML = renderSkeletons();

  container.append(header, grid);
  block.replaceChildren(container);

  const searchInput = header.querySelector('.dealers-search-input');
  const cityFilter = header.querySelector('.dealers-city-filter');

  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    const json = await resp.json();
    const dealers = json.data || [];

    // Populate city dropdown options dynamically
    const cities = [...new Set(dealers.map((d) => d.city))].sort();
    cities.forEach((city) => {
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      cityFilter.appendChild(opt);
    });

    const renderGrid = () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const selectedCity = cityFilter.value;

      const filtered = dealers.filter((d) => {
        const matchesCity = !selectedCity || d.city === selectedCity;
        const matchesSearch = !searchTerm
          || d.name.toLowerCase().includes(searchTerm)
          || d.city.toLowerCase().includes(searchTerm)
          || String(d.pin).includes(searchTerm);
        return matchesCity && matchesSearch;
      });

      grid.innerHTML = '';
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="dealers-empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4m0 4h.01"/>
            </svg>
            <h3>No dealers found</h3>
            <p>Try adjusting your search query or city selection.</p>
          </div>
        `;
        return;
      }

      filtered.forEach((dealer) => {
        grid.appendChild(createDealerCard(dealer));
      });
    };

    searchInput.addEventListener('input', renderGrid);
    cityFilter.addEventListener('change', renderGrid);
    renderGrid();
  } catch (err) {
    grid.innerHTML = `
      <div class="dealers-error-state">
        <p>Failed to load dealer locator data. Please try again later.</p>
      </div>
    `;
  }
}
