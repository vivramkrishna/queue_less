const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(path, options = {}, admin = false) {
  const token = localStorage.getItem(admin ? 'lloyds_admin_token' : 'lloyds_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'Something went wrong')
  return data
}

export const api = {
  login: (email, password) => request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/me'),
  account: (id) => request(`/accounts/${id}`),
  chat: (message) => request('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  adminLogin: (username, password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  customers: () => request('/admin/customers', {}, true),
  customer: (id) => request(`/admin/customers/${id}`, {}, true),
  conversations: (params = '') => request(`/admin/conversations${params}`, {}, true),
}
