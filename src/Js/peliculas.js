import { api, ApiError } from './api.js';
import { fetchCurrentUser, getToken } from './session.js';
import { ROLES } from './roles.js';
import { clearFormErrors, showFormError, setBusy, showToast } from './ui.js';

const LOGIN_URL = new URL('../../Index.html', import.meta.url).href;
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
  titles: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
  selectedCategoryId: 'all',
  searchQuery: '',
  selectedTitle: null,
  userProposals: [],
};

const els = {
  searchForm: document.querySelector('#search-form'),
  searchInput: document.querySelector('#search-input'),
  btnOpenPropose: document.querySelector('#btn-open-propose'),
  btnHeroPropose: document.querySelector('#btn-hero-propose'),
  btnEditOwn: document.querySelector('#btn-edit-own'),
  btnNewProposal: document.querySelector('#btn-new-proposal'),
  navProposals: document.querySelector('#nav-proposals'),
  heroBackdrop: document.querySelector('#hero-backdrop'),
  movieCategoryBadge: document.querySelector('#movie-category-badge'),
  movieStatusBadge: document.querySelector('#movie-status-badge'),
  movieTitle: document.querySelector('#movie-title'),
  movieMeta: document.querySelector('#movie-meta'),
  btnTrailer: document.querySelector('#btn-trailer'),
  posterImg: document.querySelector('#movie-poster-img'),
  posterFallback: document.querySelector('#movie-poster-fallback'),
  movieYearPill: document.querySelector('#movie-year-pill'),
  movieDescription: document.querySelector('#movie-description'),
  movieTags: document.querySelector('#movie-tags'),
  specId: document.querySelector('#spec-id'),
  specStatus: document.querySelector('#spec-status'),
  specCategoryId: document.querySelector('#spec-category-id'),
  specCreatedBy: document.querySelector('#spec-created-by'),
  specTitle: document.querySelector('#spec-title'),
  specCategory: document.querySelector('#spec-category'),
  specYear: document.querySelector('#spec-year'),
  specDuration: document.querySelector('#spec-duration'),
  specAgeRating: document.querySelector('#spec-age-rating'),
  specDirector: document.querySelector('#spec-director'),
  specPlatform: document.querySelector('#spec-platform'),
  specLanguage: document.querySelector('#spec-language'),
  specPosterUrl: document.querySelector('#spec-poster-url'),
  specPosterEmpty: document.querySelector('#spec-poster-empty'),
  specBannerUrl: document.querySelector('#spec-banner-url'),
  specBannerEmpty: document.querySelector('#spec-banner-empty'),
  specTrailerUrl: document.querySelector('#spec-trailer-url'),
  specTrailerEmpty: document.querySelector('#spec-trailer-empty'),
  lookupIdForm: document.querySelector('#lookup-id-form'),
  lookupIdInput: document.querySelector('#lookup-id-input'),
  limitSelect: document.querySelector('#limit-select'),
  categoryFilters: document.querySelector('#category-filters'),
  catalogSummary: document.querySelector('#catalog-summary'),
  catalogStatus: document.querySelector('#catalog-status'),
  titlesGrid: document.querySelector('#titles-grid'),
  paginationBar: document.querySelector('#pagination-bar'),
  btnPrevPage: document.querySelector('#btn-prev-page'),
  btnNextPage: document.querySelector('#btn-next-page'),
  paginationInfo: document.querySelector('#pagination-info'),
  proposalsSection: document.querySelector('#mis-propuestas-section'),
  proposalsGrid: document.querySelector('#proposals-grid'),
  proposalsEmpty: document.querySelector('#proposals-empty'),
  categoriesShowcase: document.querySelector('#categories-showcase'),
  reviewForm: document.querySelector('#review-form'),
  reviewFormTitle: document.querySelector('#review-form-title'),
  reviewIdInput: document.querySelector('#review-id'),
  reviewMovieIdInput: document.querySelector('#review-movie-id'),
  reviewRatingInput: document.querySelector('#review-rating'),
  reviewTitleInput: document.querySelector('#review-title'),
  reviewCommentInput: document.querySelector('#review-comment'),
  btnCancelReview: document.querySelector('#btn-cancel-review'),
  userReviewsList: document.querySelector('#user-reviews-list'),
  userReviewsEmpty: document.querySelector('#user-reviews-empty'),
  titleModal: document.querySelector('#title-modal'),
  titleModalHeading: document.querySelector('#title-modal-heading'),
  titleModalSubtitle: document.querySelector('#title-modal-subtitle'),
  titleForm: document.querySelector('#title-form'),
  titleIdField: document.querySelector('#title-id-field'),
  fieldCategory: document.querySelector('#field-category'),
  btnCloseModal: document.querySelector('#btn-close-modal'),
  btnCancelModal: document.querySelector('#btn-cancel-modal'),
};

