import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage if present
api.interceptors.request.use((config) => {
  const isAdminRequest = config.url?.includes('/admin');
  const token = isAdminRequest
    ? (localStorage.getItem('adminToken') || localStorage.getItem('token'))
    : localStorage.getItem('token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/admin/')) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      } else if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
