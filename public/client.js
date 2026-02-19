let token = localStorage.getItem('token') || '';
let me = null;
let lastMenusForOrder = [];
let myOrdersCache = [];
const reviewedOrderIds = new Set();

const clientUserChip = document.querySelector('#client-user-chip');
const menusContainer = document.querySelector('#client-menus');
const orderForm = document.querySelector('#order-form');
const orderMenuSelect = document.querySelector('#order-form [name="menuId"]');
const orderEstimate = document.querySelector('#order-estimate');
const orderResult = document.querySelector('#order-result');
const peopleCountInput = document.querySelector('#order-form [name="peopleCount"]');
const cityInput = document.querySelector('#order-form [name="eventCity"]');
const orderModal = document.querySelector('#client-order-modal');
const orderModalSubtitle = document.querySelector('#client-order-subtitle');
const closeOrderModalBtn = document.querySelector('#close-client-order-modal');
const closeOrderModalTargets = Array.from(document.querySelectorAll('[data-close-client-order-modal]'));
const orderSuccessModal = document.querySelector('#client-order-success-modal');
const orderSuccessMessage = document.querySelector('#client-order-success-message');
const closeOrderSuccessModalBtn = document.querySelector('#close-client-order-success-modal');
const closeOrderSuccessTargets = Array.from(document.querySelectorAll('[data-close-client-order-success-modal]'));
const orderSuccessHomeBtn = document.querySelector('#client-order-success-home-btn');
const signatureCards = Array.from(document.querySelectorAll('.client-signature-card'));
const reviewForm = document.querySelector('#review-form');
const reviewOrderSelect = document.querySelector('#review-order-id');
const reviewStatus = document.querySelector('#review-status');
const publicReviewsList = document.querySelector('#public-reviews-list');
const themeFilterSelect = document.querySelector('#f-theme');
const baseThemeValues = new Set(
  Array.from(themeFilterSelect?.options || [])
    .map((option) => String(option.value || '').trim().toLowerCase())
    .filter(Boolean)
);
let closeOrderModalTimer = null;
let closeOrderSuccessModalTimer = null;
let orderSuccessRedirectTimer = null;
let orderEstimateRequestId = 0;
let cityEstimateTimer = null;
const deliveryEstimateCache = new Map();

