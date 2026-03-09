/**
 * Cache Service
 * Handles communication with the backend cache API
 * Stores and retrieves extracted content and generated outputs
 */

import api from '../api/axios';

const CACHE_VERSION = 1;

/**
 * Get cached extraction for a file
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID
 * @returns {Promise<{cached: boolean, data?: object}>}
 */
export const getCachedExtraction = async (fileId, userId) => {
  try {
    const response = await api.get(`/cache/extraction/${fileId}`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return { cached: false };
    }
    console.error('Cache fetch error:', error);
    return { cached: false, error: error.message };
  }
};

/**
 * Save extracted content to cache
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID
 * @param {string} fileName - File name
 * @param {string} assignmentId - Assignment ID
 * @param {object} extractedContent - Extracted content data
 * @returns {Promise<{success: boolean}>}
 */
export const saveExtraction = async (fileId, userId, fileName, assignmentId, extractedContent) => {
  try {
    const response = await api.post('/cache/extraction', {
      userId,
      fileId,
      fileName,
      assignmentId,
      extractedContent
    });
    return response.data;
  } catch (error) {
    console.error('Cache save error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save generated content (quiz, flashcards, etc.) to cache
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID
 * @param {string} mode - Content type (quiz, flashcards, explain, draft)
 * @param {any} content - Generated content
 * @returns {Promise<{success: boolean}>}
 */
export const saveGeneratedContent = async (fileId, userId, mode, content) => {
  try {
    const response = await api.patch(`/cache/extraction/${fileId}/generated`, {
      userId,
      mode,
      content
    });
    return response.data;
  } catch (error) {
    console.error('Generated content cache error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear cache for a file or specific mode
 * @param {string} fileId - Google Drive file ID (or 'all' for all files)
 * @param {string} userId - User ID
 * @param {string} mode - Optional: specific mode to clear (quiz, flashcards, explain, draft, extraction, all)
 * @returns {Promise<{success: boolean}>}
 */
export const clearCache = async (fileId, userId, mode = 'all') => {
  try {
    const response = await api.delete(`/cache/extraction/${fileId}`, {
      params: { userId, mode }
    });
    return response.data;
  } catch (error) {
    console.error('Cache clear error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get cache stats for user
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
export const getCacheStats = async (userId) => {
  try {
    const response = await api.get('/cache/stats', {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Cache stats error:', error);
    return { totalCachedFiles: 0, files: [] };
  }
};

/**
 * Check if content needs regeneration based on version
 * @param {object} cacheData - Cached data with version
 * @returns {boolean}
 */
export const needsRegeneration = (cacheData) => {
  if (!cacheData) return true;
  return cacheData.version !== CACHE_VERSION;
};

export default {
  getCachedExtraction,
  saveExtraction,
  saveGeneratedContent,
  clearCache,
  getCacheStats,
  needsRegeneration
};
