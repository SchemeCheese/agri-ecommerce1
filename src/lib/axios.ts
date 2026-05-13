// src/lib/axios.ts
import axios from 'axios';
import { API_BASE_URL } from './runtime-config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // No response means the request never reached the server
      console.error(
        `[API] Network error — could not reach ${API_BASE_URL}. ` +
        'Is the backend running? Check: cd BE/agri-connect-be && npm run start:dev',
        error.message,
      );
    } else {
      console.error(
        `[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response.status}`,
        error.response.data,
      );
    }
    return Promise.reject(error);
  },
);

export default api;