function proposalsStorageKey() {
  return state.user ? `wtwt_proposals_${state.user.id}` : null;
}

function getSavedProposalIds() {
  const key = proposalsStorageKey();
  if (!key) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw.filter((id) => Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

function saveProposalId(id) {
  const key = proposalsStorageKey();
  if (!key) return;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return;
  const current = new Set(getSavedProposalIds());
  current.add(numId);
  try {
    localStorage.setItem(key, JSON.stringify([...current]));
  } catch {
  }
}

function reviewsStorageKey() {
  return state.user ? `wtwt_reviews_${state.user.id}` : 'wtwt_reviews_guest';
}

function getSavedReviews() {
  try {
    const raw = JSON.parse(localStorage.getItem(reviewsStorageKey()) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveReviewEntry(review) {
  const all = getSavedReviews().filter((item) => Number(item.id) !== Number(review.id));
  all.unshift(review);
  try {
    localStorage.setItem(reviewsStorageKey(), JSON.stringify(all));
  } catch {
  }
}

function removeSavedReviewEntry(id) {
  const all = getSavedReviews().filter((item) => Number(item.id) !== Number(id));
  try {
    localStorage.setItem(reviewsStorageKey(), JSON.stringify(all));
  } catch {
  }
}

function canEditTitle(title) {
  if (!state.user || !title) return false;
  if (state.user.role === ROLES.ADMIN) return true;
  return Number(title.createdBy) === Number(state.user.id) && title.status === 'pendiente';
}

function setLinkOrEmpty(linkEl, emptyEl, url, label) {
  if (url) {
    linkEl.href = url;
    linkEl.textContent = label || url;
    linkEl.hidden = false;
    emptyEl.hidden = true;
  } else {
    linkEl.hidden = true;
    emptyEl.hidden = false;
  }
}

function renderSelectedTitle(title) {
  state.selectedTitle = title;

  if (!title) {
    els.movieCategoryBadge.textContent = 'CATÁLOGO · WTWT';
    els.movieStatusBadge.textContent = 'Sin selección';
    els.movieStatusBadge.className = 'status-pill status-pendiente';
    els.movieTitle.textContent = 'No hay títulos disponibles';
    els.movieMeta.textContent = 'Sé el primero en proponer una película, serie o anime.';
    els.heroBackdrop.style.backgroundImage = '';
    els.btnTrailer.hidden = true;
    els.btnEditOwn.hidden = true;
    els.posterImg.hidden = true;
    els.posterFallback.hidden = false;
    els.posterFallback.textContent = '[SIN PÓSTER]';
    els.movieYearPill.textContent = '—';
    els.movieDescription.textContent = 'No se encontró ningún título para mostrar en la vista detallada.';
    els.movieTags.replaceChildren();
    els.specId.textContent = '—';
    els.specStatus.textContent = '—';
    els.specCategoryId.textContent = '—';
    els.specCreatedBy.textContent = '—';
    els.specTitle.textContent = '—';
    els.specCategory.textContent = '—';
    els.specYear.textContent = '—';
    els.specDuration.textContent = '—';
    els.specAgeRating.textContent = '—';
    els.specDirector.textContent = '—';
    els.specPlatform.textContent = '—';
    els.specLanguage.textContent = '—';
    setLinkOrEmpty(els.specPosterUrl, els.specPosterEmpty, null);
    setLinkOrEmpty(els.specBannerUrl, els.specBannerEmpty, null);
    setLinkOrEmpty(els.specTrailerUrl, els.specTrailerEmpty, null);
    els.reviewMovieIdInput.value = '';
    renderUserReviews();
    highlightSelectedCard();
    return;
  }

  document.title = `${title.title} · WTWT`;
  els.movieCategoryBadge.textContent = `DESTACADO · ${title.category || 'SIN CATEGORÍA'}`;
  els.movieStatusBadge.textContent = title.status === 'aprobado' ? 'Aprobado' : 'Pendiente';
  els.movieStatusBadge.className = `status-pill ${title.status === 'aprobado' ? 'status-aprobado' : 'status-pendiente'}`;
  els.movieTitle.textContent = title.title;

  const metaParts = [
    title.year,
    title.ageRating || 'Sin clasificación',
    title.duration || 'Duración no especificada',
    title.director ? `Dir. ${title.director}` : null,
    title.platform || null,
    title.language || null,
  ].filter(Boolean);
  els.movieMeta.textContent = metaParts.join(' · ');

  if (title.bannerUrl) {
    els.heroBackdrop.style.backgroundImage = `url('${title.bannerUrl.replace(/'/g, "\\'")}')`;
  } else if (title.posterUrl) {
    els.heroBackdrop.style.backgroundImage = `url('${title.posterUrl.replace(/'/g, "\\'")}')`;
  } else {
    els.heroBackdrop.style.backgroundImage = '';
  }

  if (title.trailerUrl) {
    els.btnTrailer.href = title.trailerUrl;
    els.btnTrailer.hidden = false;
  } else {
    els.btnTrailer.hidden = true;
  }

  els.btnEditOwn.hidden = !canEditTitle(title);

  if (title.posterUrl) {
    els.posterImg.src = title.posterUrl;
    els.posterImg.alt = `Póster de ${title.title}`;
    els.posterImg.hidden = false;
    els.posterFallback.hidden = true;
  } else {
    els.posterImg.hidden = true;
    els.posterFallback.hidden = false;
    els.posterFallback.textContent = title.title;
  }

  els.movieYearPill.textContent = `Año ${title.year}`;
  els.movieDescription.textContent = title.description || 'Sin descripción registrada.';

  els.movieTags.replaceChildren();
  const tags = [
    title.category,
    title.ageRating ? `Clasificación: ${title.ageRating}` : null,
    title.duration ? `Duración: ${title.duration}` : null,
    title.platform ? `Plataforma: ${title.platform}` : null,
    title.language ? `Idioma: ${title.language}` : null,
    title.director ? `Director: ${title.director}` : null,
  ].filter(Boolean);

  for (const tag of tags) {
    const li = document.createElement('li');
    li.className = 'genre-pill';
    li.textContent = tag;
    els.movieTags.append(li);
  }

  els.specId.textContent = `#${title.id}`;
  els.specStatus.textContent = title.status;
  els.specCategoryId.textContent = title.categoryId ? `#${title.categoryId}` : 'No asignado';
  els.specCreatedBy.textContent = title.createdBy ? `Usuario #${title.createdBy}` : 'Sistema';

  els.specTitle.textContent = title.title;
  els.specCategory.textContent = title.category || 'Sin categoría';
  els.specYear.textContent = String(title.year);
  els.specDuration.textContent = title.duration || 'No especificada';
  els.specAgeRating.textContent = title.ageRating || 'No especificada';
  els.specDirector.textContent = title.director || 'No registrado';
  els.specPlatform.textContent = title.platform || 'No registrada';
  els.specLanguage.textContent = title.language || 'No registrado';

  setLinkOrEmpty(els.specPosterUrl, els.specPosterEmpty, title.posterUrl, title.posterUrl);
  setLinkOrEmpty(els.specBannerUrl, els.specBannerEmpty, title.bannerUrl, title.bannerUrl);
  setLinkOrEmpty(els.specTrailerUrl, els.specTrailerEmpty, title.trailerUrl, title.trailerUrl);

  els.reviewMovieIdInput.value = String(title.id);
  renderUserReviews();
  highlightSelectedCard();
}

els.posterImg.addEventListener('error', () => {
  els.posterImg.hidden = true;
  els.posterFallback.hidden = false;
  els.posterFallback.textContent = state.selectedTitle?.title || '[SIN PÓSTER]';
});

function highlightSelectedCard() {
  const selectedId = state.selectedTitle?.id;
  document.querySelectorAll('.title-card').forEach((card) => {
    card.classList.toggle('is-selected', Number(card.dataset.titleId) === Number(selectedId));
  });
}

function createTitleCard(title) {
  const article = document.createElement('article');
  article.className = 'title-card';
  article.dataset.titleId = String(title.id);
  if (state.selectedTitle && Number(state.selectedTitle.id) === Number(title.id)) {
    article.classList.add('is-selected');
  }

  const posterWrap = document.createElement('div');
  posterWrap.className = 'title-card-poster';

  if (title.posterUrl) {
    const img = document.createElement('img');
    img.src = title.posterUrl;
    img.alt = `Póster de ${title.title}`;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      const span = document.createElement('span');
      span.textContent = title.title;
      posterWrap.append(span);
    });
    posterWrap.append(img);
  } else {
    const span = document.createElement('span');
    span.textContent = title.title;
    posterWrap.append(span);
  }

  const badges = document.createElement('div');
  badges.className = 'title-card-badges';

  const catBadge = document.createElement('span');
  catBadge.className = 'card-badge';
  catBadge.textContent = title.category || 'Sin categoría';

  const statusBadge = document.createElement('span');
  statusBadge.className = `status-pill ${title.status === 'aprobado' ? 'status-aprobado' : 'status-pendiente'}`;
  statusBadge.textContent = title.status === 'aprobado' ? 'Aprobado' : 'Pendiente';

  badges.append(catBadge, statusBadge);
  posterWrap.append(badges);

  const body = document.createElement('div');
  body.className = 'title-card-body';

  const heading = document.createElement('h3');
  heading.className = 'title-card-heading';
  heading.textContent = title.title;

  const meta = document.createElement('p');
  meta.className = 'title-card-meta';
  meta.textContent = [
    `ID #${title.id}`,
    title.year,
    title.ageRating,
    title.duration,
  ].filter(Boolean).join(' · ');

  const desc = document.createElement('p');
  desc.className = 'title-card-desc';
  desc.textContent = title.description || 'Sin descripción.';

  const specs = document.createElement('div');
  specs.className = 'title-card-specs';
  const extraParts = [
    title.director ? `Dir: ${title.director}` : null,
    title.platform ? `Plat: ${title.platform}` : null,
    title.language ? `Idioma: ${title.language}` : null,
  ].filter(Boolean);
  specs.textContent = extraParts.length ? extraParts.join(' · ') : 'Ficha disponible';

  body.append(heading, meta, desc, specs);

  const actions = document.createElement('div');
  actions.className = 'title-card-actions';

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'btn-action btn-trailer btn-compact';
  viewBtn.textContent = 'Ver ficha';
  viewBtn.addEventListener('click', () => {
    renderSelectedTitle(title);
    document.querySelector('#detalle-section')?.scrollIntoView({ behavior: 'smooth' });
  });
  actions.append(viewBtn);

  if (title.trailerUrl) {
    const trailerLink = document.createElement('a');
    trailerLink.href = title.trailerUrl;
    trailerLink.target = '_blank';
    trailerLink.rel = 'noopener noreferrer';
    trailerLink.className = 'btn-action btn-watchlist btn-compact';
    trailerLink.textContent = '▶ Tráiler';
    actions.append(trailerLink);
  }

  if (canEditTitle(title)) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-action btn-watchlist btn-compact';
    editBtn.textContent = '✎ Editar';
    editBtn.addEventListener('click', () => openTitleModal(title));
    actions.append(editBtn);
  }

  article.append(posterWrap, body, actions);
  return article;
}

function getFilteredTitles() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.titles.filter((item) => {
    if (
      state.selectedCategoryId !== 'all' &&
      Number(item.categoryId) !== Number(state.selectedCategoryId)
    ) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      item.title,
      item.description,
      item.category,
      item.director,
      item.platform,
      item.language,
      item.ageRating,
      String(item.year),
      String(item.id),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderCatalog() {
  const filtered = getFilteredTitles();
  els.titlesGrid.replaceChildren();

  const totalCount = state.meta.total ?? filtered.length;
  els.catalogSummary.textContent = `Mostrando ${filtered.length} de ${totalCount} título(s) aprobados (Página ${state.meta.page} de ${Math.max(1, state.meta.totalPages || 1)}).`;

  if (filtered.length === 0) {
    els.catalogStatus.textContent = 'No se encontraron títulos con los filtros seleccionados.';
    els.catalogStatus.hidden = false;
  } else {
    els.catalogStatus.hidden = true;
    for (const title of filtered) {
      els.titlesGrid.append(createTitleCard(title));
    }
  }

  const totalPages = Math.max(1, state.meta.totalPages || 1);
  els.paginationBar.hidden = totalPages <= 1 && state.meta.page <= 1;
  els.paginationInfo.textContent = `Página ${state.meta.page} de ${totalPages} (${totalCount} títulos en total)`;
  els.btnPrevPage.disabled = state.meta.page <= 1;
  els.btnNextPage.disabled = state.meta.page >= totalPages;
}

function renderCategories() {
  els.categoryFilters.replaceChildren();

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `filter-chip ${state.selectedCategoryId === 'all' ? 'active' : ''}`;
  allBtn.dataset.categoryId = 'all';
  allBtn.textContent = 'Todas';
  allBtn.addEventListener('click', () => {
    state.selectedCategoryId = 'all';
    renderCategories();
    renderCatalog();
  });
  els.categoryFilters.append(allBtn);

  els.fieldCategory.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona una categoría…';
  els.fieldCategory.append(placeholder);

  els.categoriesShowcase.replaceChildren();

  for (const cat of state.categories) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `filter-chip ${Number(state.selectedCategoryId) === Number(cat.id) ? 'active' : ''}`;
    chip.dataset.categoryId = String(cat.id);
    chip.title = cat.description || cat.name;
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      state.selectedCategoryId = cat.id;
      renderCategories();
      renderCatalog();
    });
    els.categoryFilters.append(chip);

    const opt = document.createElement('option');
    opt.value = String(cat.id);
    opt.textContent = `${cat.name} (#${cat.id})`;
    els.fieldCategory.append(opt);

    const card = document.createElement('article');
    card.className = 'category-card';

    const header = document.createElement('div');
    header.className = 'category-card-header';

    const title = document.createElement('h3');
    title.className = 'category-card-title';
    title.textContent = cat.name;

    const idBadge = document.createElement('span');
    idBadge.className = 'category-card-id';
    idBadge.textContent = `ID #${cat.id}`;

    header.append(title, idBadge);

    const desc = document.createElement('p');
    desc.className = 'category-card-desc';
    desc.textContent = cat.description || 'Sin descripción registrada.';

    card.append(header, desc);
    els.categoriesShowcase.append(card);
  }
}

async function loadCategories() {
  try {
    const res = await api('/categories', { token: getToken() });
    state.categories = Array.isArray(res?.data) ? res.data : [];
    renderCategories();
  } catch (err) {
    showToast(err.message || 'No se pudieron cargar las categorías.', true);
  }
}

async function loadTitles(page = 1) {
  const limit = Number(els.limitSelect.value) || 10;
  try {
    els.catalogStatus.textContent = 'Cargando títulos desde el servidor…';
    els.catalogStatus.hidden = false;

    const res = await api(`/titles?page=${page}&limit=${limit}`, {
      token: getToken(),
    });

    state.titles = Array.isArray(res?.data) ? res.data : [];
    state.meta = res?.meta || { page, limit, total: state.titles.length, totalPages: 1 };

    if (state.user) {
      for (const t of state.titles) {
        if (Number(t.createdBy) === Number(state.user.id)) {
          saveProposalId(t.id);
        }
      }
    }

    renderCatalog();

    if (state.selectedTitle) {
      const updated = state.titles.find((t) => Number(t.id) === Number(state.selectedTitle.id));
      if (updated) {
        renderSelectedTitle(updated);
      }
    } else if (state.titles.length > 0) {
      renderSelectedTitle(state.titles[0]);
    } else {
      renderSelectedTitle(null);
    }
  } catch (err) {
    els.catalogStatus.textContent = err.message || 'No se pudo cargar el catálogo.';
    els.catalogStatus.hidden = false;
  }
}

async function loadUserProposals() {
  if (!state.user) {
    els.proposalsSection.hidden = true;
    els.navProposals.hidden = true;
    return;
  }

  els.proposalsSection.hidden = false;
  els.navProposals.hidden = false;

  const ids = getSavedProposalIds();
  const fetched = [];
  const token = getToken();

  for (const id of ids) {
    try {
      const res = await api(`/titles/${id}`, { token });
      if (res?.data) fetched.push(res.data);
    } catch {
    }
  }

  state.userProposals = fetched;
  els.proposalsGrid.replaceChildren();

  if (fetched.length === 0) {
    els.proposalsEmpty.hidden = false;
  } else {
    els.proposalsEmpty.hidden = true;
    for (const item of fetched) {
      els.proposalsGrid.append(createTitleCard(item));
    }
  }
}

function openTitleModal(titleToEdit = null) {
  if (!state.user) {
    location.href = LOGIN_URL;
    return;
  }

  clearFormErrors(els.titleForm);
  els.titleForm.reset();

  if (titleToEdit) {
    els.titleModalHeading.textContent = `Editar título #${titleToEdit.id}`;
    els.titleModalSubtitle.textContent = 'Actualiza los datos de tu título. Deja un campo opcional vacío para borrarlo.';
    els.titleIdField.value = String(titleToEdit.id);
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
    els.titleModalHeading.textContent = 'Proponer nuevo título';
    els.titleModalSubtitle.textContent =
      state.user.role === ROLES.ADMIN
        ? 'Como administrador, el título se publicará directamente como aprobado.'
        : 'Los títulos propuestos por usuarios quedan pendientes hasta que un administrador los apruebe.';
    els.titleIdField.value = '';
  }

  els.titleModal.hidden = false;
}

function closeTitleModal() {
  els.titleModal.hidden = true;
}

function buildTitlePayload(formData, isUpdate) {
  const payload = {
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    categoryId: Number(formData.get('categoryId')),
    year: Number(formData.get('year')),
  };

  for (const field of OPTIONAL_TITLE_FIELDS) {
    const raw = String(formData.get(field) || '').trim();
    if (raw) {
      payload[field] = raw;
    } else if (isUpdate) {
      payload[field] = null;
    }
  }

  return payload;
}

els.titleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(els.titleForm);
  const editId = els.titleIdField.value.trim();
  const isUpdate = Boolean(editId);
  const payload = buildTitlePayload(data, isUpdate);

  setBusy(els.titleForm, true);
  try {
    const res = await api(isUpdate ? `/titles/${editId}` : '/titles', {
      method: isUpdate ? 'PATCH' : 'POST',
      body: payload,
      token: getToken(),
    });

    const saved = res?.data;
    if (saved) {
      saveProposalId(saved.id);
      renderSelectedTitle(saved);
    }

    closeTitleModal();
    showToast(res?.message || 'Título guardado correctamente.');
    await loadTitles(state.meta.page);
    await loadUserProposals();
  } catch (err) {
    showFormError(els.titleForm, err instanceof ApiError ? err : new ApiError(err.message));
  } finally {
    setBusy(els.titleForm, false);
  }
});

