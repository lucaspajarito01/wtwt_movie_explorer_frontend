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
  titles: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
  selectedCategoryId: 'all',
  searchQuery: '',
  selectedTitle: null,
  userProposals: [],
  reviews: [],
};

const els = {
  searchForm: document.querySelector('#search-form'),
  searchInput: document.querySelector('#search-input'),
  btnOpenPropose: document.querySelector('#btn-open-propose'),
  btnHeroPropose: document.querySelector('#btn-hero-propose'),
  btnEditOwn: document.querySelector('#btn-edit-own'),
  btnNewProposal: document.querySelector('#btn-new-proposal'),
  navProposals: document.querySelector('#nav-proposals'),
  bannerImg: document.querySelector('#movie-banner-img'),
  movieCategoryBadge: document.querySelector('#movie-category-badge'),
  movieStatusBadge: document.querySelector('#movie-status-badge'),
  movieTitle: document.querySelector('#movie-title'),
  movieMeta: document.querySelector('#movie-meta'),
  btnTrailer: document.querySelector('#btn-trailer'),
  posterImg: document.querySelector('#movie-poster-img'),
  sidebarRatingAvg: document.querySelector('#sidebar-rating-avg'),
  sidebarStarRating: document.querySelector('#sidebar-star-rating'),
  sidebarRatingHint: document.querySelector('#sidebar-rating-hint'),
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
  reviewsHeading: document.querySelector('#reviews-heading'),
  reviewsSubtitle: document.querySelector('#reviews-subtitle'),
  commentsCountBadge: document.querySelector('#comments-count-badge'),
  reviewForm: document.querySelector('#review-form'),
  reviewIdInput: document.querySelector('#review-id'),
  commentStarRating: document.querySelector('#comment-star-rating'),
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
  posterUrlInput: document.querySelector('#field-poster-url'),
  posterUrlPreview: document.querySelector('#poster-url-preview'),
  posterUrlStatus: document.querySelector('#poster-url-status'),
  bannerUrlInput: document.querySelector('#field-banner-url'),
  bannerUrlPreview: document.querySelector('#banner-url-preview'),
  bannerUrlStatus: document.querySelector('#banner-url-status'),
  btnCloseModal: document.querySelector('#btn-close-modal'),
  btnCancelModal: document.querySelector('#btn-cancel-modal'),
};

function isPlaceholderUrl(url) {
  if (!url || typeof url !== 'string') return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'example.com' || parsed.hostname.endsWith('.example.com');
  } catch {
    return true;
  }
}

