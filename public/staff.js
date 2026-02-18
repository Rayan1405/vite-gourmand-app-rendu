let token = localStorage.getItem('token') || '';
let me = null;
let refreshTimer = null;

const staffUserChip = document.querySelector('#staff-user-chip');
const ordersKanbanBoard = document.querySelector('#orders-kanban-board');
const employeeOrdersSummary = document.querySelector('#employee-orders-summary');
const menusResult = document.querySelector('#menus-result');
const menusTableBody = document.querySelector('#menus-table-body');
const openCreateMenuModalBtn = document.querySelector('#open-create-menu-modal');
const menuFormModal = document.querySelector('#menu-form-modal');
const closeMenuModalBtn = document.querySelector('#close-menu-modal');
const menuModalForm = document.querySelector('#menu-modal-form');
const menuFormTitle = document.querySelector('#menu-form-title');
const menuFormSubtitle = document.querySelector('#menu-form-subtitle');
const menuModalSubmitBtn = document.querySelector('#menu-modal-submit-btn');
const menuImagePresetsNode = document.querySelector('#menu-image-presets');
const menuImageFileInput = document.querySelector('#menu-image-file-input');
const menuImageFileBtn = document.querySelector('#menu-image-file-btn');
const menuDeleteModal = document.querySelector('#menu-delete-modal');
const closeMenuDeleteModalBtn = document.querySelector('#close-menu-delete-modal');
const cancelMenuDeleteBtn = document.querySelector('#cancel-menu-delete-btn');
const confirmMenuDeleteBtn = document.querySelector('#confirm-menu-delete-btn');
const menuDeleteMessage = document.querySelector('#menu-delete-message');
const clientsTableBody = document.querySelector('#clients-table-body');
const refreshClientsBtn = document.querySelector('#refresh-clients-btn');
const clientsResult = document.querySelector('#clients-result');
const clientDetailsModal = document.querySelector('#client-details-modal');
const closeClientModalBtn = document.querySelector('#close-client-modal');
const clientDetailsTitle = document.querySelector('#client-details-title');
const clientDetailsMeta = document.querySelector('#client-details-meta');
const clientRecentMenus = document.querySelector('#client-recent-menus');
const clientFavoriteMenus = document.querySelector('#client-favorite-menus');
const clientEditModal = document.querySelector('#client-edit-modal');
const closeClientEditModalBtn = document.querySelector('#close-client-edit-modal');
const clientEditForm = document.querySelector('#client-edit-form');
const orderStatusModal = document.querySelector('#order-status-modal');
const closeOrderModalBtn = document.querySelector('#close-order-modal');
const orderStatusForm = document.querySelector('#order-status-form');
const orderStatusSubtitle = document.querySelector('#order-status-subtitle');
const staffSidebar = document.querySelector('#staff-sidebar');
const sidebarToggle = document.querySelector('#sidebar-toggle');
const sidebarClose = document.querySelector('#sidebar-close');
const sidebarOverlay = document.querySelector('#sidebar-overlay');
const staffViews = document.querySelectorAll('.staff-view');
const metricTotalOrders = document.querySelector('#metric-total-orders');
const metricOngoingOrders = document.querySelector('#metric-ongoing-orders');
const metricDeliveredRevenue = document.querySelector('#metric-delivered-revenue');
const ordersStatusChart = document.querySelector('#orders-status-chart');
const navStaffManagement = document.querySelector('#nav-staff-management');
const navReviews = document.querySelector('#nav-reviews');
const staffUsersTableBody = document.querySelector('#staff-users-table-body');
const openCreateStaffModalBtn = document.querySelector('#open-create-staff-modal');
const staffFormModal = document.querySelector('#staff-form-modal');
const closeStaffModalBtn = document.querySelector('#close-staff-modal');
const staffModalForm = document.querySelector('#staff-modal-form');
const staffFormTitle = document.querySelector('#staff-form-title');
const staffFormSubtitle = document.querySelector('#staff-form-subtitle');
const staffModalSubmitBtn = document.querySelector('#staff-modal-submit-btn');
const staffManagementResult = document.querySelector('#staff-management-result');
const staffDeleteModal = document.querySelector('#staff-delete-modal');
const closeDeleteModalBtn = document.querySelector('#close-delete-modal');
const cancelDeleteBtn = document.querySelector('#cancel-delete-btn');
const confirmDeleteBtn = document.querySelector('#confirm-delete-btn');
const staffDeleteMessage = document.querySelector('#staff-delete-message');
const reviewsTableBody = document.querySelector('#reviews-table-body');
const refreshReviewsBtn = document.querySelector('#refresh-reviews-btn');
const reviewsResult = document.querySelector('#reviews-result');

let internalUsers = [];
let staffModalMode = 'create';
let pendingDeleteUserId = '';
let menusCache = [];
let menuModalMode = 'create';
let pendingDeleteMenuId = '';
let clientsCache = [];
let ordersCache = [];
let draggedOrderId = '';
let reviewsCache = [];

const MENU_IMAGE_BASE_OPTIONS = [
  {
    url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Noel'
  },
  {
    url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Paques'
  },
  {
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Vegan'
  },
  {
    url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Vegetarien'
  },
  {
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Classique'
  },
  {
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    label: 'Menu Evenement'
  }
];
let menuImageOptions = MENU_IMAGE_BASE_OPTIONS.map((item) => ({ ...item }));
const MENU_MAX_IMAGE_DATA_URL_LENGTH = 60000;

function userRole() {
  return String(me?.role || '').toLowerCase();
}

function isAdminUser() {
  return userRole() === 'admin';
}

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

function statusDisplayLabel(status) {
  switch (status) {
    case 'pending': return 'En attente';
    case 'accepted': return 'Acceptee';
    case 'preparing': return 'En preparation';
    case 'delivering': return 'En livraison';
    case 'delivered': return 'Livree';
    case 'awaiting_material_return': return 'Retour materiel';
    case 'finished': return 'Terminee';
    case 'cancelled': return 'Annulee';
    default: return String(status || '');
  }
}