function renderUserReviews() {
  const currentMovieId = state.selectedTitle?.id;
  const reviews = getSavedReviews().filter(
    (item) => !currentMovieId || Number(item.movieId) === Number(currentMovieId),
  );

  els.userReviewsList.replaceChildren();
  if (reviews.length === 0) {
    els.userReviewsEmpty.hidden = false;
    return;
  }

  els.userReviewsEmpty.hidden = true;

  for (const rev of reviews) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const top = document.createElement('div');
    top.className = 'review-card-top';

    const score = document.createElement('span');
    score.className = 'review-score';
    score.textContent = `★ ${rev.rating} / 10`;

    const meta = document.createElement('span');
    meta.className = 'category-card-id';
    meta.textContent = `Reseña #${rev.id} · Título #${rev.movieId}`;

    top.append(score, meta);

    const title = document.createElement('h4');
    title.className = 'review-card-title';
    title.textContent = rev.title || 'Reseña sin título';

    const comment = document.createElement('p');
    comment.className = 'review-card-comment';
    comment.textContent = rev.comment || 'Sin comentario adicional.';

    const actions = document.createElement('div');
    actions.className = 'review-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-action btn-watchlist btn-compact';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      els.reviewIdInput.value = String(rev.id);
      els.reviewMovieIdInput.value = String(rev.movieId);
      els.reviewRatingInput.value = String(rev.rating);
      els.reviewTitleInput.value = rev.title || '';
      els.reviewCommentInput.value = rev.comment || '';
      els.reviewFormTitle.textContent = `Editar reseña #${rev.id}`;
      els.btnCancelReview.hidden = false;
      els.reviewForm.scrollIntoView({ behavior: 'smooth' });
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-action btn-danger btn-compact';
    delBtn.textContent = 'Eliminar';
    delBtn.addEventListener('click', async () => {
      try {
        await api(`/reviews/${rev.id}`, {
          method: 'DELETE',
          token: getToken(),
        });
      } catch {
      }
      removeSavedReviewEntry(rev.id);
      renderUserReviews();
      showToast('Reseña eliminada.');
    });

    actions.append(editBtn, delBtn);
    card.append(top, title, comment, actions);
    els.userReviewsList.append(card);
  }
}