function buildSvgDataUri(titleText, subtitleText, width, height) {
  const safeTitle = String(titleText || 'WTWT').replace(/[<>&"']/g, '');
  const safeSub = String(subtitleText || '').replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1c2230"/>
        <stop offset="55%" stop-color="#2a3346"/>
        <stop offset="100%" stop-color="#e5484d"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" fill="#edeef0" font-family="system-ui,sans-serif" font-size="24" font-weight="800" text-anchor="middle">${safeTitle}</text>
    <text x="50%" y="58%" fill="#b8bcc8" font-family="system-ui,sans-serif" font-size="14" font-weight="600" text-anchor="middle">${safeSub}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getFallbackPosterUrl(title) {
  const seed = encodeURIComponent(`wtwt-poster-${title?.id || title?.title || 'default'}`);
  return `https://picsum.photos/seed/${seed}/450/675`;
}

function getFallbackBannerUrl(title) {
  const seed = encodeURIComponent(`wtwt-banner-${title?.id || title?.title || 'default'}`);
  return `https://picsum.photos/seed/${seed}/1280/520`;
}

function applyPosterImage(imgEl, title) {
  const fallbackUrl = getFallbackPosterUrl(title);
  const svgBackup = buildSvgDataUri(title?.title || 'WTWT', title?.category || 'Póster', 450, 675);
  const primaryUrl = !isPlaceholderUrl(title?.posterUrl) ? title.posterUrl : fallbackUrl;

  imgEl.dataset.fallbackStage = primaryUrl === fallbackUrl ? '1' : '0';
  imgEl.alt = `Póster de ${title?.title || 'película'}`;
  imgEl.onerror = () => {
    if (imgEl.dataset.fallbackStage === '0') {
      imgEl.dataset.fallbackStage = '1';
      imgEl.src = fallbackUrl;
    } else if (imgEl.dataset.fallbackStage === '1') {
      imgEl.dataset.fallbackStage = '2';
      imgEl.src = svgBackup;
    }
  };
  imgEl.src = primaryUrl;
}

function applyBannerImage(imgEl, title) {
  const fallbackUrl = getFallbackBannerUrl(title);
  const svgBackup = buildSvgDataUri(title?.title || 'WTWT', title?.category || 'Banner', 1280, 520);
  const primaryUrl = !isPlaceholderUrl(title?.bannerUrl) ? title.bannerUrl : fallbackUrl;

  imgEl.dataset.fallbackStage = primaryUrl === fallbackUrl ? '1' : '0';
  imgEl.alt = `Banner de ${title?.title || 'película'}`;
  imgEl.onerror = () => {
    if (imgEl.dataset.fallbackStage === '0') {
      imgEl.dataset.fallbackStage = '1';
      imgEl.src = fallbackUrl;
    } else if (imgEl.dataset.fallbackStage === '1') {
      imgEl.dataset.fallbackStage = '2';
      imgEl.src = svgBackup;
    }
  };
  imgEl.src = primaryUrl;
}

function currentUserKey() {
  return state.user ? `user_${state.user.id}` : 'guest';
}

function movieStarsStorageKey(movieId) {
  return `wtwt_movie_stars_${movieId}`;
}

function getMovieStarsMap(movieId) {
  if (!movieId) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(movieStarsStorageKey(movieId)) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function saveUserMovieStar(movieId, stars) {
  if (!movieId) return;
  const numStars = Math.min(5, Math.max(1, Number(stars) || 5));
  const map = getMovieStarsMap(movieId);
  map[currentUserKey()] = numStars;
  try {
    localStorage.setItem(movieStarsStorageKey(movieId), JSON.stringify(map));
  } catch {
  }
}

function getUserMovieStar(movieId) {
  const map = getMovieStarsMap(movieId);
  const val = Number(map[currentUserKey()]);
  return val >= 1 && val <= 5 ? val : null;
}

function movieCommentsStorageKey(movieId) {
  return `wtwt_movie_comments_${movieId}`;
}

function getMovieComments(movieId) {
  if (!movieId) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(movieCommentsStorageKey(movieId)) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveMovieComments(movieId, list) {
  if (!movieId) return;
  try {
    localStorage.setItem(movieCommentsStorageKey(movieId), JSON.stringify(list));
  } catch {
  }
}

function computeMovieStarSummary(movieId) {
  const map = { ...getMovieStarsMap(movieId) };
  const comments = getMovieComments(movieId);

  for (const item of comments) {
    const key = item.userKey || `comment_${item.id}`;
    if (!map[key] && item.rating) {
      map[key] = Number(item.rating);
    }
  }

  const values = Object.values(map)
    .map((v) => Number(v))
    .filter((v) => v >= 1 && v <= 5);

  if (values.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = values.reduce((acc, n) => acc + n, 0);
  return {
    average: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  };
}

function formatStarsText(stars) {
  const filled = Math.min(5, Math.max(1, Math.round(Number(stars) || 5)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function setRadioStarGroup(container, value) {
  const inputs = container.querySelectorAll('input[type="radio"]');
  inputs.forEach((input) => {
    input.checked = Number(input.value) === Number(value);
  });
}

function getRadioStarGroupValue(container) {
  const checked = container.querySelector('input[type="radio"]:checked');
  return checked ? Number(checked.value) : 5;
}

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

function updateMediaPreview(input, preview, status, label) {
  const url = input.value.trim();
  preview.hidden = true;
  preview.removeAttribute('src');
  input.dataset.imageState = url ? 'loading' : 'empty';
  status.dataset.state = input.dataset.imageState;

  if (!url) {
    status.textContent = `Pega la URL directa de la imagen del ${label}.`;
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    input.dataset.imageState = 'invalid';
    status.dataset.state = 'invalid';
    status.textContent = 'Escribe una URL válida que cargue una imagen.';
    return;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    input.dataset.imageState = 'invalid';
    status.dataset.state = 'invalid';
    status.textContent = 'La URL de la imagen debe comenzar con http:// o https://.';
    return;
  }

  status.textContent = 'Cargando vista previa…';
  preview.onload = () => {
    if (input.value.trim() !== url) return;
    input.dataset.imageState = 'valid';
    status.dataset.state = 'valid';
    status.textContent = 'Imagen cargada correctamente.';
    preview.hidden = false;
  };
  preview.onerror = () => {
    if (input.value.trim() !== url) return;
    input.dataset.imageState = 'invalid';
    status.dataset.state = 'invalid';
    status.textContent = 'No se pudo cargar una imagen. Usa el enlace directo al archivo, no una página web.';
  };
  preview.src = parsedUrl.href;
}

function updateMediaPreviews() {
  updateMediaPreview(els.posterUrlInput, els.posterUrlPreview, els.posterUrlStatus, 'póster');
  updateMediaPreview(els.bannerUrlInput, els.bannerUrlPreview, els.bannerUrlStatus, 'banner');
}

function updateHeroMetaLine(title) {
  if (!title) {
    els.movieMeta.textContent = 'Selecciona o busca un título para consultar todos sus datos.';
    return;
  }
  const { average, count } = computeMovieStarSummary(title.id);
  const starPart = count > 0 ? `★ ${average.toFixed(1)} (${count})` : '★ Sin calificar';
  const metaParts = [
    title.year,
    title.ageRating || 'Sin clasificación',
    title.duration || 'Duración no especificada',
    title.director ? `Dir. ${title.director}` : null,
    title.platform || null,
    title.language || null,
    starPart,
  ].filter(Boolean);
  els.movieMeta.textContent = metaParts.join(' · ');
}

function renderSidebarStars(title) {
  if (!title) {
    setRadioStarGroup(els.sidebarStarRating, 0);
    els.sidebarRatingAvg.textContent = '★ Sin votos';
    els.sidebarRatingHint.textContent = 'Selecciona una película para calificarla.';
    return;
  }

  const userStar = getUserMovieStar(title.id);
  const { average, count } = computeMovieStarSummary(title.id);

  setRadioStarGroup(els.sidebarStarRating, userStar || 0);
  setRadioStarGroup(els.commentStarRating, userStar || 5);

  if (count > 0) {
    els.sidebarRatingAvg.textContent = `★ ${average.toFixed(1)} / 5 (${count})`;
  } else {
    els.sidebarRatingAvg.textContent = '★ Sin votos';
  }

  if (userStar) {
    els.sidebarRatingHint.textContent = `Tu calificación en "${title.title}": ${formatStarsText(userStar)} (${userStar}/5)`;
  } else {
    els.sidebarRatingHint.textContent = `Haz clic en una estrella para calificar "${title.title}".`;
  }

  updateHeroMetaLine(title);
}

function renderSelectedTitle(title) {
  state.selectedTitle = title;
  resetCommentComposer();

  if (!title) {
    els.movieCategoryBadge.textContent = 'CATÁLOGO · WTWT';
    els.movieStatusBadge.textContent = 'Sin selección';
    els.movieStatusBadge.className = 'status-pill status-pendiente';
    els.movieTitle.textContent = 'No hay títulos disponibles';
    updateHeroMetaLine(null);
    els.bannerImg.src = buildSvgDataUri('WTWT', 'Explora el catálogo', 1280, 520);
    els.posterImg.src = buildSvgDataUri('WTWT', 'Sin póster', 450, 675);
    els.btnTrailer.hidden = true;
    els.btnEditOwn.hidden = true;
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
    renderSidebarStars(null);
    renderMovieComments();
    highlightSelectedCard();
    return;
  }

  document.title = `${title.title} · WTWT`;
  els.movieCategoryBadge.textContent = `DESTACADO · ${title.category || 'SIN CATEGORÍA'}`;
  els.movieStatusBadge.textContent = title.status === 'aprobado' ? 'Aprobado' : 'Pendiente';
  els.movieStatusBadge.className = `status-pill ${title.status === 'aprobado' ? 'status-aprobado' : 'status-pendiente'}`;
  els.movieTitle.textContent = title.title;

  applyBannerImage(els.bannerImg, title);
  applyPosterImage(els.posterImg, title);

  if (title.trailerUrl) {
    els.btnTrailer.href = title.trailerUrl;
    els.btnTrailer.hidden = false;
  } else {
    els.btnTrailer.hidden = true;
  }

  els.btnEditOwn.hidden = !canEditTitle(title);

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

  els.reviewsHeading.textContent = `Reseñas y comentarios · ${title.title}`;
  els.reviewsSubtitle.textContent = `Las estrellas y comentarios mostrados aquí pertenecen únicamente a "${title.title}".`;

  renderSidebarStars(title);
  renderMovieComments();
  highlightSelectedCard();
}

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

  const img = document.createElement('img');
  img.loading = 'lazy';
  applyPosterImage(img, title);
  posterWrap.append(img);

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

  const { average, count } = computeMovieStarSummary(title.id);
  const starText = count > 0 ? `★ ${average.toFixed(1)}` : '★ S/C';

  const meta = document.createElement('p');
  meta.className = 'title-card-meta';
  meta.textContent = [
    starText,
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
  viewBtn.textContent = 'Ver película';
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

els.sidebarStarRating.addEventListener('change', (event) => {
  const input = event.target.closest('input[type="radio"]');
  if (!input || !state.selectedTitle) return;

  const stars = Number(input.value);
  saveUserMovieStar(state.selectedTitle.id, stars);
  renderSidebarStars(state.selectedTitle);
  renderCatalog();
  showToast(`Calificaste "${state.selectedTitle.title}" con ${stars} estrella(s).`);
});

function renderMovieComments() {
  const movie = state.selectedTitle;
  els.userReviewsList.replaceChildren();

  if (!movie) {
    els.commentsCountBadge.textContent = '0 comentarios';
    els.userReviewsEmpty.hidden = false;
    return;
  }

  const comments = getMovieComments(movie.id);
  els.commentsCountBadge.textContent =
    comments.length === 1 ? '1 comentario' : `${comments.length} comentarios`;

  if (comments.length === 0) {
    els.userReviewsEmpty.textContent = `Aún no hay comentarios para "${movie.title}". ¡Sé el primero en comentar!`;
    els.userReviewsEmpty.hidden = false;
    return;
  }

  els.userReviewsEmpty.hidden = true;

  for (const item of comments) {
    const article = document.createElement('article');
    article.className = 'comment-item';

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    const authorName = item.username || 'Usuario';
    avatar.textContent = authorName.slice(0, 2).toUpperCase();

    const body = document.createElement('div');
    body.className = 'comment-body';

    const metaRow = document.createElement('div');
    metaRow.className = 'comment-meta-row';

    const authorWrap = document.createElement('div');
    authorWrap.className = 'comment-author-wrap';

    const authorEl = document.createElement('span');
    authorEl.className = 'comment-author';
    authorEl.textContent = authorName;

    const starsEl = document.createElement('span');
    starsEl.className = 'comment-stars';
    starsEl.textContent = formatStarsText(item.rating);

    authorWrap.append(authorEl, starsEl);

    const dateEl = document.createElement('span');
    dateEl.className = 'comment-date';
    dateEl.textContent = item.dateLabel || 'Reciente';

    metaRow.append(authorWrap, dateEl);

    const textEl = document.createElement('p');
    textEl.className = 'comment-text';
    textEl.textContent = item.comment;

    body.append(metaRow, textEl);

    const isOwner =
      item.userKey === currentUserKey() ||
      (state.user && Number(item.userId) === Number(state.user.id));

    if (isOwner) {
      const actions = document.createElement('div');
      actions.className = 'comment-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-action btn-watchlist btn-compact';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => {
        els.reviewIdInput.value = String(item.id);
        setRadioStarGroup(els.commentStarRating, item.rating || 5);
        els.reviewCommentInput.value = item.comment || '';
        els.btnCancelReview.hidden = false;
        els.reviewCommentInput.focus();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-action btn-danger btn-compact';
      delBtn.textContent = 'Eliminar';
      delBtn.addEventListener('click', async () => {
        const token = getToken();
        if (token && item.backendSync) {
          try {
            await api(`/reviews/${item.id}`, { method: 'DELETE', token });
          } catch {
          }
        }
        const next = getMovieComments(movie.id).filter((c) => String(c.id) !== String(item.id));
        saveMovieComments(movie.id, next);
        renderSidebarStars(movie);
        renderMovieComments();
        renderCatalog();
        showToast('Comentario eliminado.');
      });

      actions.append(editBtn, delBtn);
      body.append(actions);
    }

    article.append(avatar, body);
    els.userReviewsList.append(article);
  }
}

function resetCommentComposer() {
  clearFormErrors(els.reviewForm);
  els.reviewIdInput.value = '';
  els.reviewCommentInput.value = '';
  const currentStar = state.selectedTitle ? getUserMovieStar(state.selectedTitle.id) || 5 : 5;
  setRadioStarGroup(els.commentStarRating, currentStar);
  els.btnCancelReview.hidden = true;
}

els.btnCancelReview.addEventListener('click', resetCommentComposer);

els.reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const movie = state.selectedTitle;
  if (!movie) return;

  const comment = els.reviewCommentInput.value.trim();
  if (!comment) {
    showFormError(
      els.reviewForm,
      new ApiError('Escribe un comentario para publicar tu reseña.', 400, [
        { field: 'comment', message: 'El comentario no puede estar vacío' },
      ]),
    );
    return;
  }

  const stars = getRadioStarGroupValue(els.commentStarRating);
  const editId = els.reviewIdInput.value.trim();

  setBusy(els.reviewForm, true);
  try {
    let backendId = null;
    let backendSync = false;
    const token = getToken();

    if (token) {
      try {
        const res = await api(editId ? `/reviews/${editId}` : '/reviews', {
          method: editId ? 'PATCH' : 'POST',
          body: editId
            ? { rating: stars, comment }
            : { movieId: movie.id, rating: stars, comment },
          token,
        });
        if (res?.data?.id) {
          backendId = res.data.id;
          backendSync = true;
        }
      } catch {
      }
    }

    saveUserMovieStar(movie.id, stars);

    const existing = getMovieComments(movie.id);
    const nowLabel = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (editId) {
      const updated = existing.map((item) =>
        String(item.id) === String(editId)
          ? { ...item, rating: stars, comment, dateLabel: `${nowLabel} (editado)` }
          : item,
      );
      saveMovieComments(movie.id, updated);
    } else {
      const entry = {
        id: backendId || Date.now(),
        movieId: movie.id,
        userId: state.user?.id || null,
        userKey: currentUserKey(),
        username: state.user?.username || 'Visitante',
        rating: stars,
        comment,
        dateLabel: nowLabel,
        backendSync,
      };
      saveMovieComments(movie.id, [entry, ...existing]);
    }

    resetCommentComposer();
    renderSidebarStars(movie);
    renderMovieComments();
    renderCatalog();
    showToast(editId ? 'Comentario actualizado.' : 'Comentario publicado.');
  } finally {
    setBusy(els.reviewForm, false);
  }
});

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
    els.titleModalHeading.textContent = 'Proponer nueva película';
    els.titleModalSubtitle.textContent =
      state.user.role === ROLES.ADMIN
        ? 'Como administrador, el título se publicará directamente como aprobado.'
        : 'Los títulos propuestos por usuarios quedan pendientes hasta que un administrador los apruebe.';
    els.titleIdField.value = '';
  }

  updateMediaPreviews();
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
  clearFormErrors(els.titleForm);
  const invalidMediaField = [
    { input: els.posterUrlInput, label: 'póster' },
    { input: els.bannerUrlInput, label: 'banner' },
  ].find(({ input }) => input.value.trim() && input.dataset.imageState !== 'valid');

  if (invalidMediaField) {
    const message = `La URL del ${invalidMediaField.label} debe cargar una imagen directa antes de guardar.`;
    showFormError(
      els.titleForm,
      new ApiError(message, 0, [{ field: invalidMediaField.input.name, message }]),
    );
    invalidMediaField.input.focus();
    return;
  }

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

for (const [input, preview, status, label] of [
  [els.posterUrlInput, els.posterUrlPreview, els.posterUrlStatus, 'póster'],
  [els.bannerUrlInput, els.bannerUrlPreview, els.bannerUrlStatus, 'banner'],
]) {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    input.closest('.field')?.querySelector('.field-error')?.remove();
    updateMediaPreview(input, preview, status, label);
  });
}

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