function orderClientDisplayName(order) {
  const first = String(order?.client_first_name || '').trim();
  const last = String(order?.client_last_name || '').trim();
  const fullName = `${first} ${last}`.trim();
  return fullName || 'Nom non renseigne';
}

function formatDateTimeFr(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function reviewStars(rating) {
  const safe = Math.max(1, Math.min(5, Number(rating) || 0));
  return `${'*'.repeat(safe)}${'-'.repeat(5 - safe)}`;
}

function reviewStatusBadge(isApproved) {
  if (Number(isApproved) === 1) return '<span class="review-state-badge approved">Valide</span>';
  return '<span class="review-state-badge pending">En attente</span>';
}

function clientNameFromReview(review) {
  const first = String(review?.client_first_name || '').trim();
  const last = String(review?.client_last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || 'Client';
}

function materialLoanedState(order) {
  const value = order?.has_material_loaned ?? order?.material_loaned ?? order?.materialLoaned;
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'oui', 'yes'].includes(normalized)) return true;
    if (['0', 'false', 'non', 'no'].includes(normalized)) return false;
    return null;
  }
  if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    return Number(value.data[0] || 0) === 1;
  }
  return null;
}

function isOrderInOngoing(status) {
  return ['pending', 'accepted', 'preparing', 'delivering', 'awaiting_material_return'].includes(status);
}

function renderOrdersKanban() {
  if (!ordersKanbanBoard) return;

  const lists = ordersKanbanBoard.querySelectorAll('.orders-kanban-list');
  const counters = ordersKanbanBoard.querySelectorAll('.orders-kanban-count');
  lists.forEach((list) => {
    list.innerHTML = '';
  });
  counters.forEach((counter) => {
    counter.textContent = '0';
  });

  if (!ordersCache.length) {
    const pendingList = ordersKanbanBoard.querySelector('.orders-kanban-list[data-status="pending"]');
    if (pendingList) pendingList.innerHTML = '<p class="small">Aucune commande disponible.</p>';
    return;
  }

  for (const order of ordersCache) {
    const list = ordersKanbanBoard.querySelector(`.orders-kanban-list[data-status="${order.status}"]`);
    if (!list) continue;
    const materialState = materialLoanedState(order);
    const materialBadgeClass = materialState === true
      ? 'material-pill material-pill-yes'
      : materialState === false
        ? 'material-pill material-pill-no'
        : 'material-pill material-pill-unknown';
    const materialBadgeLabel = materialState === true
      ? 'Materiel prete'
      : materialState === false
        ? 'Sans materiel'
        : 'Materiel inconnu';

    const card = document.createElement('article');
    card.className = 'order-tag-card';
    card.draggable = true;
    card.dataset.orderId = String(order.id);
    card.dataset.orderStatus = String(order.status || '');
    card.innerHTML = `
      <div class="order-tag-head">
        <strong>#${order.id}</strong>
        <span class="${statusClass(order.status)}">${statusDisplayLabel(order.status)}</span>
      </div>
      <div class="order-tag-meta">
        <span class="${materialBadgeClass}">${materialBadgeLabel}</span>
      </div>
      <p><strong>Client:</strong> ${orderClientDisplayName(order)}</p>
      <p><strong>Menu:</strong> ${order.menu_title || ''}</p>
      <p><strong>Total:</strong> ${formatEur(order.total_price || 0)}</p>
      <p><strong>Date:</strong> ${formatDateTimeFr(order.created_at)}</p>
      <button type="button" class="table-action-btn" data-action="edit-order" data-order-id="${order.id}">Modifier</button>
    `;
    list.appendChild(card);
  }

  counters.forEach((counter) => {
    const status = counter.getAttribute('data-count-for');
    if (!status) return;
    const count = ordersCache.filter((order) => order.status === status).length;
    counter.textContent = String(count);
  });
}

function openSidebar() {
  staffSidebar?.classList.add('open');
  sidebarOverlay?.removeAttribute('hidden');
  sidebarToggle?.setAttribute('aria-expanded', 'true');
  if (sidebarToggle) sidebarToggle.textContent = '❮';
}

function closeSidebar() {
  staffSidebar?.classList.remove('open');
  sidebarOverlay?.setAttribute('hidden', 'true');
  sidebarToggle?.setAttribute('aria-expanded', 'false');
  if (sidebarToggle) sidebarToggle.textContent = '❯';
}

function activateNavItem(button) {
  document.querySelectorAll('.staff-nav-item').forEach((item) => item.classList.remove('active'));
  if (button?.classList.contains('staff-nav-item')) {
    button.classList.add('active');
  }
}

function showView(viewName) {
  staffViews.forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });
}

async function initStaffUser() {
  if (!token) {
    window.location.href = '/';
    return;
  }

  try {
    const data = await api('/api/auth/me');
    me = data.user;
    const role = userRole();
    if (!['employee', 'admin'].includes(role)) {
      window.location.href = role === 'user' ? '/client.html' : '/';
      return;
    }
    staffUserChip.textContent = `${me.email} (${role})`;
    if (navStaffManagement) navStaffManagement.hidden = !isAdminUser();
    if (navReviews) navReviews.hidden = false;
  } catch {
    logout();
  }
}

async function loadEmployeeOrders() {
  try {
    const data = await api('/api/employee/orders');
    ordersCache = data.orders || [];
    renderOrdersKanban();
    employeeOrdersSummary.textContent = `${ordersCache.length} commande(s) au total. Mise a jour auto toutes les 5 secondes.`;
  } catch (err) {
    employeeOrdersSummary.textContent = 'Impossible de charger les commandes.';
    if (ordersKanbanBoard) {
      const pendingList = ordersKanbanBoard.querySelector('.orders-kanban-list[data-status="pending"]');
      if (pendingList) pendingList.innerHTML = `<p class="small">${err.message}</p>`;
    }
  }
}

function parsePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function renderOrdersStatusChart(statusCounts) {
  if (!ordersStatusChart) return;
  const entries = [
    { key: 'pending', label: 'En attente', color: '#e59e2b' },
    { key: 'accepted', label: 'Acceptees', color: '#4ba56c' },
    { key: 'preparing', label: 'En preparation', color: '#4a75c8' },
    { key: 'delivering', label: 'En livraison', color: '#6b57c8' },
    { key: 'delivered', label: 'Livrees', color: '#22967b' },
    { key: 'finished', label: 'Terminees', color: '#3d9e8b' },
    { key: 'cancelled', label: 'Annulees', color: '#c54c5a' }
  ];
  const total = entries.reduce((sum, entry) => sum + (statusCounts[entry.key] || 0), 0);
  if (!total) {
    ordersStatusChart.innerHTML = '<p class="small">Aucune commande pour generer le camembert.</p>';
    return;
  }

  let cursor = 0;
  const segments = [];
  const legend = [];
  for (const entry of entries) {
    const count = statusCounts[entry.key] || 0;
    if (count > 0) {
      const start = cursor;
      const part = (count / total) * 100;
      const end = cursor + part;
      segments.push(`${entry.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
      cursor = end;
    }
    legend.push(`
      <li class="status-pie-legend-item">
        <span class="status-pie-dot" style="background:${entry.color}"></span>
        <span>${entry.label}</span>
        <strong>${count}</strong>
      </li>
    `);
  }

  ordersStatusChart.innerHTML = `
    <div class="status-pie-layout">
      <div class="status-pie-wrap">
        <div class="status-pie" style="background: conic-gradient(${segments.join(', ')});"></div>
        <div class="status-pie-center">
          <strong>${total}</strong>
          <span>commandes</span>
        </div>
      </div>
      <ul class="status-pie-legend">${legend.join('')}</ul>
    </div>
  `;
}

async function loadDashboardStats() {
  try {
    const data = await api('/api/employee/orders');
    const orders = data.orders || [];
    const statusCounts = {
      pending: 0,
      accepted: 0,
      preparing: 0,
      delivering: 0,
      delivered: 0,
      finished: 0,
      cancelled: 0
    };

    let ongoing = 0;
    let deliveredRevenue = 0;
    for (const order of orders) {
      if (statusCounts[order.status] !== undefined) statusCounts[order.status] += 1;
      if (isOrderInOngoing(order.status)) ongoing += 1;
      if (order.status === 'finished') deliveredRevenue += parsePrice(order.total_price);
    }

    if (metricTotalOrders) metricTotalOrders.textContent = `${orders.length}`;
    if (metricOngoingOrders) metricOngoingOrders.textContent = `${ongoing}`;
    if (metricDeliveredRevenue) metricDeliveredRevenue.textContent = `${deliveredRevenue.toFixed(2)} EUR`;
    renderOrdersStatusChart(statusCounts);
  } catch {
    if (metricTotalOrders) metricTotalOrders.textContent = '-';
    if (metricOngoingOrders) metricOngoingOrders.textContent = '-';
    if (metricDeliveredRevenue) metricDeliveredRevenue.textContent = '-';
    if (ordersStatusChart) ordersStatusChart.innerHTML = '<p class="small">Impossible de charger le graphique.</p>';
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    await loadEmployeeOrders();
    await loadDashboardStats();
  }, 5000);
}

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value ?? ''}`;
  return `${n.toFixed(2)} EUR`;
}

function toAttr(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeMenuImageUrl(rawUrl, context = {}) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();

  if (lower.includes('/images/menu-noel.svg') || lower.includes('photo-1514516345957') || lower.includes('5638732')) return MENU_IMAGE_BASE_OPTIONS[0].url;
  if (lower.includes('/images/menu-paques.svg')) return MENU_IMAGE_BASE_OPTIONS[1].url;
  if (lower.includes('/images/menu-vegan.svg') || lower.includes('photo-1546069901') || lower.includes('1640777')) return MENU_IMAGE_BASE_OPTIONS[2].url;
  if (lower.includes('/images/menu-vegetarien.svg')) return MENU_IMAGE_BASE_OPTIONS[3].url;
  if (lower.includes('/images/menu-classique.svg') || lower.includes('1279330')) return MENU_IMAGE_BASE_OPTIONS[4].url;
  if (lower.includes('/images/menu-evenement.svg')) return MENU_IMAGE_BASE_OPTIONS[5].url;
  if (lower.includes('/images/menu-default.svg')) return MENU_IMAGE_BASE_OPTIONS[4].url;

  if (raw.startsWith('/images/')) return `.${raw}`;
  if (raw.startsWith('./images/')) return raw;

  const text = `${context.theme || ''} ${context.diet || ''} ${context.title || ''}`.toLowerCase();
  if (text.includes('noel')) return MENU_IMAGE_BASE_OPTIONS[0].url;
  if (text.includes('paques') || text.includes('printemps')) return MENU_IMAGE_BASE_OPTIONS[1].url;
  if (text.includes('vegan')) return MENU_IMAGE_BASE_OPTIONS[2].url;
  if (text.includes('vegetarien')) return MENU_IMAGE_BASE_OPTIONS[3].url;
  if (text.includes('classique')) return MENU_IMAGE_BASE_OPTIONS[4].url;
  if (text.includes('evenement')) return MENU_IMAGE_BASE_OPTIONS[5].url;

  return raw;
}

function resetMenuImageOptions() {
  menuImageOptions = MENU_IMAGE_BASE_OPTIONS.map((item) => ({ ...item }));
}

function ensureMenuImageOption(url, label = 'Image perso') {
  const clean = String(url || '').trim();
  if (!clean) return;
  const exists = menuImageOptions.some((item) => item.url === clean);
  if (!exists) menuImageOptions.push({ url: clean, label });
}

function setSelectedMenuImage(url) {
  if (!menuModalForm) return;
  const hidden = menuModalForm.querySelector('[name="imageUrl"]');
  if (hidden) hidden.value = String(url || '').trim();
  renderMenuImagePresets(hidden?.value || '');
}

function renderMenuImagePresets(selectedUrl = '') {
  if (!menuImagePresetsNode) return;
  menuImagePresetsNode.innerHTML = menuImageOptions.map((item) => `
    <button
      type="button"
      class="menu-image-option ${selectedUrl === item.url ? 'active' : ''}"
      data-image-url="${toAttr(item.url)}"
      title="${toAttr(item.label)}"
    >
      <img src="${toAttr(item.url)}" alt="${toAttr(item.label)}" />
      <span>${item.label}</span>
    </button>
  `).join('');
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image invalide.'));
    };
    image.src = objectUrl;
  });
}