const BORDEAUX_COORDS = { lat: 44.8378, lon: -0.5792 };
const CITY_COORDS = {
  bordeaux: BORDEAUX_COORDS,
  merignac: { lat: 44.8424, lon: -0.6458 },
  pessac: { lat: 44.8067, lon: -0.6324 },
  talence: { lat: 44.8026, lon: -0.5893 },
  begles: { lat: 44.8086, lon: -0.5508 },
  cenon: { lat: 44.8587, lon: -0.5316 },
  floirac: { lat: 44.8346, lon: -0.5212 },
  eysines: { lat: 44.8835, lon: -0.6529 },
  bruges: { lat: 44.884, lon: -0.6132 },
  libourne: { lat: 44.9145, lon: -0.2418 },
  arcachon: { lat: 44.6525, lon: -1.1661 },
  paris: { lat: 48.8566, lon: 2.3522 },
  lyon: { lat: 45.764, lon: 4.8357 },
  marseille: { lat: 43.2965, lon: 5.3698 },
  toulouse: { lat: 43.6047, lon: 1.4442 },
  nantes: { lat: 47.2184, lon: -1.5536 },
  lille: { lat: 50.6292, lon: 3.0573 },
  strasbourg: { lat: 48.5734, lon: 7.7521 },
  rennes: { lat: 48.1173, lon: -1.6778 },
  nice: { lat: 43.7102, lon: 7.262 },
  montpellier: { lat: 43.6119, lon: 3.8772 },
  amiens: { lat: 49.8942, lon: 2.2958 },
  nimes: { lat: 43.8367, lon: 4.36 },
  reims: { lat: 49.2583, lon: 4.0317 },
  'saint etienne': { lat: 45.4397, lon: 4.3872 },
  toulon: { lat: 43.1242, lon: 5.928 },
  grenoble: { lat: 45.1885, lon: 5.7245 },
  dijon: { lat: 47.322, lon: 5.0415 },
  angers: { lat: 47.4784, lon: -0.5632 },
  villeurbanne: { lat: 45.766, lon: 4.88 },
  'le mans': { lat: 48.0061, lon: 0.1996 },
  'aix en provence': { lat: 43.5297, lon: 5.4474 },
  brest: { lat: 48.3904, lon: -4.4861 },
  'clermont ferrand': { lat: 45.7772, lon: 3.087 },
  limoges: { lat: 45.8336, lon: 1.2611 },
  tours: { lat: 47.3941, lon: 0.6848 },
  metz: { lat: 49.1193, lon: 6.1757 },
  besancon: { lat: 47.2378, lon: 6.0241 },
  perpignan: { lat: 42.6887, lon: 2.8948 },
  orleans: { lat: 47.9029, lon: 1.9093 },
  mulhouse: { lat: 47.7508, lon: 7.3359 },
  rouen: { lat: 49.4431, lon: 1.0993 },
  caen: { lat: 49.1829, lon: -0.3707 },
  nancy: { lat: 48.6921, lon: 6.1844 },
  argenteuil: { lat: 48.9472, lon: 2.2467 },
  montreuil: { lat: 48.8638, lon: 2.4485 },
  roubaix: { lat: 50.6927, lon: 3.1778 },
  avignon: { lat: 43.9493, lon: 4.8055 },
  poitiers: { lat: 46.5802, lon: 0.3404 },
  dunkerque: { lat: 51.0344, lon: 2.3768 },
  tourcoing: { lat: 50.7239, lon: 3.1612 },
  'asnieres sur seine': { lat: 48.9109, lon: 2.2887 },
  courbevoie: { lat: 48.8973, lon: 2.2525 },
  versailles: { lat: 48.8049, lon: 2.1204 },
  pau: { lat: 43.2951, lon: -0.3708 },
  'la rochelle': { lat: 46.1603, lon: -1.1511 },
  annecy: { lat: 45.8992, lon: 6.1294 },
  chambery: { lat: 45.5646, lon: 5.9178 },
  valence: { lat: 44.9334, lon: 4.8924 },
  vannes: { lat: 47.6582, lon: -2.7608 },
  quimper: { lat: 47.9975, lon: -4.0979 },
  bayonne: { lat: 43.4929, lon: -1.4748 },
  colmar: { lat: 48.079, lon: 7.3585 },
  'saint denis': { lat: 48.9362, lon: 2.3574 }
};

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur API');
  return data;
}

function formToObject(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

function dishTypeLabel(type) {
  if (type === 'starter') return 'Entrees';
  if (type === 'main') return 'Plats';
  return 'Desserts';
}

const MENU_IMAGES = {
  noel: [
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80'
  ],
  paques: [
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80'
  ],
  vegan: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=80'
  ],
  vegetarien: [
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'
  ],
  classique: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=1200&q=80'
  ],
  evenement: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  ],
  defaut: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80'
  ]
};

function menuImageFromLegacyUrl(rawUrl, menu) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();

  if (lower.includes('/images/menu-noel.svg') || lower.includes('photo-1514516345957') || lower.includes('5638732')) return MENU_IMAGES.noel[0];
  if (lower.includes('/images/menu-paques.svg')) return MENU_IMAGES.paques[0];
  if (lower.includes('/images/menu-vegan.svg') || lower.includes('photo-1546069901') || lower.includes('1640777')) return MENU_IMAGES.vegan[0];
  if (lower.includes('/images/menu-vegetarien.svg')) return MENU_IMAGES.vegetarien[0];
  if (lower.includes('/images/menu-classique.svg') || lower.includes('1279330')) return MENU_IMAGES.classique[0];
  if (lower.includes('/images/menu-evenement.svg')) return MENU_IMAGES.evenement[0];
  if (lower.includes('/images/menu-default.svg')) return MENU_IMAGES.defaut[0];

  if (raw.startsWith('/images/')) return `.${raw}`;
  if (raw.startsWith('./images/')) return raw;

  const themeText = `${menu?.theme || ''} ${menu?.diet || ''} ${menu?.title || ''}`.toLowerCase();
  if (themeText.includes('noel')) return MENU_IMAGES.noel[0];
  if (themeText.includes('paques') || themeText.includes('printemps')) return MENU_IMAGES.paques[0];
  if (themeText.includes('vegan')) return MENU_IMAGES.vegan[0];
  if (themeText.includes('vegetarien')) return MENU_IMAGES.vegetarien[0];
  if (themeText.includes('classique')) return MENU_IMAGES.classique[0];
  if (themeText.includes('evenement')) return MENU_IMAGES.evenement[0];

  return raw;
}

