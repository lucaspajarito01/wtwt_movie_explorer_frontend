import { API_BASE } from './config.js';

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa que esté en marcha.');
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
  }

  if (!response.ok) {
    throw new ApiError(
      json?.message || `Error ${response.status} al comunicarse con el servidor.`,
      response.status,
      Array.isArray(json?.errors) ? json.errors : [],
    );
  }
  return json;
}