async function buildCompressedMenuImageDataUrl(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Selectionne un fichier image valide.');
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponible pour traiter l image.');

  const baseMaxSide = 960;
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42];
  let scale = Math.min(1, baseMaxSide / Math.max(image.naturalWidth, image.naturalHeight));
  let bestDataUrl = '';

  for (let step = 0; step < 5; step += 1) {
    const width = Math.max(240, Math.round(image.naturalWidth * scale));
    const height = Math.max(240, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const candidate = canvas.toDataURL('image/jpeg', quality);
      if (!bestDataUrl || candidate.length < bestDataUrl.length) bestDataUrl = candidate;
      if (candidate.length <= MENU_MAX_IMAGE_DATA_URL_LENGTH) return candidate;
    }

    scale *= 0.8;
  }

  if (bestDataUrl && bestDataUrl.length <= MENU_MAX_IMAGE_DATA_URL_LENGTH) return bestDataUrl;
  throw new Error('Image trop lourde. Choisis une image plus legere.');
}

function renderMenusTable() {
  if (!menusTableBody) return;
  if (!menusCache.length) {
    menusTableBody.innerHTML = '<tr><td colspan="8" class="small">Aucun menu disponible.</td></tr>';
    return;
  }
  menusTableBody.innerHTML = menusCache.map((menu) => `
    <tr>
      <td>${menu.id}</td>
      <td>${menu.title || ''}</td>
      <td>${menu.theme || ''}</td>
      <td>${menu.diet || ''}</td>
      <td>${menu.min_people ?? ''}</td>
      <td>${formatEur(menu.min_price)}</td>
      <td>${menu.stock ?? ''}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn" data-action="edit-menu" data-menu-id="${menu.id}">Modifier</button>
          <button type="button" class="table-action-btn table-action-btn-danger" title="Supprimer le menu" aria-label="Supprimer le menu" data-action="delete-menu" data-menu-id="${menu.id}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadMenus() {
  try {
    const data = await api('/api/menus');
    menusCache = data.menus || [];
    renderMenusTable();
  } catch (err) {
    menusCache = [];
    renderMenusTable();
    if (menusResult) menusResult.textContent = err.message;
  }
}

function renderClientsTable() {
  if (!clientsTableBody) return;
  if (!clientsCache.length) {
    clientsTableBody.innerHTML = '<tr><td colspan="9" class="small">Aucun client disponible.</td></tr>';
    return;
  }
  clientsTableBody.innerHTML = clientsCache.map((client) => `
    <tr>
      <td>${client.id}</td>
      <td>${client.first_name || ''}</td>
      <td>${client.last_name || ''}</td>
      <td>${client.email || ''}</td>
      <td>${client.phone || ''}</td>
      <td>${Number(client.orders_count || 0)}</td>
      <td>${formatEur(client.total_spent || 0)}</td>
      <td>${formatDateTimeFr(client.last_order_at)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn" data-action="view-client" data-client-id="${client.id}">Voir details</button>
          <button type="button" class="table-action-btn" data-action="edit-client" data-client-id="${client.id}">Modifier</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadClients() {
  try {
    const data = await api('/api/employee/clients');
    clientsCache = data.clients || [];
    renderClientsTable();
    if (clientsResult) clientsResult.textContent = `${clientsCache.length} client(s) charge(s).`;
  } catch (err) {
    clientsCache = [];
    renderClientsTable();
    if (clientsResult) clientsResult.textContent = err.message;
  }
}

function renderReviewsTable() {
  if (!reviewsTableBody) return;
  if (!reviewsCache.length) {
    reviewsTableBody.innerHTML = '<tr><td colspan="10" class="small">Aucun avis client.</td></tr>';
    return;
  }

  reviewsTableBody.innerHTML = reviewsCache.map((review) => {
    const isApproved = Number(review.is_approved) === 1;
    const actions = isApproved
      ? `<button type="button" class="table-action-btn" data-action="moderate-review" data-review-id="${review.id}" data-approved="0">Refuser</button>`
      : `<button type="button" class="table-action-btn" data-action="moderate-review" data-review-id="${review.id}" data-approved="1">Valider</button>`;

    return `
      <tr>
        <td>${review.id}</td>
        <td>${escapeHtml(clientNameFromReview(review))}</td>
        <td>${escapeHtml(review.client_email || '')}</td>
        <td>#${review.order_id}</td>
        <td>${escapeHtml(review.menu_title || '')}</td>
        <td>${reviewStars(review.rating)} (${review.rating || 0}/5)</td>
        <td class="review-comment-cell">${escapeHtml(review.comment || '')}</td>
        <td>${reviewStatusBadge(review.is_approved)}</td>
        <td>${formatDateTimeFr(review.created_at)}</td>
        <td>
          <div class="table-actions">
            ${actions}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadReviews() {
  try {
    const data = await api('/api/admin/reviews');
    reviewsCache = data.reviews || [];
    renderReviewsTable();
    if (reviewsResult) reviewsResult.textContent = `${reviewsCache.length} avis charge(s).`;
  } catch (err) {
    reviewsCache = [];
    renderReviewsTable();
    if (reviewsResult) reviewsResult.textContent = err.message;
  }
}

function closeClientModal() {
  if (!clientDetailsModal) return;
  clientDetailsModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function openClientEditModal(clientId) {
  if (!clientEditModal || !clientEditForm) return;
  const client = clientsCache.find((item) => String(item.id) === String(clientId));
  if (!client) return;
  clientEditForm.querySelector('[name="clientId"]').value = String(client.id);
  clientEditForm.querySelector('[name="firstName"]').value = client.first_name || '';
  clientEditForm.querySelector('[name="lastName"]').value = client.last_name || '';
  clientEditForm.querySelector('[name="email"]').value = client.email || '';
  clientEditForm.querySelector('[name="phone"]').value = client.phone || '';
  clientEditForm.querySelector('[name="address"]').value = client.address || '';
  clientEditModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeClientEditModal() {
  if (!clientEditModal || !clientEditForm) return;
  clientEditModal.hidden = true;
  document.body.classList.remove('modal-open');
  clientEditForm.reset();
}

async function openClientModal(clientId) {
  try {
    const data = await api(`/api/employee/clients/${clientId}/summary`);
    const client = data.client || {};
    const recent = data.recentMenus || [];
    const favorites = data.favoriteMenus || [];

    if (clientDetailsTitle) clientDetailsTitle.textContent = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Details client';
    if (clientDetailsMeta) clientDetailsMeta.textContent = `${client.email || ''} - ${client.phone || ''}`;
    if (clientRecentMenus) {
      clientRecentMenus.innerHTML = recent.length
        ? recent.map((row) => `<li>${row.menu_title} (${formatDateTimeFr(row.created_at)})</li>`).join('')
        : '<li>Aucune commande recente.</li>';
    }
    if (clientFavoriteMenus) {
      clientFavoriteMenus.innerHTML = favorites.length
        ? favorites.map((row) => `<li>${row.menu_title} (${Number(row.order_count)} commande(s))</li>`).join('')
        : '<li>Aucun menu favori calcule.</li>';
    }

    if (clientDetailsModal) {
      clientDetailsModal.hidden = false;
      document.body.classList.add('modal-open');
    }
  } catch (err) {
    if (clientsResult) clientsResult.textContent = err.message;
  }
}

function openMenuFormModal(mode, menu = null) {
  if (!menuFormModal || !menuModalForm) return;
  menuModalMode = mode;
  resetMenuImageOptions();
  const idInput = menuModalForm.querySelector('[name="menuId"]');
  const titleInput = menuModalForm.querySelector('[name="title"]');
  const descriptionInput = menuModalForm.querySelector('[name="description"]');
  const themeInput = menuModalForm.querySelector('[name="theme"]');
  const dietInput = menuModalForm.querySelector('[name="diet"]');
  const minPeopleInput = menuModalForm.querySelector('[name="minPeople"]');
  const minPriceInput = menuModalForm.querySelector('[name="minPrice"]');
  const stockInput = menuModalForm.querySelector('[name="stock"]');
  const imageUrlInput = menuModalForm.querySelector('[name="imageUrl"]');
  const conditionsInput = menuModalForm.querySelector('[name="conditionsText"]');

  if (mode === 'create') {
    menuFormTitle.textContent = 'Creer un menu';
    menuFormSubtitle.textContent = 'Renseigne les informations du nouveau menu.';
    menuModalSubmitBtn.textContent = 'Creer le menu';
    idInput.value = '';
    titleInput.value = '';
    descriptionInput.value = '';
    themeInput.value = '';
    dietInput.value = '';
    minPeopleInput.value = '';
    minPriceInput.value = '';
    stockInput.value = '';
    imageUrlInput.value = '';
    conditionsInput.value = '';
    setSelectedMenuImage(menuImageOptions[0]?.url || '');
  } else if (menu) {
    menuFormTitle.textContent = 'Modifier un menu';
    menuFormSubtitle.textContent = `Edition du menu #${menu.id}.`;
    menuModalSubmitBtn.textContent = 'Enregistrer';
    idInput.value = String(menu.id || '');
    titleInput.value = menu.title || '';
    descriptionInput.value = menu.description || '';
    themeInput.value = menu.theme || '';
    dietInput.value = menu.diet || '';
    minPeopleInput.value = menu.min_people ?? '';
    minPriceInput.value = menu.min_price ?? '';
    stockInput.value = menu.stock ?? '';
    const normalizedImageUrl = normalizeMenuImageUrl(menu.image_url, menu);
    imageUrlInput.value = normalizedImageUrl || '';
    conditionsInput.value = menu.conditions_text || '';
    ensureMenuImageOption(normalizedImageUrl || '', 'Image actuelle');
    setSelectedMenuImage(normalizedImageUrl || menuImageOptions[0]?.url || '');
  }

  if (menuImageFileInput) menuImageFileInput.value = '';
  renderMenuImagePresets(menuModalForm.querySelector('[name="imageUrl"]')?.value || '');

  menuFormModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeMenuFormModal() {
  if (!menuFormModal || !menuModalForm) return;
  menuFormModal.hidden = true;
  document.body.classList.remove('modal-open');
  menuModalForm.reset();
}

function openMenuDeleteModal(menuId) {
  if (!menuDeleteModal) return;
  pendingDeleteMenuId = String(menuId || '');
  const selected = menusCache.find((menu) => String(menu.id) === pendingDeleteMenuId);
  if (menuDeleteMessage) {
    const label = selected ? `"${selected.title}"` : 'ce menu';
    menuDeleteMessage.textContent = `Cette action est irreversible. Voulez-vous vraiment supprimer ${label} ?`;
  }
  menuDeleteModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeMenuDeleteModal() {
  if (!menuDeleteModal) return;
  menuDeleteModal.hidden = true;
  document.body.classList.remove('modal-open');
  pendingDeleteMenuId = '';
}

function renderInternalUsers() {
  if (!staffUsersTableBody) return;
  if (!internalUsers.length) {
    staffUsersTableBody.innerHTML = '<tr><td colspan="9" class="small">Aucun compte interne.</td></tr>';
    return;
  }
  staffUsersTableBody.innerHTML = internalUsers.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${String(item.role || '').toLowerCase()}</td>
      <td>${item.first_name || ''}</td>
      <td>${item.last_name || ''}</td>
      <td>${item.email || ''}</td>
      <td>${item.phone || ''}</td>
      <td>${item.is_active ? 'oui' : 'non'}</td>
      <td>${formatDateTimeFr(item.created_at)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn" data-action="edit-staff" data-user-id="${item.id}">Modifier</button>
          <button type="button" class="table-action-btn table-action-btn-danger" title="Supprimer le compte" aria-label="Supprimer le compte" data-action="delete-staff" data-user-id="${item.id}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openStaffFormModal(mode, userId = '') {
  if (!staffFormModal || !staffModalForm) return;
  staffModalMode = mode;

  const roleInput = staffModalForm.querySelector('[name="role"]');
  const firstNameInput = staffModalForm.querySelector('[name="firstName"]');
  const lastNameInput = staffModalForm.querySelector('[name="lastName"]');
  const emailInput = staffModalForm.querySelector('[name="email"]');
  const phoneInput = staffModalForm.querySelector('[name="phone"]');
  const addressInput = staffModalForm.querySelector('[name="address"]');
  const isActiveInput = staffModalForm.querySelector('[name="isActive"]');
  const passwordInput = staffModalForm.querySelector('[name="password"]');
  const userIdInput = staffModalForm.querySelector('[name="userId"]');

  if (mode === 'create') {
    staffFormTitle.textContent = 'Creer un compte interne';
    staffFormSubtitle.textContent = 'Renseigne les informations du nouvel admin/employe.';
    staffModalSubmitBtn.textContent = 'Creer le compte';
    userIdInput.value = '';
    roleInput.value = 'employee';
    firstNameInput.value = '';
    lastNameInput.value = '';
    emailInput.value = '';
    phoneInput.value = '';
    addressInput.value = 'Bordeaux';
    isActiveInput.value = '1';
    passwordInput.value = '';
    passwordInput.required = true;
  } else {
    const selected = internalUsers.find((user) => String(user.id) === String(userId));
    if (!selected) return;
    staffFormTitle.textContent = 'Modifier le compte interne';
    staffFormSubtitle.textContent = `Edition du compte #${selected.id}.`;
    staffModalSubmitBtn.textContent = 'Enregistrer';
    userIdInput.value = String(selected.id);
    roleInput.value = String(selected.role || 'employee').toLowerCase();
    firstNameInput.value = selected.first_name || '';
    lastNameInput.value = selected.last_name || '';
    emailInput.value = selected.email || '';
    phoneInput.value = selected.phone || '';
    addressInput.value = selected.address || '';
    isActiveInput.value = selected.is_active ? '1' : '0';
    passwordInput.value = '';
    passwordInput.required = false;
  }

  staffFormModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeStaffFormModal() {
  if (!staffFormModal || !staffModalForm) return;
  staffFormModal.hidden = true;
  document.body.classList.remove('modal-open');
  staffModalForm.reset();
}

function openDeleteModal(userId) {
  if (!staffDeleteModal) return;
  pendingDeleteUserId = String(userId || '');
  const selected = internalUsers.find((user) => String(user.id) === pendingDeleteUserId);
  if (staffDeleteMessage) {
    const label = selected ? `${selected.email} (${String(selected.role || '').toLowerCase()})` : `cet utilisateur`;
    staffDeleteMessage.textContent = `Cette action est irreversible. Voulez-vous vraiment supprimer ${label} ?`;
  }
  staffDeleteModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeDeleteModal() {
  if (!staffDeleteModal) return;
  staffDeleteModal.hidden = true;
  document.body.classList.remove('modal-open');
  pendingDeleteUserId = '';
}

async function loadInternalUsers() {
  if (!isAdminUser()) return;
  try {
    const data = await api('/api/admin/staff-users');
    internalUsers = data.users || [];
    renderInternalUsers();
  } catch (err) {
    if (staffManagementResult) staffManagementResult.textContent = err.message;
  }
}

function openOrderStatusModal(orderId, forcedStatus = '') {
  const order = ordersCache.find((item) => String(item.id) === String(orderId));
  if (!order || !orderStatusModal || !orderStatusForm) return;
  const materialState = materialLoanedState(order);
  const materialLoaned = materialState === true;
  const statusInput = orderStatusForm.querySelector('[name="status"]');
  const awaitingOption = orderStatusForm.querySelector('option[value="awaiting_material_return"]');
  if (awaitingOption) awaitingOption.disabled = !materialLoaned;

  const wantedStatus = forcedStatus || order.status;
  const safeStatus = !materialLoaned && wantedStatus === 'awaiting_material_return'
    ? (order.status === 'awaiting_material_return' ? 'delivered' : order.status)
    : wantedStatus;

  orderStatusForm.querySelector('[name="orderId"]').value = String(order.id);
  if (statusInput) statusInput.value = safeStatus;
  orderStatusForm.querySelector('[name="reason"]').value = '';
  const contactModeInput = orderStatusForm.querySelector('[name="contactMode"]');
  if (contactModeInput) contactModeInput.value = '';
  syncOrderCancelFields();
  if (orderStatusSubtitle) {
    const materialText = materialState === true ? 'oui' : materialState === false ? 'non' : 'inconnu';
    orderStatusSubtitle.textContent = `Commande #${order.id} - ${orderClientDisplayName(order)} - ${order.menu_title || ''} - Materiel prete: ${materialText}`;
  }
  orderStatusModal.hidden = false;
  document.body.classList.add('modal-open');
}

function syncOrderCancelFields() {
  if (!orderStatusForm) return;
  const statusInput = orderStatusForm.querySelector('[name="status"]');
  const reasonInput = orderStatusForm.querySelector('[name="reason"]');
  const contactModeInput = orderStatusForm.querySelector('[name="contactMode"]');
  const isCancelled = statusInput?.value === 'cancelled';
  if (reasonInput) reasonInput.required = isCancelled;
  if (contactModeInput) contactModeInput.required = isCancelled;
}

async function updateOrderStatus(orderId, status, reason = '', contactMode = '') {
  const payload = { status };
  if (status === 'cancelled') {
    payload.reason = reason || 'Annulation interne';
    payload.contactMode = contactMode || '';
  }
  else if (reason) payload.reason = reason;
  await api(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

document.querySelector('#refresh-employee-orders')?.addEventListener('click', loadEmployeeOrders);

ordersKanbanBoard?.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action="edit-order"]');
  if (!button) return;
  openOrderStatusModal(button.getAttribute('data-order-id'));
});

ordersKanbanBoard?.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.order-tag-card');
  if (!card) return;
  draggedOrderId = card.dataset.orderId || '';
  card.classList.add('dragging');
});

ordersKanbanBoard?.addEventListener('dragend', (e) => {
  const card = e.target.closest('.order-tag-card');
  if (card) card.classList.remove('dragging');
  draggedOrderId = '';
  ordersKanbanBoard.querySelectorAll('.orders-kanban-list').forEach((list) => list.classList.remove('drop-target'));
});

ordersKanbanBoard?.addEventListener('dragover', (e) => {
  const list = e.target.closest('.orders-kanban-list');
  if (!list) return;
  e.preventDefault();
  list.classList.add('drop-target');
});

ordersKanbanBoard?.addEventListener('dragleave', (e) => {
  const list = e.target.closest('.orders-kanban-list');
  if (!list) return;
  list.classList.remove('drop-target');
});

ordersKanbanBoard?.addEventListener('drop', async (e) => {
  const list = e.target.closest('.orders-kanban-list');
  if (!list || !draggedOrderId) return;
  e.preventDefault();
  list.classList.remove('drop-target');
  const nextStatus = list.getAttribute('data-status');
  const order = ordersCache.find((item) => String(item.id) === String(draggedOrderId));
  if (!order || !nextStatus || order.status === nextStatus) return;

  if (nextStatus === 'cancelled') {
    openOrderStatusModal(order.id, 'cancelled');
    const out = document.querySelector('#employee-result');
    if (out) out.textContent = 'Pour annuler, renseigne le motif et le mode de contact client.';
    return;
  }

  try {
    await updateOrderStatus(order.id, nextStatus);
    const out = document.querySelector('#employee-result');
    if (out) out.textContent = `Commande #${order.id} mise a jour: ${statusDisplayLabel(nextStatus)}`;
    await loadEmployeeOrders();
    await loadDashboardStats();
  } catch (err) {
    const out = document.querySelector('#employee-result');
    if (out) out.textContent = err.message;
  }
});

orderStatusModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-order-modal]')) {
    orderStatusModal.hidden = true;
    document.body.classList.remove('modal-open');
  }
});
closeOrderModalBtn?.addEventListener('click', () => {
  if (!orderStatusModal) return;
  orderStatusModal.hidden = true;
  document.body.classList.remove('modal-open');
});
orderStatusForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = document.querySelector('#employee-result');
  try {
    const body = formToObject(e.target);
    const orderId = body.orderId;
    const selectedOrder = ordersCache.find((item) => String(item.id) === String(orderId));
    const selectedMaterialState = materialLoanedState(selectedOrder);
    if (body.status === 'awaiting_material_return' && selectedMaterialState === false) {
      if (out) out.textContent = 'Retour materiel impossible: cette commande ne comporte pas de materiel prete.';
      return;
    }
    await updateOrderStatus(orderId, body.status, body.reason || '', body.contactMode || '');
    if (out) out.textContent = 'Statut mis a jour.';
    if (orderStatusModal) orderStatusModal.hidden = true;
    document.body.classList.remove('modal-open');
    await loadEmployeeOrders();
    await loadDashboardStats();
  } catch (err) {
    out.textContent = err.message;
  }
});