function menuImageKeywords(menu) {
  const text = `${menu.theme || ''} ${menu.diet || ''} ${menu.title || ''}`.toLowerCase();
  if (text.includes('noel')) return MENU_IMAGES.noel;
  if (text.includes('paques') || text.includes('printemps')) return MENU_IMAGES.paques;
  if (text.includes('vegan')) return MENU_IMAGES.vegan;
  if (text.includes('vegetarien')) return MENU_IMAGES.vegetarien;
  if (text.includes('classique')) return MENU_IMAGES.classique;
  if (text.includes('evenement')) return MENU_IMAGES.evenement;
  return MENU_IMAGES.defaut;
}

function buildMenuGallery(menu) {
  const [img1, img2, img3] = menuImageKeywords(menu);
  const safeFallback = './images/menu-default.svg';
  const main = menuImageFromLegacyUrl(menu.image_url, menu) || img1;
  const fallbackA = img2;
  const fallbackB = img3;

  return `
    <div class="menu-gallery">
      <img src="${main}" alt="${menu.title}" loading="lazy" onerror="this.onerror=null;this.src='${safeFallback}'" />
      <img src="${fallbackA}" alt="Presentation traiteur" loading="lazy" onerror="this.onerror=null;this.src='${safeFallback}'" />
      <img src="${fallbackB}" alt="Buffet evenementiel" loading="lazy" onerror="this.onerror=null;this.src='${safeFallback}'" />
    </div>
  `;
}

function renderCourseList(dishes, courseType) {
  const filtered = dishes.filter((dish) => dish.course_type === courseType);
  if (!filtered.length) return '<li>Non renseigne</li>';

  return filtered
    .map((dish) => `<li>${dish.name}</li>`)
    .join('');
}

function getAllergensSummary(dishes) {
  const values = new Set();
  for (const dish of dishes) {
    if (!dish.allergens) continue;
    for (const part of dish.allergens.split(',')) {
      const name = part.trim();
      if (name) values.add(name);
    }
  }
  return values.size ? [...values].join(', ') : 'sans allergene';
}

function formatEur(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} EUR`;
  return `${num.toFixed(2)} EUR`;
}

function formatDateShort(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function normalizeCityName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusKm * c;
}

function estimateDistanceKmFromCity(city) {
  const normalized = normalizeCityName(city);
  if (!normalized || normalized === 'bordeaux') return 0;
  const coords = CITY_COORDS[normalized];
  if (!coords) return 20;
  return haversineKm(BORDEAUX_COORDS, coords);
}

function syncThemeFilterOptions(menus) {
  if (!themeFilterSelect) return;
  const selectedTheme = themeFilterSelect.value;
  const extras = [];

  for (const menu of menus) {
    const theme = String(menu?.theme || '').trim();
    if (!theme) continue;
    const key = theme.toLowerCase();
    if (baseThemeValues.has(key)) continue;
    baseThemeValues.add(key);
    extras.push(theme);
  }

  extras
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
    .forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme;
      themeFilterSelect.appendChild(option);
    });

  if (selectedTheme) themeFilterSelect.value = selectedTheme;
}

async function loadThemeFilterOptions() {
  if (!themeFilterSelect) return;
  try {
    const data = await api('/api/menus');
    syncThemeFilterOptions(data.menus || []);
  } catch {}
}

function starsFromRating(value) {
  const rating = Math.max(1, Math.min(5, Number(value) || 0));
  if (!rating) return '';
  return `${'*'.repeat(rating)}${'-'.repeat(5 - rating)}`;
}

function renderReviewOrderOptions() {
  if (!reviewOrderSelect) return;
  const reviewableOrders = myOrdersCache.filter((order) => order.status === 'finished' && !reviewedOrderIds.has(Number(order.id)));
  if (!reviewableOrders.length) {
    reviewOrderSelect.innerHTML = '<option value="">Aucune commande terminee disponible</option>';
    reviewOrderSelect.disabled = true;
    if (reviewForm) {
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
    }
    return;
  }

  reviewOrderSelect.disabled = false;
  if (reviewForm) {
    const submitBtn = reviewForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
  }

  const options = reviewableOrders.map((order) => {
    return `<option value="${order.id}">Commande #${order.id} - ${order.menu_title} (${formatDateShort(order.event_date)})</option>`;
  });
  reviewOrderSelect.innerHTML = `<option value="">Selectionnez une commande</option>${options.join('')}`;
}

