import { fetchCurrentUser, clearSession } from './session.js';
import { ROLES } from './roles.js';

const LOGIN_URL = new URL('../../Index.html', import.meta.url).href;
const REGISTER_URL = new URL('../html/registro.html', import.meta.url).href;
const ADMIN_URL = new URL('../html/admin.html', import.meta.url).href;
const CATALOG_URL = new URL('../html/peliculas.html', import.meta.url).href;

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
    const registerLink = document.createElement('a');
    registerLink.href = REGISTER_URL;
    registerLink.className = 'btn-nav-role';
    registerLink.textContent = 'Crear cuenta';

    const loginLink = document.createElement('a');
    loginLink.href = LOGIN_URL;
    loginLink.className = 'btn-entrar';
    loginLink.textContent = 'Entrar';

    container.append(registerLink, loginLink);
    return;
  }

  if (user.role === ROLES.ADMIN) {
    const isAdminPage = location.pathname.toLowerCase().endsWith('admin.html');
    const switchLink = document.createElement('a');
    switchLink.href = isAdminPage ? CATALOG_URL : ADMIN_URL;
    switchLink.className = 'btn-nav-role';
    switchLink.textContent = isAdminPage ? 'Ver vista usuario' : 'Panel Admin';
    container.append(switchLink);

    const badge = document.createElement('span');
    badge.className = 'role-badge';
    badge.textContent = 'Admin';
    container.append(badge);
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