function resetReviewForm() {
  clearFormErrors(els.reviewForm);
  els.reviewIdInput.value = '';
  els.reviewRatingInput.value = '8';
  els.reviewTitleInput.value = '';
  els.reviewCommentInput.value = '';
  els.reviewMovieIdInput.value = state.selectedTitle ? String(state.selectedTitle.id) : '';
  els.reviewFormTitle.textContent = 'Publicar reseña';
  els.btnCancelReview.hidden = true;
}

els.btnCancelReview.addEventListener('click', resetReviewForm);

els.reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.user) {
    location.href = LOGIN_URL;
    return;
  }

  const editId = els.reviewIdInput.value.trim();
  const movieId = Number(els.reviewMovieIdInput.value);
  const rating = Number(els.reviewRatingInput.value);
  const title = els.reviewTitleInput.value.trim();
  const comment = els.reviewCommentInput.value.trim();

  const body = {
    rating,
    title: title || null,
    comment: comment || null,
  };
  if (!editId) body.movieId = movieId;

  setBusy(els.reviewForm, true);
  try {
    const res = await api(editId ? `/reviews/${editId}` : '/reviews', {
      method: editId ? 'PATCH' : 'POST',
      body,
      token: getToken(),
    });
    const saved = res?.data || {
      id: editId ? Number(editId) : Date.now(),
      movieId,
      userId: state.user.id,
      rating,
      title: body.title,
      comment: body.comment,
    };
    saveReviewEntry(saved);
    resetReviewForm();
    renderUserReviews();
    showToast(res?.message || 'Reseña guardada correctamente.');
  } catch (err) {
    showFormError(els.reviewForm, err instanceof ApiError ? err : new ApiError(err.message));
  } finally {
    setBusy(els.reviewForm, false);
  }
});