function renderPublicReviews(reviews) {
  if (!publicReviewsList) return;
  if (!reviews.length) {
    publicReviewsList.innerHTML = '<p class="small">Aucun avis publie pour le moment.</p>';
    return;
  }

  publicReviewsList.innerHTML = reviews.map((review) => `
    <article class="client-review-card">
      <div class="client-review-head">
        <strong>${review.author || 'Client'}</strong>
        <span class="client-review-stars">${starsFromRating(review.rating)}</span>
      </div>
      <p>${review.comment || ''}</p>
      <span class="small">${formatDateShort(review.created_at)}</span>
    </article>
  `).join('');
}

async function loadPublicReviews() {
  if (!publicReviewsList) return;
  publicReviewsList.innerHTML = '<p class="small">Chargement des avis...</p>';
  try {
    const data = await api('/api/home/reviews');
    renderPublicReviews(data.reviews || []);
  } catch (err) {
    publicReviewsList.innerHTML = `<p class="small">${err.message}</p>`;
  }
}

function menuDetailCard(menu, dishes) {
  const allergensSummary = getAllergensSummary(dishes);

  return `
    <article class="client-menu-card" data-menu-card-id="${menu.id}">
      <h3>${menu.title}</h3>
      ${buildMenuGallery(menu)}

      <p class="menu-description">${menu.description}</p>

      <div class="menu-quick-grid">
        <p><strong>Theme:</strong> ${menu.theme}</p>
        <p><strong>Regime:</strong> ${menu.diet}</p>
        <p><strong>Min personnes:</strong> ${menu.min_people}</p>
        <p><strong>Prix min:</strong> ${formatEur(menu.min_price)}</p>
        <p><strong>Stock disponible:</strong> ${menu.stock}</p>
      </div>

      <div class="menu-actions">
        <button type="button" data-order-menu-id="${menu.id}">Commander ce menu</button>
      </div>

      <details class="menu-details-toggle">
        <summary>Voir details du menu</summary>
        <div class="menu-details-body">
          <div class="menu-course-columns">
            <div>
              <h4>${dishTypeLabel('starter')}</h4>
              <ul>${renderCourseList(dishes, 'starter')}</ul>
            </div>
            <div>
              <h4>${dishTypeLabel('main')}</h4>
              <ul>${renderCourseList(dishes, 'main')}</ul>
            </div>
            <div>
              <h4>${dishTypeLabel('dessert')}</h4>
              <ul>${renderCourseList(dishes, 'dessert')}</ul>
            </div>
          </div>
          <p><strong>Allergenes possibles:</strong> ${allergensSummary}</p>
          <p class="menu-conditions"><strong>Conditions:</strong> ${menu.conditions_text}</p>
          <p class="small">Note: une entree, un plat ou un dessert peuvent etre reutilises dans plusieurs menus.</p>
        </div>
      </details>
    </article>
  `;
}

function highlightSelectedMenuCard(menuId) {
  const selected = String(menuId || '').trim();
  document.querySelectorAll('.client-menu-card').forEach((card) => {
    const cardId = card.getAttribute('data-menu-card-id');
    card.classList.toggle('selected-for-order', Boolean(selected) && String(cardId) === selected);
  });
}

