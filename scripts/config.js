/**
 * Centralized API Configuration for Edge Delivery Services
 */

export const API_CONFIG = {
  dealers: 'https://www.ankanghosh.in/api/static/dealers',
  inventory: 'https://www.ankanghosh.in/api/v2/static/inventory',
  leads: 'https://www.ankanghosh.in/api/static/leads',
  apiKey: '5646edac43d94df2fcbbfbe04973c5349281839b93c9eec1',
};

/**
 * Gets a specific API endpoint URL with optional author override fallback
 * @param {string} key API key ('dealers', 'inventory', 'leads')
 * @param {Element} [block] Optional block element to check for authored override link
 * @returns {string} Endpoint URL
 */
export function getApiEndpoint(key, block) {
  if (block) {
    const customUrlEl = block.querySelector('a');
    if (customUrlEl && customUrlEl.href && customUrlEl.href.includes('http')) {
      return customUrlEl.href;
    }
  }
  return API_CONFIG[key] || '';
}
