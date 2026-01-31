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

export default api;