function renderOrderMenuOptions(menus, selectedId = '') {
  if (!orderMenuSelect) return;
  const selected = String(selectedId || '');
  const options = menus.map((menu) => {
    const isSelected = String(menu.id) === selected ? ' selected' : '';
    return `<option value="${menu.id}"${isSelected}>${menu.title} (${menu.min_price} EUR - stock ${menu.stock})</option>`;
  });
  orderMenuSelect.innerHTML = `<option value="">Choisir un menu</option>${options.join('')}`;
}

function selectedMenuForOrder() {
  const selectedId = Number(orderMenuSelect?.value || 0);
  if (!selectedId) return null;
  return lastMenusForOrder.find((menu) => Number(menu.id) === selectedId) || null;
}

function computeMenuEstimate(menu, peopleCount) {
  const minPeople = Math.max(1, Number(menu?.min_people) || 1);
  const minPrice = Number(menu?.min_price) || 0;
  const safePeople = Math.max(minPeople, peopleCount);
  let menuPrice = (minPrice / minPeople) * safePeople;
  if (safePeople >= minPeople + 5) menuPrice *= 0.9;
  return Number(menuPrice.toFixed(2));
}

async function computeDeliveryEstimate(city) {
  const normalized = normalizeCityName(city);
  if (!normalized) {
    return { distanceKm: 0, price: 0, needsCity: true };
  }
  if (deliveryEstimateCache.has(normalized)) {
    return { ...deliveryEstimateCache.get(normalized), needsCity: false };
  }

  try {
    const data = await api(`/api/delivery-estimate?city=${encodeURIComponent(city)}`);
    const distanceKm = Number(data.distanceKm || 0);
    const price = Number(data.deliveryPrice || 0);
    const result = {
      distanceKm: Number(distanceKm.toFixed(1)),
      price: Number(price.toFixed(2))
    };
    deliveryEstimateCache.set(normalized, result);
    return { ...result, needsCity: false };
  } catch {
    const fallbackDistanceKm = estimateDistanceKmFromCity(city);
    const fallbackPrice = Number((5 + Math.max(0, fallbackDistanceKm) * 0.59).toFixed(2));
    return { distanceKm: Number(fallbackDistanceKm.toFixed(1)), price: fallbackPrice, needsCity: false };
  }
}

async function updateOrderEstimate() {
  if (!orderEstimate) return;
  const menu = selectedMenuForOrder();
  if (!menu) {
    orderEstimate.textContent = 'Estimation: selectionnez un menu puis renseignez le nombre de personnes.';
    return;
  }

  const peopleCount = Number(peopleCountInput?.value || 0);
  const city = String(cityInput?.value || '');

  if (!Number.isFinite(peopleCount) || peopleCount <= 0) {
    orderEstimate.textContent = `Estimation pour ${menu.title}: renseignez le nombre de personnes.`;
    return;
  }

  const menuPrice = computeMenuEstimate(menu, peopleCount);
  const requestId = ++orderEstimateRequestId;
  orderEstimate.textContent = `Estimation pour ${menu.title}: calcul de la livraison en cours...`;
  const delivery = await computeDeliveryEstimate(city);
  if (requestId !== orderEstimateRequestId) return;
  if (delivery.needsCity) {
    orderEstimate.textContent = `Estimation pour ${menu.title}: renseignez la ville pour calculer la livraison.`;
    return;
  }
  const deliveryPrice = delivery.price;
  const totalPrice = Number((menuPrice + deliveryPrice).toFixed(2));
  const distanceInfo = delivery.distanceKm > 0 ? `, distance estimee ${delivery.distanceKm} km depuis Bordeaux` : ', ville de prestation a Bordeaux';
  orderEstimate.textContent = `Estimation: ${formatEur(totalPrice)} (menu ${formatEur(menuPrice)} + livraison ${formatEur(deliveryPrice)}${distanceInfo})`;
}