orderStatusForm?.querySelector('[name="status"]')?.addEventListener('change', syncOrderCancelFields);

refreshClientsBtn?.addEventListener('click', loadClients);
refreshReviewsBtn?.addEventListener('click', loadReviews);

clientsTableBody?.addEventListener('click', (e) => {
  const viewBtn = e.target.closest('[data-action="view-client"]');
  if (viewBtn) {
    openClientModal(viewBtn.getAttribute('data-client-id'));
    return;
  }
  const editBtn = e.target.closest('[data-action="edit-client"]');
  if (editBtn) {
    openClientEditModal(editBtn.getAttribute('data-client-id'));
  }
});

clientDetailsModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-client-modal]')) closeClientModal();
});
closeClientModalBtn?.addEventListener('click', closeClientModal);

clientEditModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-client-edit-modal]')) closeClientEditModal();
});
closeClientEditModalBtn?.addEventListener('click', closeClientEditModal);
clientEditForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = formToObject(e.target);
  try {
    await api(`/api/employee/clients/${body.clientId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        address: body.address
      })
    });
    if (clientsResult) clientsResult.textContent = 'Client mis a jour.';
    closeClientEditModal();
    await loadClients();
  } catch (err) {
    if (clientsResult) clientsResult.textContent = err.message;
  }
});

reviewsTableBody?.addEventListener('click', async (e) => {
  const actionBtn = e.target.closest('[data-action="moderate-review"]');
  if (!actionBtn) return;

  const reviewId = actionBtn.getAttribute('data-review-id');
  const approved = actionBtn.getAttribute('data-approved') === '1';
  if (!reviewId) return;

  try {
    await api(`/api/reviews/${reviewId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ approved })
    });
    if (reviewsResult) {
      reviewsResult.textContent = approved
        ? `Avis #${reviewId} valide.`
        : `Avis #${reviewId} refuse.`;
    }
    await loadReviews();
  } catch (err) {
    if (reviewsResult) reviewsResult.textContent = err.message;
  }
});

