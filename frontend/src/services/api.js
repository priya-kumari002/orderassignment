const BASE = import.meta.env.VITE_API_URL || '';

function token() {
  return localStorage.getItem('om_token') || '';
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),
  getSummary: () => request('/api/dashboard/summary'),
  getOrders: ({ page = 1, limit = 10, status = '', q = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    return request(`/api/orders?${params.toString()}`);
  },
  getOrder: (id) => request(`/api/orders/${id}`),
  createOrder: (payload, idempotencyKey) =>
    request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  updateStatus: (id, status) =>
    request(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getCustomers: () => request('/api/customers'),
  getProducts: () => request('/api/products'),
  createCustomer: (payload) =>
    request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  createProduct: (payload) =>
    request('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
};

export default api;