function updateOrderModalSubtitle() {
  if (!orderModalSubtitle) return;
  const menu = selectedMenuForOrder();
  if (!menu) {
    orderModalSubtitle.textContent = 'Renseignez les informations de livraison.';
    return;
  }

  orderModalSubtitle.textContent = `${menu.title} - Prix minimum ${formatEur(menu.min_price)} - Stock ${menu.stock}`;
}

function openOrderModal(preselectedMenuId = '') {
  if (!orderModal) return;

  if (closeOrderModalTimer) {
    clearTimeout(closeOrderModalTimer);
    closeOrderModalTimer = null;
  }

  if (preselectedMenuId && orderMenuSelect) {
    const target = String(preselectedMenuId);
    const inList = lastMenusForOrder.some((menu) => String(menu.id) === target);
    if (!inList) {
      const fromCard = { id: target, title: `Menu #${target}`, min_price: '-', stock: '-' };
      renderOrderMenuOptions([fromCard, ...lastMenusForOrder], target);
    } else {
      orderMenuSelect.value = target;
    }
    highlightSelectedMenuCard(target);
  }

  orderModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => orderModal.classList.add('is-visible'));

  if (orderResult) orderResult.textContent = '';
  updateOrderModalSubtitle();
  updateOrderEstimate();
}

function closeOrderModal() {
  if (!orderModal || orderModal.hidden) return;
  orderModal.classList.remove('is-visible');

  if (closeOrderModalTimer) clearTimeout(closeOrderModalTimer);
  closeOrderModalTimer = setTimeout(() => {
    orderModal.hidden = true;
    document.body.classList.remove('modal-open');
  }, 180);
}

function goToClientHome() {
  window.location.href = '/client.html';
}

function openOrderSuccessModal(message) {
  if (!orderSuccessModal) {
    goToClientHome();
    return;
  }

  if (closeOrderSuccessModalTimer) {
    clearTimeout(closeOrderSuccessModalTimer);
    closeOrderSuccessModalTimer = null;
  }
  if (orderSuccessRedirectTimer) {
    clearTimeout(orderSuccessRedirectTimer);
    orderSuccessRedirectTimer = null;
  }

  if (orderSuccessMessage) {
    orderSuccessMessage.textContent = message || 'Commande enregistree avec succes.';
  }

  orderSuccessModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => orderSuccessModal.classList.add('is-visible'));

  orderSuccessRedirectTimer = setTimeout(() => {
    goToClientHome();
  }, 1800);
}

function closeOrderSuccessModal({ redirect = false } = {}) {
  if (!orderSuccessModal || orderSuccessModal.hidden) {
    if (redirect) goToClientHome();
    return;
  }

  orderSuccessModal.classList.remove('is-visible');

  if (closeOrderSuccessModalTimer) clearTimeout(closeOrderSuccessModalTimer);
  closeOrderSuccessModalTimer = setTimeout(() => {
    orderSuccessModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (redirect) goToClientHome();
  }, 180);
}

function initSignatureCardsRotation() {
  if (signatureCards.length < 2) return;

  let activeIndex = 0;
  let intervalId = null;

  function renderActiveCard() {
    signatureCards.forEach((card, index) => {
      card.classList.toggle('is-active', index === activeIndex);
    });
  }

  function startRotation() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      activeIndex = (activeIndex + 1) % signatureCards.length;
      renderActiveCard();
    }, 3200);
  }

  function stopRotation() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  renderActiveCard();
  startRotation();

  signatureCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      activeIndex = index;
      renderActiveCard();
      stopRotation();
    });
    card.addEventListener('mouseleave', startRotation);
    card.addEventListener('focusin', () => {
      activeIndex = index;
      renderActiveCard();
      stopRotation();
    });
    card.addEventListener('focusout', startRotation);
  });
}

