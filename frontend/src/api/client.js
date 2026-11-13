import axios from 'axios';

const api = axios.create({
  baseURL: '', // Uses Vite proxy to http://127.0.0.1:8000
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tradeops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Correlation-ID'] = `web-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return config;
});

export default api;

