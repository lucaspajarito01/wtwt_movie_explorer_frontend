import { api, ApiError } from './api.js';
import { fetchCurrentUser, getToken } from './session.js';
import { ROLES } from './roles.js';
import { clearFormErrors, showFormError, setBusy, showToast } from './ui.js';

const LOGIN_URL = new URL('../../index.html', import.meta.url).href;
const OPTIONAL_TITLE_FIELDS = [
  'duration',
  'ageRating',
  'director',
  'platform',
  'language',
  'posterUrl',
  'bannerUrl',
  'trailerUrl',
];

const state = {
  user: null,
  categories: [],
  pendingTitles: [],
  titles: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
  estadoFilter: 'todos',
  categoryFilter: 'all',
  searchQuery: '',
  pendingCount: 0,
  approvedCount: 0,
};

const els = {
  guardBox: document.querySelector('#guard-box'),
  guardStatus: document.querySelector('#guard-status'),
  adminContent: document.querySelector('#admin-content'),
  navTabs: document.querySelectorAll('.nav-tab[data-view-target]'),
  views: {
    pending: document.querySelector('#view-pending'),
    titles: document.querySelector('#view-titles'),
    categories: document.querySelector('#view-categories'),
  },
  btnNewTitle: document.querySelector('#btn-admin-new-title'),
  btnRefresh: document.querySelector('#btn-admin-refresh'),
  statPending: document.querySelector('#stat-pending-titles'),
  statApproved: document.querySelector('#stat-approved-titles'),
  statTotalTitles: document.querySelector('#stat-total-titles'),
  statTotalCategories: document.querySelector('#stat-total-categories'),
  pendingEmpty: document.querySelector('#pending-empty'),
  pendingGrid: document.querySelector('#pending-grid'),
  estadoButtons: document.querySelectorAll('[data-estado]'),
  categoryFilterSelect: document.querySelector('#admin-category-filter'),
  titleSearchInput: document.querySelector('#admin-title-search'),
  limitSelect: document.querySelector('#admin-limit-select'),
  titlesSummary: document.querySelector('#admin-titles-summary'),
  titlesTbody: document.querySelector('#admin-titles-tbody'),
  titlesEmpty: document.querySelector('#admin-titles-empty'),
  prevPageBtn: document.querySelector('#admin-prev-page'),
  nextPageBtn: document.querySelector('#admin-next-page'),
  pageInfo: document.querySelector('#admin-page-info'),
  categoryLookupForm: document.querySelector('#category-lookup-form'),
  categoryLookupId: document.querySelector('#category-lookup-id'),
  categoryForm: document.querySelector('#category-form'),
  categoryFormHeading: document.querySelector('#category-form-heading'),
  categoryIdInput: document.querySelector('#category-id-input'),
  categoryNameInput: document.querySelector('#category-name-input'),
  categoryDescInput: document.querySelector('#category-desc-input'),
  btnCancelCategory: document.querySelector('#btn-cancel-category'),
  categoriesTbody: document.querySelector('#admin-categories-tbody'),
  categoriesEmpty: document.querySelector('#admin-categories-empty'),
  titleModal: document.querySelector('#admin-title-modal'),
  titleModalHeading: document.querySelector('#admin-modal-heading'),
  titleModalSubtitle: document.querySelector('#admin-modal-subtitle'),
  titleForm: document.querySelector('#admin-title-form'),
  titleIdInput: document.querySelector('#admin-title-id'),
  fieldCategorySelect: document.querySelector('#admin-field-category'),
  btnCloseTitleModal: document.querySelector('#btn-close-admin-modal'),
  btnCancelTitleModal: document.querySelector('#btn-cancel-admin-modal'),
  detailModal: document.querySelector('#admin-detail-modal'),
  detailModalStatus: document.querySelector('#detail-modal-status'),
  detailModalTitle: document.querySelector('#detail-modal-title'),
  detailModalBody: document.querySelector('#detail-modal-body'),
  detailModalActions: document.querySelector('#detail-modal-actions'),
  btnCloseDetailModal: document.querySelector('#btn-close-detail-modal'),
};

function switchView(target) {
  els.navTabs.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.viewTarget === target);
  });
  Object.entries(els.views).forEach(([key, section]) => {
    if (section) section.hidden = key !== target;
  });
}

