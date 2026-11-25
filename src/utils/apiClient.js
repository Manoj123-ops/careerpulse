export async function apiRequest(url, options = {}) {
  const { method = 'GET', body } = options;
  const fetchOptions = {
    method,
    headers: {},
  };

  if (body !== undefined) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const resp = await fetch(url, fetchOptions);
  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await resp.json();
    if (!resp.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed with status ${resp.status}.`);
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
