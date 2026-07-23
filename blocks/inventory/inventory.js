import { moveInstrumentation } from '../../scripts/scripts.js';
import { getApiEndpoint } from '../../scripts/config.js';

/**
 * Formats numeric price into formatted Indian Currency string
 * @param {number} amount Price number
 * @param {string} currency Currency code
 * @returns {string} Formatted string
 */
function formatPrice(amount, currency = 'INR') {
  if (typeof amount !== 'number') return 'Price on Request';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}

/**
 * Creates skeleton loader markup
 * @returns {string} HTML string
 */
function renderSkeletons() {
  return Array(3)
    .fill(0)
    .map(
      () => `
      <div class="inventory-card skeleton-card">
        <div class="skeleton-media"></div>
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-price"></div>
        <div class="skeleton-btn"></div>
      </div>
    `,
    )
    .join('');
}

/**
 * Creates an individual vehicle inventory card
 * @param {Object} item Inventory vehicle item
 * @returns {Element} Card DOM element
 */
function createInventoryCard(item) {
  const card = document.createElement('div');
  card.className = 'inventory-card';
  card.dataset.variantId = item.variantId;
  card.dataset.model = item.model;
  card.dataset.availability = item.availability;

  const isInStock = item.availability === 'inStock';
  const badgeClass = isInStock ? 'badge-in-stock' : 'badge-limited';
  const badgeText = isInStock ? 'In Stock' : 'Limited Availability';

  // Feature specs based on variant or model
  const isLR = item.variantId && item.variantId.includes('LR');
  const specRange = isLR ? '450 km Range' : '312 km Range';
  const specBattery = isLR ? '50.3 kWh Battery' : '38 kWh Battery';

  card.innerHTML = `
    <div class="inventory-card-image-wrap">
      <div class="inventory-visual-box">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3.1C1.4 11.5 1 12.2 1 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
        <span class="inventory-model-badge">${item.model}</span>
      </div>
      <span class="inventory-status-badge ${badgeClass}">${badgeText}</span>
    </div>

    <div class="inventory-card-content">
      <div class="inventory-title-group">
        <h3 class="inventory-model-name">${item.model}</h3>
        <span class="inventory-variant-name">${item.variant}</span>
      </div>

      <div class="inventory-specs">
        <span class="inventory-spec-tag">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          ${specRange}
        </span>
        <span class="inventory-spec-tag">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="10" rx="2" ry="2"/>
            <line x1="22" y1="11" x2="22" y2="13"/>
          </svg>
          ${specBattery}
        </span>
      </div>

      <div class="inventory-price-group">
        <span class="inventory-price-label">Ex-Showroom Price</span>
        <span class="inventory-price-value">${formatPrice(item.exShowroomPrice, item.currency)}</span>
      </div>

      <div class="inventory-actions">
        <button type="button" class="inventory-btn-primary schedule-drive-btn">
          Schedule Test Drive
        </button>
      </div>
    </div>
  `;

  const driveBtn = card.querySelector('.schedule-drive-btn');
  driveBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('select-model', { detail: item }));
    window.dispatchEvent(new CustomEvent('open-lead-form'));
  });

  return card;
}

/**
 * Main block decorator
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const apiUrl = getApiEndpoint('inventory', block);

  const container = document.createElement('div');
  container.className = 'inventory-container';
  moveInstrumentation(block, container);

  const header = document.createElement('div');
  header.className = 'inventory-header';
  header.innerHTML = `
    <div class="inventory-title-wrap">
      <h2 class="inventory-title">Vehicle Inventory & Pricing</h2>
      <p class="inventory-subtitle">Explore available models, configurations, and immediate delivery stock.</p>
    </div>

    <div class="inventory-controls">
      <div class="inventory-tabs">
        <button type="button" class="inventory-tab active" data-filter="all">All Vehicles</button>
        <button type="button" class="inventory-tab" data-filter="inStock">In Stock</button>
        <button type="button" class="inventory-tab" data-filter="limited">Limited Stock</button>
      </div>
      <div class="inventory-sort-wrap">
        <label for="inventory-sort-select" class="inventory-sort-label">Sort by:</label>
        <select id="inventory-sort-select" class="inventory-sort-select">
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Model Name</option>
        </select>
      </div>
    </div>
  `;

  const grid = document.createElement('div');
  grid.className = 'inventory-grid';
  grid.innerHTML = renderSkeletons();

  container.append(header, grid);
  block.replaceChildren(container);

  const tabs = header.querySelectorAll('.inventory-tab');
  const sortSelect = header.querySelector('.inventory-sort-select');

  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    const json = await resp.json();
    const items = json.data || [];

    let currentFilter = 'all';

    const renderGrid = () => {
      let filtered = items.filter((item) => {
        if (currentFilter === 'all') return true;
        return item.availability === currentFilter;
      });

      const sortVal = sortSelect.value;
      filtered = [...filtered].sort((a, b) => {
        if (sortVal === 'price-asc') return a.exShowroomPrice - b.exShowroomPrice;
        if (sortVal === 'price-desc') return b.exShowroomPrice - a.exShowroomPrice;
        if (sortVal === 'name-asc') return `${a.model} ${a.variant}`.localeCompare(`${b.model} ${b.variant}`);
        return 0;
      });

      grid.innerHTML = '';
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="inventory-empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
            </svg>
            <h3>No inventory matching filter</h3>
            <p>Please select another category or check back soon.</p>
          </div>
        `;
        return;
      }

      filtered.forEach((item) => {
        grid.appendChild(createInventoryCard(item));
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderGrid();
      });
    });

    sortSelect.addEventListener('change', renderGrid);
    renderGrid();
  } catch (err) {
    grid.innerHTML = `
      <div class="inventory-error-state">
        <p>Failed to load vehicle inventory. Please try refreshing.</p>
      </div>
    `;
  }
}
