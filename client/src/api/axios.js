import axios from 'axios';
import { getDecryptedKey } from '../utils/keyManager';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
});

// ADD THIS INTERCEPTOR
api.interceptors.request.use((config) => {
  // Attach JWT Authorization token if present
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Set unified active LLM provider headers
  const provider = localStorage.getItem('active_llm_provider') || 'groq';
  const apiKey = getDecryptedKey(provider) || getDecryptedKey('groq');
  const textModel = localStorage.getItem(`${provider}_text_model`);
  const visionModel = localStorage.getItem(`${provider}_vision_model`);
  const ollamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434';

  config.headers['x-active-provider'] = provider;
  if (apiKey) {
    config.headers['x-active-api-key'] = apiKey;
    config.headers['x-groq-api-key'] = apiKey; // Backward compatibility
  }
  if (textModel) config.headers['x-active-text-model'] = textModel;
  if (visionModel) config.headers['x-active-vision-model'] = visionModel;
  config.headers['x-ollama-url'] = ollamaUrl;

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

      if (status === 429) {
        const activeProvider = localStorage.getItem('active_llm_provider') || 'groq';
        window.dispatchEvent(new CustomEvent('scholarsync:rate-limit-triggered', {
          detail: { provider: activeProvider }
        }));
      }

      console.warn('[API ERROR]', cfg.method?.toUpperCase(), cfg.url, status, err.response?.data);
    } catch (e) {
      console.warn('[API ERROR] (failed to log) ', err.message);
    }
    return Promise.reject(err);
  }
);

export default api;
