import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Dev token (matches backend `DEV_USER_ID` when env=local)
api.interceptors.request.use((config) => {
  config.headers.Authorization = config.headers.Authorization || 'Bearer dev';
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[api]', err?.config?.url, err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  },
);

export default api;