els.navTabs.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.viewTarget));
});

function updateStatsUI() {
  els.statPending.textContent = String(state.pendingCount);
  els.statApproved.textContent = String(state.approvedCount);
  els.statTotalTitles.textContent = String(state.pendingCount + state.approvedCount);
  els.statTotalCategories.textContent = String(state.categories.length);
}

function isPlaceholderUrl(url) {
  if (!url || typeof url !== 'string') return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'example.com' || parsed.hostname.endsWith('.example.com');
  } catch {
    return true;
  }
}

function applyAdminPoster(imgEl, title) {
  const seed = encodeURIComponent(`wtwt-poster-${title?.id || title?.title || 'default'}`);
  const fallbackUrl = `https://picsum.photos/seed/${seed}/450/675`;
  const primaryUrl = !isPlaceholderUrl(title?.posterUrl) ? title.posterUrl : fallbackUrl;
  imgEl.alt = title?.title || 'Póster';
  imgEl.onerror = () => {
    if (imgEl.src !== fallbackUrl) {
      imgEl.src = fallbackUrl;
    }
  };
  imgEl.src = primaryUrl;
}

function resolveAdminBannerUrl(title) {
  const seed = encodeURIComponent(`wtwt-banner-${title?.id || title?.title || 'default'}`);
  const fallbackUrl = `https://picsum.photos/seed/${seed}/1280/520`;
  return !isPlaceholderUrl(title?.bannerUrl) ? title.bannerUrl : fallbackUrl;
}

function createDetailRow(label, value) {
  const item = document.createElement('div');
  item.className = 'pending-detail-item';
  const span = document.createElement('span');
  span.textContent = label;
  const strong = document.createElement('strong');
  strong.textContent = value || '—';
  item.append(span, strong);
  return item;
}

