const TOKEN_KEY = 'cp_admin_token';

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export async function apiRequest(url, options = {}) {
  const { method = 'GET', body } = options;
  const headers = {};
  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
    credentials: 'include',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const resp = await fetch(url, fetchOptions);
  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await resp.json();
    if (!resp.ok || data?.ok === false) {
      const err = new Error(data?.error || `Request failed with status ${resp.status}.`);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  const text = await resp.text();
  throw new Error(
    `API (${url}) returned status ${resp.status} instead of JSON. Ensure /api serverless functions are deployed on Vercel or run "npm run dev" locally. ${
      text ? text.slice(0, 120) : ''
    }`
  );
}

export function postApiJson(url, payload) {
  return apiRequest(url, { method: 'POST', body: payload });
}
