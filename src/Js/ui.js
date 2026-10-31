export function clearFormErrors(form) {
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  const alert = form.querySelector('.form-alert');
  if (alert) {
    alert.textContent = '';
    alert.hidden = true;
  }
}

export function showFormError(form, err) {
  clearFormErrors(form);

  const general = [];
  for (const { field, message } of err.errors || []) {
    const input = field ? form.querySelector(`[name="${CSS.escape(field)}"]`) : null;
    if (!input) {
      general.push(message);
      continue;
    }
    input.setAttribute('aria-invalid', 'true');
    const hint = document.createElement('p');
    hint.className = 'field-error';
    hint.textContent = message;
    input.closest('.field')?.append(hint);
  }

  const alert = form.querySelector('.form-alert');
  if (alert) {
    alert.textContent = general.length ? general.join(' ') : err.message;
    alert.hidden = false;
  }
}

export function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? 'Espera…' : button.dataset.label;
}