function renderPendingQueue() {
  els.pendingGrid.replaceChildren();

  if (state.pendingTitles.length === 0) {
    els.pendingEmpty.hidden = false;
    return;
  }

  els.pendingEmpty.hidden = true;

  for (const title of state.pendingTitles) {
    const card = document.createElement('article');
    card.className = 'pending-card';

    const top = document.createElement('div');
    top.className = 'pending-card-top';

    const thumb = document.createElement('div');
    thumb.className = 'pending-thumb';
    const thumbImg = document.createElement('img');
    applyAdminPoster(thumbImg, title);
    thumb.append(thumbImg);

    const info = document.createElement('div');
    info.className = 'pending-info';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-pill status-pendiente';
    statusBadge.textContent = `Pendiente · ID #${title.id}`;

    const heading = document.createElement('h3');
    heading.className = 'pending-title';
    heading.textContent = title.title;

    const meta = document.createElement('p');
    meta.className = 'pending-meta';
    meta.textContent = [
      title.category ? `${title.category} (#${title.categoryId})` : 'Sin categoría',
      `Año ${title.year}`,
      title.createdBy ? `Autor ID #${title.createdBy}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const desc = document.createElement('p');
    desc.className = 'pending-desc';
    desc.textContent = title.description || 'Sin descripción.';

    info.append(statusBadge, heading, meta, desc);
    top.append(thumb, info);

    const grid = document.createElement('div');
    grid.className = 'pending-details-grid';
    grid.append(
      createDetailRow('Duración', title.duration),
      createDetailRow('Edad recomendada', title.ageRating),
      createDetailRow('Director', title.director),
      createDetailRow('Plataforma', title.platform),
      createDetailRow('Idioma', title.language),
      createDetailRow('Tráiler', title.trailerUrl ? 'Disponible' : 'No registrado'),
    );

    const actions = document.createElement('div');
    actions.className = 'pending-actions';

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn-action btn-success btn-compact';
    approveBtn.textContent = '✓ Aprobar';
    approveBtn.addEventListener('click', () => handleApproveTitle(title.id));

    const inspectBtn = document.createElement('button');
    inspectBtn.type = 'button';
    inspectBtn.className = 'btn-action btn-watchlist btn-compact';
    inspectBtn.textContent = 'Ver ficha';
    inspectBtn.addEventListener('click', () => openDetailModal(title));

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-action btn-watchlist btn-compact';
    editBtn.textContent = '✎ Editar';
    editBtn.addEventListener('click', () => openTitleModal(title));

    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'btn-action btn-danger btn-compact';
    rejectBtn.textContent = '✕ Rechazar';
    rejectBtn.addEventListener('click', () => handleDeleteTitle(title.id, title.title));

    actions.append(approveBtn, inspectBtn, editBtn, rejectBtn);
    card.append(top, grid, actions);
    els.pendingGrid.append(card);
  }
}

function getFilteredAdminTitles() {
  const q = state.searchQuery.trim().toLowerCase();
  return state.titles.filter((item) => {
    if (
      state.categoryFilter !== 'all' &&
      Number(item.categoryId) !== Number(state.categoryFilter)
    ) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      String(item.id),
      item.title,
      item.description,
      item.category,
      item.director,
      item.platform,
      item.language,
      item.ageRating,
      String(item.year),
      item.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

function createMediaAnchor(url, label) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'spec-link';
  a.textContent = label;
  return a;
}

function renderTitlesTable() {
  const filtered = getFilteredAdminTitles();
  els.titlesTbody.replaceChildren();

  const total = state.meta.total ?? filtered.length;
  const totalPages = Math.max(1, state.meta.totalPages || 1);
  els.titlesSummary.textContent = `Mostrando ${filtered.length} de ${total} título(s) en filtro "${state.estadoFilter}" (Página ${state.meta.page} de ${totalPages}).`;

  if (filtered.length === 0) {
    els.titlesEmpty.hidden = false;
  } else {
    els.titlesEmpty.hidden = true;
    for (const item of filtered) {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.textContent = `#${item.id}`;

      const tdPoster = document.createElement('td');
      const posterBox = document.createElement('div');
      posterBox.className = 'table-poster';
      const posterImg = document.createElement('img');
      applyAdminPoster(posterImg, item);
      posterBox.append(posterImg);
      tdPoster.append(posterBox);

      const tdMain = document.createElement('td');
      tdMain.className = 'table-title-cell';
      const titleName = document.createElement('span');
      titleName.className = 'table-title-name';
      titleName.textContent = item.title;
      const titleDesc = document.createElement('p');
      titleDesc.className = 'table-title-desc';
      titleDesc.textContent = item.description || '—';
      tdMain.append(titleName, titleDesc);

      const tdCat = document.createElement('td');
      tdCat.textContent = item.category
        ? `${item.category} (#${item.categoryId})`
        : 'Sin categoría';

      const tdSpecs = document.createElement('td');
      const specsList = document.createElement('div');
      specsList.className = 'table-meta-list';
      specsList.innerHTML = '';
      for (const text of [
        `Año: ${item.year}`,
        `Duración: ${item.duration || '—'}`,
        `Edad: ${item.ageRating || '—'}`,
      ]) {
        const span = document.createElement('span');
        span.textContent = text;
        specsList.append(span);
      }
      tdSpecs.append(specsList);

      const tdRefs = document.createElement('td');
      const refsList = document.createElement('div');
      refsList.className = 'table-meta-list';
      for (const text of [
        `Dir: ${item.director || '—'}`,
        `Plat: ${item.platform || '—'}`,
        `Idioma: ${item.language || '—'}`,
      ]) {
        const span = document.createElement('span');
        span.textContent = text;
        refsList.append(span);
      }
      tdRefs.append(refsList);

      const tdMedia = document.createElement('td');
      const mediaLinks = document.createElement('div');
      mediaLinks.className = 'table-links';
      if (item.posterUrl) mediaLinks.append(createMediaAnchor(item.posterUrl, 'Póster ↗'));
      if (item.bannerUrl) mediaLinks.append(createMediaAnchor(item.bannerUrl, 'Banner ↗'));
      if (item.trailerUrl) mediaLinks.append(createMediaAnchor(item.trailerUrl, 'Tráiler ↗'));
      if (!item.posterUrl && !item.bannerUrl && !item.trailerUrl) {
        const empty = document.createElement('span');
        empty.className = 'spec-empty';
        empty.textContent = 'Sin enlaces';
        mediaLinks.append(empty);
      }
      tdMedia.append(mediaLinks);

      const tdAuthor = document.createElement('td');
      tdAuthor.textContent = item.createdBy ? `Usuario #${item.createdBy}` : '—';

      const tdStatus = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status-pill ${item.status === 'aprobado' ? 'status-aprobado' : 'status-pendiente'}`;
      badge.textContent = item.status;
      tdStatus.append(badge);

      const tdActions = document.createElement('td');
      const actionWrap = document.createElement('div');
      actionWrap.className = 'table-actions';

      if (item.status === 'pendiente') {
        const btnApprove = document.createElement('button');
        btnApprove.type = 'button';
        btnApprove.className = 'btn-action btn-success btn-compact';
        btnApprove.textContent = 'Aprobar';
        btnApprove.addEventListener('click', () => handleApproveTitle(item.id));
        actionWrap.append(btnApprove);
      }

      const btnView = document.createElement('button');
      btnView.type = 'button';
      btnView.className = 'btn-action btn-watchlist btn-compact';
      btnView.textContent = 'Ver';
      btnView.addEventListener('click', () => openDetailModal(item));

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-action btn-watchlist btn-compact';
      btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => openTitleModal(item));

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-action btn-danger btn-compact';
      btnDel.textContent = item.status === 'pendiente' ? 'Rechazar' : 'Eliminar';
      btnDel.addEventListener('click', () => handleDeleteTitle(item.id, item.title));

      actionWrap.append(btnView, btnEdit, btnDel);
      tdActions.append(actionWrap);

      tr.append(
        tdId,
        tdPoster,
        tdMain,
        tdCat,
        tdSpecs,
        tdRefs,
        tdMedia,
        tdAuthor,
        tdStatus,
        tdActions,
      );
      els.titlesTbody.append(tr);
    }
  }

  els.pageInfo.textContent = `Página ${state.meta.page} de ${totalPages} (${total} registros)`;
  els.prevPageBtn.disabled = state.meta.page <= 1;
  els.nextPageBtn.disabled = state.meta.page >= totalPages;
}

function renderCategoriesUI() {
  els.categoryFilterSelect.replaceChildren();
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'Todas las categorías';
  els.categoryFilterSelect.append(allOpt);

  els.fieldCategorySelect.replaceChildren();
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = 'Selecciona una categoría…';
  els.fieldCategorySelect.append(emptyOpt);

  els.categoriesTbody.replaceChildren();

  if (state.categories.length === 0) {
    els.categoriesEmpty.hidden = false;
  } else {
    els.categoriesEmpty.hidden = true;
  }

  for (const cat of state.categories) {
    const filterOpt = document.createElement('option');
    filterOpt.value = String(cat.id);
    filterOpt.textContent = `${cat.name} (#${cat.id})`;
    if (String(state.categoryFilter) === String(cat.id)) filterOpt.selected = true;
    els.categoryFilterSelect.append(filterOpt);

    const modalOpt = document.createElement('option');
    modalOpt.value = String(cat.id);
    modalOpt.textContent = `${cat.name} (#${cat.id})`;
    els.fieldCategorySelect.append(modalOpt);

    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = `#${cat.id}`;

    const tdName = document.createElement('td');
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = cat.name;
    tdName.append(nameStrong);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = cat.description || 'Sin descripción';

    const tdActions = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'table-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-action btn-watchlist btn-compact';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => startEditCategory(cat));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-action btn-danger btn-compact';
    delBtn.textContent = 'Eliminar';
    delBtn.addEventListener('click', () => handleDeleteCategory(cat.id, cat.name));

    actions.append(editBtn, delBtn);
    tdActions.append(actions);

    tr.append(tdId, tdName, tdDesc, tdActions);
    els.categoriesTbody.append(tr);
  }
}

async function loadCategories() {
  const res = await api('/categories', { token: getToken() });
  state.categories = Array.isArray(res?.data) ? res.data : [];
  renderCategoriesUI();
  updateStatsUI();
}

async function loadPendingAndCounts() {
  const token = getToken();
  const [pendingRes, approvedRes] = await Promise.all([
    api('/titles?page=1&limit=50&estado=pendiente', { token }),
    api('/titles?page=1&limit=1&estado=aprobado', { token }),
  ]);

  state.pendingTitles = Array.isArray(pendingRes?.data) ? pendingRes.data : [];
  state.pendingCount = pendingRes?.meta?.total ?? state.pendingTitles.length;
  state.approvedCount = approvedRes?.meta?.total ?? 0;

  renderPendingQueue();
  updateStatsUI();
}

async function loadAdminTitles(page = 1) {
  const limit = Number(els.limitSelect.value) || 10;
  const res = await api(
    `/titles?page=${page}&limit=${limit}&estado=${encodeURIComponent(state.estadoFilter)}`,
    { token: getToken() },
  );
  state.titles = Array.isArray(res?.data) ? res.data : [];
  state.meta = res?.meta || { page, limit, total: state.titles.length, totalPages: 1 };
  renderTitlesTable();
}

async function refreshAll() {
  try {
    await Promise.all([
      loadCategories(),
      loadPendingAndCounts(),
      loadAdminTitles(state.meta.page || 1),
    ]);
  } catch (err) {
    showToast(err.message || 'Error al sincronizar los datos de administración.', true);
  }
}

async function handleApproveTitle(id) {
  try {
    const res = await api(`/titles/${id}/approve`, {
      method: 'PATCH',
      token: getToken(),
    });
    showToast(res?.message || `Título #${id} aprobado correctamente.`);
    els.detailModal.hidden = true;
    await refreshAll();
  } catch (err) {
    showToast(err.message || 'No se pudo aprobar el título.', true);
  }
}

async function handleDeleteTitle(id, name) {
  if (!confirm(`¿Seguro que deseas eliminar/rechazar el título "${name}" (#${id})?`)) {
    return;
  }
  try {
    const res = await api(`/titles/${id}`, {
      method: 'DELETE',
      token: getToken(),
    });
    showToast(res?.message || `Título #${id} eliminado correctamente.`);
    els.detailModal.hidden = true;
    await refreshAll();
  } catch (err) {
    showToast(err.message || 'No se pudo eliminar el título.', true);
  }
}

function openTitleModal(titleToEdit = null) {
  clearFormErrors(els.titleForm);
  els.titleForm.reset();

  if (titleToEdit) {
    els.titleModalHeading.textContent = `Editar título #${titleToEdit.id}`;
    els.titleModalSubtitle.textContent = 'Modifica cualquier campo del título. Deja un campo opcional vacío para limpiarlo.';
    els.titleIdInput.value = String(titleToEdit.id);
    els.titleForm.elements.title.value = titleToEdit.title || '';
    els.titleForm.elements.categoryId.value = titleToEdit.categoryId ? String(titleToEdit.categoryId) : '';
    els.titleForm.elements.year.value = titleToEdit.year ? String(titleToEdit.year) : '';
    els.titleForm.elements.description.value = titleToEdit.description || '';
    els.titleForm.elements.duration.value = titleToEdit.duration || '';
    els.titleForm.elements.ageRating.value = titleToEdit.ageRating || '';
    els.titleForm.elements.director.value = titleToEdit.director || '';
    els.titleForm.elements.platform.value = titleToEdit.platform || '';
    els.titleForm.elements.language.value = titleToEdit.language || '';
    els.titleForm.elements.posterUrl.value = titleToEdit.posterUrl || '';
    els.titleForm.elements.bannerUrl.value = titleToEdit.bannerUrl || '';
    els.titleForm.elements.trailerUrl.value = titleToEdit.trailerUrl || '';
  } else {
    els.titleModalHeading.textContent = 'Crear nuevo título (Aprobado)';
    els.titleModalSubtitle.textContent = 'Como administrador, el título quedará publicado inmediatamente con estado aprobado.';
    els.titleIdInput.value = '';
  }

  els.titleModal.hidden = false;
}

function closeTitleModal() {
  els.titleModal.hidden = true;
}

function openDetailModal(title) {
  els.detailModalStatus.textContent = `${title.status.toUpperCase()} · ID #${title.id}`;
  els.detailModalStatus.className = `status-pill ${title.status === 'aprobado' ? 'status-aprobado' : 'status-pendiente'}`;
  els.detailModalTitle.textContent = title.title;

  els.detailModalBody.replaceChildren();

  const banner = document.createElement('div');
  banner.className = 'detail-banner-preview';
  const bannerUrl = resolveAdminBannerUrl(title);
  banner.style.backgroundImage = `url('${bannerUrl.replace(/'/g, "\\'")}')`;
  els.detailModalBody.append(banner);

  const desc = document.createElement('p');
  desc.className = 'synopsis';
  desc.textContent = title.description || 'Sin descripción.';
  els.detailModalBody.append(desc);

  const specs = document.createElement('div');
  specs.className = 'specs-grid';
  const entries = [
    ['ID Título', `#${title.id}`],
    ['Estado', title.status],
    ['Categoría', title.category ? `${title.category} (#${title.categoryId})` : 'Sin categoría'],
    ['Año', String(title.year)],
    ['Duración', title.duration || 'No especificada'],
    ['Edad recomendada', title.ageRating || 'No especificada'],
    ['Director', title.director || 'No registrado'],
    ['Plataforma', title.platform || 'No registrada'],
    ['Idioma', title.language || 'No registrado'],
    ['Creado por', title.createdBy ? `Usuario #${title.createdBy}` : '—'],
    ['URL Póster', title.posterUrl || 'No registrado'],
    ['URL Banner', title.bannerUrl || 'No registrado'],
    ['URL Tráiler', title.trailerUrl || 'No registrado'],
  ];

  for (const [label, value] of entries) {
    const card = document.createElement('div');
    card.className = 'spec-card';
    const l = document.createElement('span');
    l.className = 'spec-label';
    l.textContent = label;
    const v = document.createElement('strong');
    v.className = 'spec-value';
    v.textContent = value;
    card.append(l, v);
    specs.append(card);
  }
  els.detailModalBody.append(specs);

  els.detailModalActions.replaceChildren();

  if (title.status === 'pendiente') {
    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn-action btn-success';
    approveBtn.textContent = '✓ Aprobar título';
    approveBtn.addEventListener('click', () => handleApproveTitle(title.id));
    els.detailModalActions.append(approveBtn);
  }

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-action btn-watchlist';
  editBtn.textContent = '✎ Editar';
  editBtn.addEventListener('click', () => {
    els.detailModal.hidden = true;
    openTitleModal(title);
  });

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-action btn-danger';
  delBtn.textContent = title.status === 'pendiente' ? '✕ Rechazar' : '✕ Eliminar';
  delBtn.addEventListener('click', () => handleDeleteTitle(title.id, title.title));

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-action btn-watchlist';
  closeBtn.textContent = 'Cerrar';
  closeBtn.addEventListener('click', () => {
    els.detailModal.hidden = true;
  });

  els.detailModalActions.append(editBtn, delBtn, closeBtn);
  els.detailModal.hidden = false;
}

els.titleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(els.titleForm);
  const editId = els.titleIdInput.value.trim();
  const isUpdate = Boolean(editId);

  const payload = {
    title: String(data.get('title') || '').trim(),
    description: String(data.get('description') || '').trim(),
    categoryId: Number(data.get('categoryId')),
    year: Number(data.get('year')),
  };

  for (const field of OPTIONAL_TITLE_FIELDS) {
    const raw = String(data.get(field) || '').trim();
    if (raw) {
      payload[field] = raw;
    } else if (isUpdate) {
      payload[field] = null;
    }
  }

  setBusy(els.titleForm, true);
  try {
    const res = await api(isUpdate ? `/titles/${editId}` : '/titles', {
      method: isUpdate ? 'PATCH' : 'POST',
      body: payload,
      token: getToken(),
    });
    closeTitleModal();
    showToast(res?.message || 'Título guardado correctamente.');
    await refreshAll();
  } catch (err) {
    showFormError(els.titleForm, err instanceof ApiError ? err : new ApiError(err.message));
  } finally {
    setBusy(els.titleForm, false);
  }
});