document.querySelector('.staff-nav')?.addEventListener('click', (e) => {
  const navItem = e.target.closest('.staff-nav-item[data-view]');
  if (navItem) {
    activateNavItem(navItem);
    const viewName = navItem.getAttribute('data-view');
    if (viewName) showView(viewName);
    if (viewName === 'orders') loadEmployeeOrders();
    if (viewName === 'reviews') loadReviews();
    closeSidebar();
  }
});

sidebarToggle?.addEventListener('click', () => {
  if (staffSidebar?.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay?.addEventListener('click', closeSidebar);
sidebarClose?.addEventListener('click', closeSidebar);

openCreateMenuModalBtn?.addEventListener('click', () => {
  openMenuFormModal('create');
});

menuImagePresetsNode?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-image-url]');
  if (!btn) return;
  setSelectedMenuImage(btn.getAttribute('data-image-url'));
});

menuImageFileBtn?.addEventListener('click', () => {
  menuImageFileInput?.click();
});

menuImageFileInput?.addEventListener('change', async () => {
  const file = menuImageFileInput.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await buildCompressedMenuImageDataUrl(file);
    ensureMenuImageOption(dataUrl, `Image locale: ${file.name}`);
    setSelectedMenuImage(dataUrl);
    if (menusResult) menusResult.textContent = `Image locale ajoutee: ${file.name}`;
  } catch (err) {
    if (menusResult) menusResult.textContent = err.message || 'Impossible d ajouter cette image.';
  } finally {
    menuImageFileInput.value = '';
  }
});