els.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.searchQuery = els.searchInput.value;
  renderCatalog();
});

els.searchInput.addEventListener('input', () => {
  state.searchQuery = els.searchInput.value;
  renderCatalog();
});

els.lookupIdForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = Number(els.lookupIdInput.value);
  if (!Number.isInteger(id) || id <= 0) return;

  try {
    const res = await api(`/titles/${id}`, { token: getToken() });
    if (res?.data) {
      if (state.user && Number(res.data.createdBy) === Number(state.user.id)) {
        saveProposalId(res.data.id);
        await loadUserProposals();
      }
      renderSelectedTitle(res.data);
      document.querySelector('#detalle-section')?.scrollIntoView({ behavior: 'smooth' });
      showToast(`Título #${id} cargado en la ficha técnica.`);
    }
  } catch (err) {
    showToast(err.message || `No se encontró el título #${id}.`, true);
  }
});

els.limitSelect.addEventListener('change', () => {
  loadTitles(1);
});

els.btnPrevPage.addEventListener('click', () => {
  if (state.meta.page > 1) {
    loadTitles(state.meta.page - 1);
  }
});

els.btnNextPage.addEventListener('click', () => {
  if (state.meta.page < (state.meta.totalPages || 1)) {
    loadTitles(state.meta.page + 1);
  }
});

els.btnOpenPropose.addEventListener('click', () => openTitleModal(null));
els.btnHeroPropose.addEventListener('click', () => openTitleModal(null));
els.btnNewProposal.addEventListener('click', () => openTitleModal(null));
els.btnEditOwn.addEventListener('click', () => {
  if (state.selectedTitle) openTitleModal(state.selectedTitle);
});
els.btnCloseModal.addEventListener('click', closeTitleModal);
els.btnCancelModal.addEventListener('click', closeTitleModal);

els.titleModal.addEventListener('click', (event) => {
  if (event.target === els.titleModal) closeTitleModal();
});

async function init() {
  try {
    state.user = await fetchCurrentUser();
  } catch {
    state.user = null;
  }

  if (state.user) {
    els.btnOpenPropose.hidden = false;
  }

  await Promise.all([loadCategories(), loadTitles(1)]);
  await loadUserProposals();
}

init();