function startEditCategory(cat) {
  clearFormErrors(els.categoryForm);
  els.categoryIdInput.value = String(cat.id);
  els.categoryNameInput.value = cat.name || '';
  els.categoryDescInput.value = cat.description || '';
  els.categoryFormHeading.textContent = `Editar categoría #${cat.id}`;
  els.btnCancelCategory.hidden = false;
  els.categoryNameInput.focus();
}

function resetCategoryForm() {
  clearFormErrors(els.categoryForm);
  els.categoryForm.reset();
  els.categoryIdInput.value = '';
  els.categoryFormHeading.textContent = 'Nueva categoría';
  els.btnCancelCategory.hidden = true;
}

els.btnCancelCategory.addEventListener('click', resetCategoryForm);

els.categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const editId = els.categoryIdInput.value.trim();
  const name = els.categoryNameInput.value.trim();
  const description = els.categoryDescInput.value.trim();

  setBusy(els.categoryForm, true);
  try {
    const res = await api(editId ? `/categories/${editId}` : '/categories', {
      method: editId ? 'PATCH' : 'POST',
      body: {
        name,
        description: description || null,
      },
      token: getToken(),
    });
    resetCategoryForm();
    showToast(res?.message || 'Categoría guardada correctamente.');
    await refreshAll();
  } catch (err) {
    showFormError(els.categoryForm, err instanceof ApiError ? err : new ApiError(err.message));
  } finally {
    setBusy(els.categoryForm, false);
  }
});