menusTableBody?.addEventListener('click', async (e) => {
  const editButton = e.target.closest('[data-action="edit-menu"]');
  if (editButton) {
    const menuId = editButton.getAttribute('data-menu-id');
    try {
      const data = await api(`/api/menus/${menuId}`);
      openMenuFormModal('edit', data.menu);
    } catch (err) {
      if (menusResult) menusResult.textContent = err.message;
    }
    return;
  }

  const deleteButton = e.target.closest('[data-action="delete-menu"]');
  if (deleteButton) {
    openMenuDeleteModal(deleteButton.getAttribute('data-menu-id'));
  }
});

menuFormModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-menu-modal]')) closeMenuFormModal();
});

closeMenuModalBtn?.addEventListener('click', closeMenuFormModal);

menuModalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = menusResult;
  try {
    const body = formToObject(e.target);
    if (menuModalMode === 'create') {
      const payload = {
        title: body.title,
        description: body.description,
        theme: body.theme,
        diet: body.diet,
        minPeople: body.minPeople,
        minPrice: body.minPrice,
        stock: body.stock,
        imageUrl: body.imageUrl,
        conditionsText: body.conditionsText
      };
      await api('/api/menus', { method: 'POST', body: JSON.stringify(payload) });
      if (out) out.textContent = 'Menu cree.';
    } else {
      const menuId = body.menuId;
      const payload = {
        title: body.title,
        description: body.description,
        theme: body.theme,
        diet: body.diet,
        minPeople: body.minPeople,
        minPrice: body.minPrice,
        stock: body.stock,
        imageUrl: body.imageUrl,
        conditionsText: body.conditionsText
      };
      await api(`/api/menus/${menuId}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (out) out.textContent = 'Menu mis a jour.';
    }
    closeMenuFormModal();
    await loadMenus();
  } catch (err) {
    if (out) out.textContent = err.message;
  }
});

menuDeleteModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-menu-delete-modal]')) closeMenuDeleteModal();
});

closeMenuDeleteModalBtn?.addEventListener('click', closeMenuDeleteModal);
cancelMenuDeleteBtn?.addEventListener('click', closeMenuDeleteModal);
confirmMenuDeleteBtn?.addEventListener('click', async () => {
  if (!pendingDeleteMenuId) return;
  try {
    await api(`/api/menus/${pendingDeleteMenuId}`, { method: 'DELETE' });
    if (menusResult) menusResult.textContent = 'Menu supprime.';
    closeMenuDeleteModal();
    await loadMenus();
  } catch (err) {
    if (menusResult) menusResult.textContent = err.message;
    closeMenuDeleteModal();
  }
});

openCreateStaffModalBtn?.addEventListener('click', () => {
  if (!isAdminUser()) return;
  openStaffFormModal('create');
});

staffUsersTableBody?.addEventListener('click', (e) => {
  if (!isAdminUser()) return;

  const editButton = e.target.closest('[data-action="edit-staff"]');
  if (editButton) {
    openStaffFormModal('edit', editButton.getAttribute('data-user-id'));
    return;
  }

  const deleteButton = e.target.closest('[data-action="delete-staff"]');
  if (deleteButton) {
    const userId = deleteButton.getAttribute('data-user-id');
    openDeleteModal(userId);
  }
});

staffFormModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-staff-modal]')) closeStaffFormModal();
});

closeStaffModalBtn?.addEventListener('click', closeStaffFormModal);

staffDeleteModal?.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-delete-modal]')) closeDeleteModal();
});
closeDeleteModalBtn?.addEventListener('click', closeDeleteModal);
cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
confirmDeleteBtn?.addEventListener('click', async () => {
  if (!isAdminUser() || !pendingDeleteUserId) return;
  try {
    await api(`/api/admin/staff-users/${pendingDeleteUserId}`, { method: 'DELETE' });
    if (staffManagementResult) staffManagementResult.textContent = 'Compte interne supprime.';
    closeDeleteModal();
    await loadInternalUsers();
  } catch (err) {
    if (staffManagementResult) staffManagementResult.textContent = err.message;
    closeDeleteModal();
  }
});

staffModalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdminUser()) return;
  const out = staffManagementResult;
  try {
    const body = formToObject(e.target);
    if (staffModalMode === 'create') {
      const payload = {
        role: body.role,
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        address: body.address
      };
      const data = await api('/api/admin/staff-users', { method: 'POST', body: JSON.stringify(payload) });
      out.textContent = `Compte interne cree: ${data.userId}`;
    } else {
      const payload = {
        role: body.role,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        address: body.address,
        isActive: body.isActive === '1'
      };
      if (body.password) payload.password = body.password;
      await api(`/api/admin/staff-users/${body.userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      out.textContent = 'Compte interne mis a jour.';
    }
    await loadInternalUsers();
    closeStaffFormModal();
  } catch (err) {
    out.textContent = err.message;
  }
});

document.querySelector('#logout-btn').addEventListener('click', logout);

await initStaffUser();
showView('dashboard');
await loadEmployeeOrders();
await loadDashboardStats();
await loadMenus();
await loadClients();
await loadInternalUsers();
await loadReviews();
startAutoRefresh();