async function initClientUser() {
  if (!token) {
    window.location.href = '/';
    return;
  }

  try {
    const data = await api('/api/auth/me');
    me = data.user;
    if (me.role !== 'user') {
      window.location.href = me.role === 'admin' || me.role === 'employee' ? '/staff.html' : '/';
      return;
    }
    clientUserChip.textContent = `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.email;
  } catch {
    logout();
  }
}

function buildMenuParams() {
  const params = new URLSearchParams();
  const maxPrice = document.querySelector('#f-max-price').value;
  const minPrice = document.querySelector('#f-min-price').value;
  const maxRangePrice = document.querySelector('#f-max-range-price').value;
  const theme = document.querySelector('#f-theme').value;
  const diet = document.querySelector('#f-diet').value;
  const minPeople = document.querySelector('#f-min-people').value;

  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minPrice && maxRangePrice) {
    params.set('minPrice', minPrice);
    params.set('maxRangePrice', maxRangePrice);
  }
  if (theme) params.set('theme', theme);
  if (diet) params.set('diet', diet);
  if (minPeople) params.set('minPeople', minPeople);

  return params;
}

async function loadDetailedMenus() {
  menusContainer.innerHTML = '<p class="small">Chargement des menus...</p>';
  try {
    const params = buildMenuParams();
    const data = await api(`/api/menus?${params.toString()}`);
    const menus = data.menus || [];
    syncThemeFilterOptions(menus);
    lastMenusForOrder = menus;
    renderOrderMenuOptions(menus, orderMenuSelect?.value || '');
    updateOrderModalSubtitle();
    updateOrderEstimate();

    if (!menus.length) {
      menusContainer.innerHTML = '<p class="small">Aucun menu ne correspond aux filtres.</p>';
      return;
    }

    const details = await Promise.all(
      menus.map(async (menu) => {
        const d = await api(`/api/menus/${menu.id}`);
        return { menu: d.menu, dishes: d.dishes || [] };
      })
    );

    menusContainer.innerHTML = details.map((entry) => menuDetailCard(entry.menu, entry.dishes)).join('');
    highlightSelectedMenuCard(orderMenuSelect?.value || '');
  } catch (err) {
    menusContainer.innerHTML = `<p class="small">${err.message}</p>`;
  }
}

function orderBadge(status) {
  return `<span class="${statusClass(status)}">${statusLabel(status)}</span>`;
}

function statusLabel(status) {
  switch (status) {
    case 'pending': return 'En attente';
    case 'accepted': return 'Acceptee';
    case 'preparing': return 'En preparation';
    case 'delivering': return 'En livraison';
    case 'delivered': return 'Livree';
    case 'finished': return 'Terminee';
    case 'cancelled': return 'Annulee';
    case 'awaiting_material_return': return 'Retour materiel';
    default: return String(status || '');
  }
}

function statusClass(status) {
  switch (status) {
    case 'pending': return 'badge badge-pending';
    case 'accepted': return 'badge badge-accepted';
    case 'preparing': return 'badge badge-preparing';
    case 'delivering': return 'badge badge-delivering';
    case 'delivered': return 'badge badge-delivered';
    case 'finished': return 'badge badge-finished';
    case 'cancelled': return 'badge badge-cancelled';
    case 'awaiting_material_return': return 'badge badge-awaiting';
    default: return 'badge';
  }
}

async function loadMyOrders() {
  const box = document.querySelector('#my-orders');
  try {
    const data = await api('/api/users/me/orders');
    const orders = data.orders || [];
    myOrdersCache = orders;
    renderReviewOrderOptions();
    if (!orders.length) {
      box.innerHTML = '<p class="small">Aucune commande pour le moment.</p>';
      return;
    }

    box.innerHTML = orders.map((order) => `
      <article class="employee-order-card">
        <div class="employee-order-head">
          <h4>Commande #${order.id}</h4>
          ${orderBadge(order.status)}
        </div>
        <p><strong>Menu:</strong> ${order.menu_title}</p>
        <p><strong>Total:</strong> ${formatEur(order.total_price)}</p>
        <p><strong>Date evenement:</strong> ${formatDateShort(order.event_date)}</p>
        <p><strong>Ville:</strong> ${order.event_city}</p>
      </article>
    `).join('');
  } catch (err) {
    myOrdersCache = [];
    renderReviewOrderOptions();
    box.innerHTML = `<p class="small">${err.message}</p>`;
  }
}

document.querySelector('#client-menus').addEventListener('click', (e) => {
  const button = e.target.closest('[data-order-menu-id]');
  if (!button) return;
  const menuId = button.getAttribute('data-order-menu-id');
  openOrderModal(menuId);
  orderMenuSelect?.focus();
});

orderMenuSelect?.addEventListener('change', () => {
  highlightSelectedMenuCard(orderMenuSelect.value);
  updateOrderModalSubtitle();
  updateOrderEstimate();
});

peopleCountInput?.addEventListener('input', updateOrderEstimate);
cityInput?.addEventListener('input', () => {
  if (cityEstimateTimer) clearTimeout(cityEstimateTimer);
  cityEstimateTimer = setTimeout(() => {
    updateOrderEstimate();
  }, 220);
});

orderForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const raw = formToObject(e.target);
    const body = {
      ...raw,
      menuId: Number(raw.menuId),
      peopleCount: Number(raw.peopleCount),
      materialLoaned: !!e.target.querySelector('[name="materialLoaned"]').checked
    };
    const data = await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
    const successText = `Commande #${data.orderId} validee - Total: ${formatEur(data.totalPrice)} (menu ${formatEur(data.menuPrice)} + livraison ${formatEur(data.deliveryPrice)})`;
    if (orderResult) {
      orderResult.textContent = successText;
    }
    closeOrderModal();
    openOrderSuccessModal(successText);
    e.target.reset();
    if (orderMenuSelect) orderMenuSelect.value = '';
    highlightSelectedMenuCard('');
    updateOrderModalSubtitle();
    updateOrderEstimate();
    Promise.all([loadDetailedMenus(), loadMyOrders()]).catch(() => {});
  } catch (err) {
    if (orderResult) orderResult.textContent = err.message;
  }
});

reviewForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!reviewStatus) return;
  reviewStatus.textContent = '';
  try {
    const raw = formToObject(e.target);
    const body = {
      orderId: Number(raw.orderId),
      rating: Number(raw.rating),
      comment: String(raw.comment || '').trim()
    };
    if (!body.orderId || !body.rating || !body.comment) {
      reviewStatus.textContent = 'Merci de renseigner la commande, la note et le commentaire.';
      return;
    }

    await api('/api/reviews', { method: 'POST', body: JSON.stringify(body) });
    reviewStatus.textContent = 'Avis enregistre. Il sera visible apres validation de l equipe.';
    reviewedOrderIds.add(body.orderId);
    e.target.reset();
    renderReviewOrderOptions();
    await loadPublicReviews();
  } catch (err) {
    reviewStatus.textContent = err.message;
  }
});

closeOrderModalBtn?.addEventListener('click', closeOrderModal);
for (const target of closeOrderModalTargets) {
  target.addEventListener('click', closeOrderModal);
}
closeOrderSuccessModalBtn?.addEventListener('click', () => closeOrderSuccessModal({ redirect: true }));
for (const target of closeOrderSuccessTargets) {
  target.addEventListener('click', () => closeOrderSuccessModal({ redirect: true }));
}
orderSuccessHomeBtn?.addEventListener('click', () => closeOrderSuccessModal({ redirect: true }));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !orderModal?.hidden) closeOrderModal();
  if (event.key === 'Escape' && !orderSuccessModal?.hidden) closeOrderSuccessModal({ redirect: true });
});

document.querySelector('#logout-btn').addEventListener('click', logout);

for (const id of ['#f-max-price', '#f-min-price', '#f-max-range-price', '#f-theme', '#f-diet', '#f-min-people']) {
  const input = document.querySelector(id);
  if (!input) continue;
  const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
  input.addEventListener(eventName, () => loadDetailedMenus());
}

document.querySelector('#reset-filters').addEventListener('click', () => {
  for (const id of ['#f-max-price', '#f-min-price', '#f-max-range-price', '#f-theme', '#f-diet', '#f-min-people']) {
    const input = document.querySelector(id);
    if (input) input.value = '';
  }
  loadDetailedMenus();
});

await initClientUser();
await loadThemeFilterOptions();
await Promise.all([loadDetailedMenus(), loadMyOrders(), loadPublicReviews()]);
initSignatureCardsRotation();