async function handleDeleteCategory(id, name) {
  if (!confirm(`¿Seguro que deseas eliminar la categoría "${name}" (#${id})?`)) {
    return;
  }
  try {
    const res = await api(`/categories/${id}`, {
      method: 'DELETE',
      token: getToken(),
    });
    showToast(res?.message || 'Categoría eliminada correctamente.');
    if (els.categoryIdInput.value === String(id)) resetCategoryForm();
    await refreshAll();
  } catch (err) {
    showToast(err.message || 'No se pudo eliminar la categoría.', true);
  }
}

els.categoryLookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = Number(els.categoryLookupId.value);
  if (!Number.isInteger(id) || id <= 0) return;

  try {
    const res = await api(`/categories/${id}`, { token: getToken() });
    if (res?.data) {
      startEditCategory(res.data);
      showToast(`Categoría "${res.data.name}" (#${res.data.id}) cargada en el formulario.`);
    }
  } catch (err) {
    showToast(err.message || `Categoría #${id} no encontrada.`, true);
  }
});

els.estadoButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.estadoFilter = btn.dataset.estado;
    els.estadoButtons.forEach((b) => b.classList.toggle('active', b === btn));
    loadAdminTitles(1);
  });
});

els.categoryFilterSelect.addEventListener('change', () => {
  state.categoryFilter = els.categoryFilterSelect.value;
  renderTitlesTable();
});

