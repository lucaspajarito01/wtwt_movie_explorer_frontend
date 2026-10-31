import { fetchCurrentUser } from './session.js';
import { ROLES } from './roles.js';

const LOGIN_URL = new URL('../../Index.html', import.meta.url).href;
const status = document.querySelector('#guard-status');
const content = document.querySelector('#admin-content');

try {
  const user = await fetchCurrentUser();

  if (!user) {
    location.replace(LOGIN_URL);
  } else if (user.role !== ROLES.ADMIN) {
    status.textContent = 'No tienes permisos para ver esta página.';
  } else {
    status.hidden = true;
    content.hidden = false;
  }
} catch {
  status.textContent = 'No se pudo verificar tu sesión. Revisa que el servidor esté en marcha.';
}

