import axios from 'axios';

export const TOKEN_KEY = 'sweety.token';

const api = axios.create({
  // In development this is '/api' and Vite proxies it to the Express server,
  // so the browser never makes a cross-origin request.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on anything other than login/register means the session is gone.
// Clear the token and let the app redirect to the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('sweety:session-expired'));
    }

    return Promise.reject(error);
  }
);

/** Pull the human-readable message out of the API's error envelope. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Is the API running?';
  }
  return error?.message || fallback;
}

/** Field-level errors returned by the API, keyed by field name. */
export function getFieldErrors(error) {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return list.reduce((acc, item) => {
    if (item?.field && !acc[item.field]) acc[item.field] = item.message;
    return acc;
  }, {});
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
};

export const readingsApi = {
  create: (payload) => api.post('/readings', payload).then((r) => r.data.data.reading),
  list: (params = {}) => api.get('/readings', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/readings/${id}`).then((r) => r.data.data.reading),
  update: (id, payload) => api.put(`/readings/${id}`, payload).then((r) => r.data.data.reading),
  remove: (id) => api.delete(`/readings/${id}`).then((r) => r.data.data),
};

export const reportsApi = {
  daily: (date) => api.get('/reports/daily', { params: { date } }).then((r) => r.data.data.report),
  monthToDate: (date) =>
    api.get('/reports/month-to-date', { params: { date } }).then((r) => r.data.data.report),
  previousMonth: (date) =>
    api.get('/reports/monthly', { params: { date } }).then((r) => r.data.data.report),
};

export default api;
