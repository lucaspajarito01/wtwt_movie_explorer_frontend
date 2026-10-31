import { api, ApiError } from './api.js';
import { saveToken } from './session.js';
import { showFormError, setBusy } from './ui.js';

const form = document.querySelector('#register-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const password = data.get('password');

  if (password !== data.get('confirm')) {
    showFormError(form, new ApiError('Revisa los datos del formulario.', 400, [
      { field: 'confirm', message: 'Las contraseñas no coinciden' },
    ]));
    return;
  }

  setBusy(form, true);
  try {
    const json = await api('/auth/register', {
      method: 'POST',
      body: {
        username: data.get('username'),
        email: data.get('email'),
        password,
      },
    });
    saveToken(json.data.token, data.get('remember') === 'on');
    location.href = '../html/peliculas.html';
  } catch (err) {
    showFormError(form, err instanceof ApiError ? err : new ApiError(err.message));
    form.querySelector('#password').value = '';
    form.querySelector('#confirm').value = '';
  } finally {
    setBusy(form, false);
  }
});

