import { api, ApiError } from './api.js';
import { saveToken } from './session.js';
import { showFormError, setBusy } from './ui.js';

const form = document.querySelector('#login-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  setBusy(form, true);

  try {
    const json = await api('/auth/login', {
      method: 'POST',
      body: {
        email: data.get('email'),
        password: data.get('password'),
      },
    });
    saveToken(json.data.token, data.get('remember') === 'on');
    location.href = './src/html/peliculas.html';
  } catch (err) {
    showFormError(form, err instanceof ApiError ? err : new ApiError(err.message));
    form.querySelector('#password').value = '';
  } finally {
    setBusy(form, false);
  }
});
