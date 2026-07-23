import { moveInstrumentation } from '../../scripts/scripts.js';
import { API_CONFIG, getApiEndpoint } from '../../scripts/config.js';

/**
 * Main block decorator for lead-form
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // Check if block has 'always-show' class or data property
  const isAlwaysShow = block.classList.contains('always-show')
    || block.dataset.alwaysShow === 'true'
    || block.dataset.alwaysShow === 'true';

  // Extract author-provided title/subtitle if present in block HTML
  const authoredTitle = block.querySelector('h1, h2, h3')?.textContent || 'Schedule a Test Drive';
  const authoredSubtitle = block.querySelector('p')?.textContent || 'Choose your preferred dealer and model. Our specialist will contact you shortly.';

  const container = document.createElement('div');
  container.className = isAlwaysShow ? 'lead-form-container' : 'lead-form-modal-overlay hidden';

  moveInstrumentation(block, container);

  container.innerHTML = `
    <div class="lead-form-card">
      <button type="button" class="lead-form-close-btn ${isAlwaysShow ? 'hidden' : ''}" aria-label="Close form">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="lead-form-header">
        <span class="lead-form-badge">Book Your Experience</span>
        <h2 class="lead-form-title">${authoredTitle}</h2>
        <p class="lead-form-subtitle">${authoredSubtitle}</p>
      </div>

      <form class="lead-form-body" novalidate>
        <div class="lead-form-row">
          <div class="lead-form-group">
            <label for="lead-type-select" class="lead-form-label">Request Type</label>
            <select id="lead-type-select" class="lead-form-input" name="leadType" required>
              <option value="testDrive" selected>Test Drive</option>
              <option value="inquiry">Vehicle Inquiry</option>
              <option value="booking">Pre-Booking</option>
              <option value="callback">Request Callback</option>
            </select>
          </div>

          <div class="lead-form-group">
            <label for="lead-phone-input" class="lead-form-label">Phone Number</label>
            <div class="lead-form-phone-wrap">
              <span class="lead-form-phone-prefix">+91</span>
              <input 
                type="tel" 
                id="lead-phone-input" 
                class="lead-form-input phone-input" 
                name="phone" 
                placeholder="9999999999" 
                maxlength="10"
                required 
              />
            </div>
            <span class="lead-form-error-msg" id="phone-error">Please enter a valid 10-digit mobile number</span>
          </div>
        </div>

        <div class="lead-form-row">
          <div class="lead-form-group">
            <label for="lead-city-select" class="lead-form-label">City</label>
            <select id="lead-city-select" class="lead-form-input" name="city" required>
              <option value="">Select City...</option>
            </select>
          </div>

          <div class="lead-form-group">
            <label for="lead-dealer-select" class="lead-form-label">Select Dealership</label>
            <select id="lead-dealer-select" class="lead-form-input" name="dealerId" required>
              <option value="">Select Dealership...</option>
            </select>
          </div>
        </div>

        <div class="lead-form-row">
          <div class="lead-form-group full-width">
            <label for="lead-model-select" class="lead-form-label">Vehicle Model</label>
            <select id="lead-model-select" class="lead-form-input" name="modelId" required>
              <option value="">Select Model...</option>
            </select>
          </div>
        </div>

        <div class="lead-form-group checkbox-group">
          <label class="lead-form-checkbox-label">
            <input type="checkbox" id="lead-consent-check" name="consentGiven" checked required />
            <span class="checkbox-custom"></span>
            <span class="checkbox-text">I consent to being contacted regarding test drive scheduling and product offers.</span>
          </label>
        </div>

        <div class="lead-form-submit-wrap">
          <button type="submit" class="lead-form-submit-btn">
            <span class="btn-text">Confirm Booking Request</span>
            <span class="btn-spinner hidden"></span>
          </button>
        </div>

        <div class="lead-form-alert error-alert hidden" id="lead-form-error"></div>
      </form>

      <div class="lead-form-success hidden" id="lead-form-success">
        <div class="success-icon-wrap">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 class="success-title">Test Drive Request Submitted!</h3>
        <p class="success-text">Thank you! Your request has been recorded. Our team will reach out to confirm your slot.</p>
        
        <div class="success-details">
          <div class="success-detail-row">
            <span>Booking ID:</span>
            <strong id="res-lead-id" class="highlight-code">L-XXXXX</strong>
          </div>
          <div class="success-detail-row">
            <span>Status:</span>
            <span id="res-status" class="success-badge">Created</span>
          </div>
          <div class="success-detail-row">
            <span>Dealer:</span>
            <strong id="res-dealer">---</strong>
          </div>
          <div class="success-detail-row">
            <span>Model:</span>
            <strong id="res-model">---</strong>
          </div>
        </div>

        <button type="button" class="lead-form-reset-btn" id="lead-reset-btn">
          Book Another Test Drive
        </button>
      </div>
    </div>
  `;

  block.replaceChildren(container);

  const form = container.querySelector('.lead-form-body');
  const successBox = container.querySelector('#lead-form-success');
  const errorAlert = container.querySelector('#lead-form-error');
  const citySelect = container.querySelector('#lead-city-select');
  const dealerSelect = container.querySelector('#lead-dealer-select');
  const modelSelect = container.querySelector('#lead-model-select');
  const phoneInput = container.querySelector('#lead-phone-input');
  const phoneError = container.querySelector('#phone-error');
  const submitBtn = container.querySelector('.lead-form-submit-btn');
  const btnSpinner = container.querySelector('.btn-spinner');
  const btnText = container.querySelector('.btn-text');
  const resetBtn = container.querySelector('#lead-reset-btn');
  const closeBtn = container.querySelector('.lead-form-close-btn');

  let dealersList = [];
  let inventoryList = [];

  // Functions to open and close modal
  const openModal = () => {
    if (!isAlwaysShow) {
      container.classList.remove('hidden');
      document.body.classList.add('lead-form-modal-open');
    }
  };

  const closeModal = () => {
    if (!isAlwaysShow) {
      container.classList.add('hidden');
      document.body.classList.remove('lead-form-modal-open');
    }
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close modal when clicking backdrop outside card
  container.addEventListener('click', (e) => {
    if (!isAlwaysShow && e.target === container) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !container.classList.contains('hidden') && !isAlwaysShow) {
      closeModal();
    }
  });

  // Listen to open events from dealers or inventory cards
  window.addEventListener('open-lead-form', () => {
    openModal();
  });

  // Fetch dealers & inventory options dynamically
  const loadFormDropdowns = async () => {
    try {
      const [dealersRes, inventoryRes] = await Promise.allSettled([
        fetch(getApiEndpoint('dealers')),
        fetch(getApiEndpoint('inventory')),
      ]);

      if (dealersRes.status === 'fulfilled' && dealersRes.value.ok) {
        const dJson = await dealersRes.value.json();
        dealersList = dJson.data || [];

        const cities = [...new Set(dealersList.map((d) => d.city))].sort();
        cities.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          citySelect.appendChild(opt);
        });

        const updateDealersForCity = (selectedCity) => {
          dealerSelect.innerHTML = '<option value="">Select Dealership...</option>';
          const filtered = selectedCity
            ? dealersList.filter((d) => d.city === selectedCity)
            : dealersList;
          filtered.forEach((d) => {
            const opt = document.createElement('option');
            opt.value = d.dealerId;
            opt.textContent = `${d.name} (${d.city})`;
            dealerSelect.appendChild(opt);
          });
        };

        citySelect.addEventListener('change', () => {
          updateDealersForCity(citySelect.value);
        });

        updateDealersForCity('');
      }

      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
        const iJson = await inventoryRes.value.json();
        inventoryList = iJson.data || [];

        const uniqueModels = [...new Set(inventoryList.map((i) => i.model))];
        modelSelect.innerHTML = '<option value="">Select Model...</option>';
        uniqueModels.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = `JSW Motors ${m}`;
          modelSelect.appendChild(opt);
        });
      }
    } catch (e) {
      // Fallback defaults if fetch fails
    }
  };

  await loadFormDropdowns();

  // Listen to custom inter-block selection events
  window.addEventListener('select-dealer', (e) => {
    openModal();
    const dealer = e.detail;
    if (dealer) {
      if (dealer.city && citySelect.querySelector(`option[value="${dealer.city}"]`)) {
        citySelect.value = dealer.city;
        citySelect.dispatchEvent(new Event('change'));
      }
      if (dealer.dealerId && dealerSelect.querySelector(`option[value="${dealer.dealerId}"]`)) {
        dealerSelect.value = dealer.dealerId;
      }
      dealerSelect.classList.add('field-highlight');
      setTimeout(() => dealerSelect.classList.remove('field-highlight'), 2000);
    }
  });

  window.addEventListener('select-model', (e) => {
    openModal();
    const modelItem = e.detail;
    if (modelItem && modelItem.model) {
      if (modelSelect.querySelector(`option[value="${modelItem.model}"]`)) {
        modelSelect.value = modelItem.model;
      }
      modelSelect.classList.add('field-highlight');
      setTimeout(() => modelSelect.classList.remove('field-highlight'), 2000);
    }
  });

  // Handle Form Submission
  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    errorAlert.classList.add('hidden');
    phoneError.style.display = 'none';

    const rawPhone = phoneInput.value.trim().replace(/\D/g, '');
    if (rawPhone.length !== 10) {
      phoneError.style.display = 'block';
      phoneInput.focus();
      return;
    }

    const formattedPhone = `+91${rawPhone}`;
    const leadType = container.querySelector('#lead-type-select').value;
    const city = citySelect.value;
    const dealerId = dealerSelect.value;
    const modelId = modelSelect.value;
    const consentGiven = container.querySelector('#lead-consent-check').checked;

    if (!city || !dealerId || !modelId) {
      errorAlert.textContent = 'Please fill out all required fields (City, Dealer, and Model).';
      errorAlert.classList.remove('hidden');
      return;
    }

    const payload = {
      leadType,
      phone: formattedPhone,
      city,
      dealerId,
      modelId,
      consent: {
        consentGiven,
      },
    };

    submitBtn.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Submitting Request...';

    try {
      const leadsApiUrl = getApiEndpoint('leads', block);
      const resp = await fetch(leadsApiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': API_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await resp.json();

      if (resp.ok && resData.data) {
        const dInfo = dealersList.find((d) => d.dealerId === dealerId);
        const dealerName = dInfo ? dInfo.name : dealerId;

        container.querySelector('#res-lead-id').textContent = resData.data.leadId || 'L-SUCCESS';
        container.querySelector('#res-status').textContent = (resData.data.status || 'created').toUpperCase();
        container.querySelector('#res-dealer').textContent = dealerName;
        container.querySelector('#res-model').textContent = `JSW Motors ${modelId}`;

        form.classList.add('hidden');
        successBox.classList.remove('hidden');
      } else {
        throw new Error(resData.message || 'Failed to register lead.');
      }
    } catch (err) {
      errorAlert.textContent = err.message || 'An error occurred while submitting your request. Please try again.';
      errorAlert.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Confirm Booking Request';
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    successBox.classList.add('hidden');
    form.classList.remove('hidden');
  });
}
