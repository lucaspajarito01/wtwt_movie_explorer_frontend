import { fetchCurrentUser, clearSession } from './session.js';

const LOGIN_URL = new URL('../../Index.html', import.meta.url).href;

const slot = document.querySelector('[data-auth-slot]');
if (slot) renderSlot(slot);

async function renderSlot(container) {
  let user = null;
  try {
    user = await fetchCurrentUser();
  } catch {
  }

  container.replaceChildren();

  if (!user) {
    const link = document.createElement('a');
    link.href = LOGIN_URL;
    link.className = 'btn-entrar';
    link.textContent = 'Entrar';
    container.append(link);
    return;
  }

  const name = document.createElement('span');
  name.className = 'user-name';
  name.textContent = user.username;

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'btn-entrar btn-logout';
  logout.textContent = 'Cerrar sesión';
  logout.addEventListener('click', () => {
    clearSession();
    location.href = LOGIN_URL;
  });

  container.append(name, logout);
}