els.titleSearchInput.addEventListener('input', () => {
  state.searchQuery = els.titleSearchInput.value;
  renderTitlesTable();
});

els.limitSelect.addEventListener('change', () => {
  loadAdminTitles(1);
});

els.prevPageBtn.addEventListener('click', () => {
  if (state.meta.page > 1) loadAdminTitles(state.meta.page - 1);
});

els.nextPageBtn.addEventListener('click', () => {
  if (state.meta.page < (state.meta.totalPages || 1)) loadAdminTitles(state.meta.page + 1);
});

els.btnNewTitle.addEventListener('click', () => openTitleModal(null));
els.btnRefresh.addEventListener('click', () => refreshAll());
els.btnCloseTitleModal.addEventListener('click', closeTitleModal);
els.btnCancelTitleModal.addEventListener('click', closeTitleModal);
els.btnCloseDetailModal.addEventListener('click', () => {
  els.detailModal.hidden = true;
});

els.titleModal.addEventListener('click', (event) => {
  if (event.target === els.titleModal) closeTitleModal();
});

els.detailModal.addEventListener('click', (event) => {
  if (event.target === els.detailModal) els.detailModal.hidden = true;
});

async function initAdmin() {
  try {
    const user = await fetchCurrentUser();

    if (!user) {
      location.replace(LOGIN_URL);
      return;
    }

    if (user.role !== ROLES.ADMIN) {
      els.guardStatus.textContent = 'No tienes permisos de administrador para ver esta página.';
      return;
    }

    state.user = user;
    els.guardBox.hidden = true;
    els.adminContent.hidden = false;

    await refreshAll();
  } catch {
    els.guardStatus.textContent = 'No se pudo verificar tu sesión. Revisa que el servidor esté en marcha.';
  }
}

initAdmin();
