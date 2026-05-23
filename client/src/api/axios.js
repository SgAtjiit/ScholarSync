import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
});

// ADD THIS INTERCEPTOR
api.interceptors.request.use((config) => {
  // Check if user has saved a key in browser storage
  const key = localStorage.getItem('groq_api_key');

  if (key) {
    // Attach it to the specific header the backend expects
    config.headers['x-groq-api-key'] = key;
  }
  return config;
});

// Log failed responses to help diagnose deployed 4xx/5xx issues
api.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      const cfg = err.config || {};
      const status = err.response?.status;
      const url = cfg.url || '';
      const isExpectedCacheMiss =
        status === 404 &&
        typeof url === 'string' &&
        url.includes('/cache/extraction/');

      if (isExpectedCacheMiss) {
        return Promise.reject(err);
      }

      console.warn('[API ERROR]', cfg.method?.toUpperCase(), cfg.url, status, err.response?.data);
    } catch (e) {
      console.warn('[API ERROR] (failed to log) ', err.message);
    }
    return Promise.reject(err);
  }
);

export default api;
