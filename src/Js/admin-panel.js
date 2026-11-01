import { api, ApiError } from './api.js';
import { getToken, clearSession } from './session.js';
import { showFormError, setBusy, clearFormErrors } from './ui.js';

const LOGIN_URL = new URL('../../Index.html', import.meta.url).href;

const messageEl = document.querySelector('#panel-message');
const pendingList = document.querySelector('#pending-list');
const categoryList = document.querySelector('#category-list');
const categoryForm = document.querySelector('#category-form');
const submitButton = categoryForm.querySelector('button[type="submit"]');
const cancelButton = document.querySelector('#category-cancel');
const nameInput = categoryForm.querySelector('[name="name"]');
const descriptionInput = categoryForm.querySelector('[name="description"]');

let editingId = null;

function notify(text, isError = false) {
  messageEl.textContent = text;
  messageEl.dataset.kind = isError ? 'error' : 'ok';
  messageEl.hidden = false;
}

function renderEmpty(list, text) {
  const p = document.createElement('p');
  p.className = 'admin-empty';
  p.textContent = text;
  list.replaceChildren(p);
}

function handleError(err) {
  if (err instanceof ApiError && err.status === 401) {
    clearSession();
    location.replace(LOGIN_URL);
    return;
  }
  notify(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.', true);
}

/* ---------- Películas pendientes ---------- */

function renderPending(title) {
  const li = document.createElement('li');
  li.className = 'admin-item';

  const info = document.createElement('span');
  info.textContent = `${title.title} · ${title.year} · ${title.category ?? 'Sin categoría'}`;

  const approveBtn = document.createElement('button');
  approveBtn.type = 'button';
  approveBtn.className = 'btn btn-primary';
  approveBtn.textContent = 'Aprobar';
  approveBtn.addEventListener('click', () => approveTitle(title.id, approveBtn));

  const rejectBtn = document.createElement('button');
  rejectBtn.type = 'button';
  rejectBtn.className = 'btn';
  rejectBtn.textContent = 'Rechazar';
  rejectBtn.addEventListener('click', () => rejectTitle(title.id, title.title));

  li.append(info, approveBtn, rejectBtn);
  return li;
}

async function loadPending() {
  try {
    const json = await api('/titles?estado=pendiente&limit=50', { token: getToken() });
    if (json.data.length === 0) {
      renderEmpty(pendingList, 'No hay Películas pendientes.');
      return;
    }
    pendingList.replaceChildren(...json.data.map(renderPending));
  } catch (err) {
    handleError(err);
  }
}

async function approveTitle(id, button) {
  button.disabled = true;
  try {
    await api(`/titles/${id}/approve`, { method: 'PATCH', token: getToken() });
    notify('Título aprobado.');
    await loadPending();
  } catch (err) {
    handleError(err);
    button.disabled = false;
  }
}

async function rejectTitle(id, name) {
  if (!confirm(`¿Rechazar y eliminar "${name}"? También se borrarán sus reseñas.`)) return;
  try {
    await api(`/titles/${id}`, { method: 'DELETE', token: getToken() });
    notify('Título eliminado.');
    await loadPending();
  } catch (err) {
    handleError(err);
  }
}

/* ---------- Categorías ---------- */

function resetCategoryForm() {
  editingId = null;
  categoryForm.reset();
  submitButton.dataset.label = 'Crear categoría';
  submitButton.textContent = 'Crear categoría';
  cancelButton.hidden = true;
  clearFormErrors(categoryForm);
}

function startEdit(category) {
  editingId = category.id;
  nameInput.value = category.name;
  descriptionInput.value = category.description ?? '';
  submitButton.dataset.label = 'Guardar cambios';
  submitButton.textContent = 'Guardar cambios';
  cancelButton.hidden = false;
  clearFormErrors(categoryForm);
  nameInput.focus();
}

function renderCategory(category) {
  const li = document.createElement('li');
  li.className = 'admin-item';

  const info = document.createElement('span');
  info.textContent = category.name;

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => startEdit(category));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', () => removeCategory(category));

  li.append(info, editBtn, deleteBtn);
  return li;
}

async function loadCategories() {
  try {
    const json = await api('/categories');
    if (json.data.length === 0) {
      renderEmpty(categoryList, 'No hay categorías.');
      return;
    }
    categoryList.replaceChildren(...json.data.map(renderCategory));
  } catch (err) {
    handleError(err);
  }
}

async function removeCategory(category) {
  if (!confirm(`¿Eliminar la categoría "${category.name}"? Sus títulos quedarán sin categoría.`)) return;
  try {
    await api(`/categories/${category.id}`, { method: 'DELETE', token: getToken() });
    if (editingId === category.id) resetCategoryForm();
    notify('Categoría eliminada.');
    await loadCategories();
  } catch (err) {
    handleError(err);
  }
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {
    name: nameInput.value,
    description: descriptionInput.value.trim() || null,
  };

  setBusy(categoryForm, true);
  try {
    if (editingId === null) {
      await api('/categories', { method: 'POST', body, token: getToken() });
      notify('Categoría creada.');
    } else {
      await api(`/categories/${editingId}`, { method: 'PATCH', body, token: getToken() });
      notify('Categoría actualizada.');
    }
    resetCategoryForm();
    await loadCategories();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      handleError(err);
      return;
    }
    showFormError(categoryForm, err instanceof ApiError ? err : new ApiError(err.message));
  } finally {
    setBusy(categoryForm, false);
  }
});

cancelButton.addEventListener('click', resetCategoryForm);

export function initAdminPanel() {
  loadPending();
  loadCategories();
}