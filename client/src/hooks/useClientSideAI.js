/**
 * useClientSideAI Hook
 * Main hook for client-side AI processing with MongoDB caching.
 * Combines PDF extraction, vision processing, and AI generation.
 * Caches results to avoid redundant processing.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { extractDocumentContext } from '../services/contextExtractor';
import { generateContent, generateContentStream, chatWithContent } from '../services/aiGenerationService';
import { hasApiKey, getUsageSummary } from '../services/groqService';
import { withRateLimit, getRateLimiterState, subscribeToRateLimiter } from '../services/rateLimiter';
import { 
    getCachedExtraction, 
    saveExtraction, 
    saveGeneratedContent as saveCachedGeneration,
    clearCache 
} from '../services/cacheService';
import api from '../api/axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

/**
 * Hook for client-side AI processing with caching
 * @param {Object} options - Hook options
 * @param {string} options.userId - User ID for authentication
 * @returns {Object} - Hook state and methods
 */
export const useClientSideAI = ({ userId }) => {
    // State
    const [extractedContent, setExtractedContent] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(null);
    const [extractionError, setExtractionError] = useState(null);
    
    const [generatedContent, setGeneratedContent] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingMode, setGeneratingMode] = useState(null);
    const [generationError, setGenerationError] = useState(null);
    
    const [rateLimiterState, setRateLimiterState] = useState(getRateLimiterState());
    const [usageSummary, setUsageSummary] = useState(null);
    
    // Cache state
    const [isCached, setIsCached] = useState(false);
    const [isLoadingCache, setIsLoadingCache] = useState(false);
    const [currentFileId, setCurrentFileId] = useState(null);
    const [currentAssignmentId, setCurrentAssignmentId] = useState(null);

    // Refs
    const extractionAbortRef = useRef(null);

    // Subscribe to rate limiter
    useEffect(() => {
        const unsubscribe = subscribeToRateLimiter(setRateLimiterState);
        return unsubscribe;
    }, []);

    // Refresh usage summary
    const refreshUsage = useCallback(() => {
        setUsageSummary(getUsageSummary());
    }, []);

    /**
     * Check if API key is configured
     */
    const checkApiKey = useCallback(() => {
        if (!hasApiKey()) {
            throw new Error('Please set your Groq API key in Settings before using AI features.');
        }
        return true;
    }, []);

    /**
     * Load cached extraction and generated content
     * @param {Object} options - Load options
     * @param {string} options.fileId - Google Drive file ID
     * @param {string} options.assignmentId - Assignment ID
     * @returns {Promise<{loaded: boolean, data?: object}>}
     */
    const loadFromCache = useCallback(async ({ fileId, assignmentId }) => {
        if (!fileId || !userId) {
            return { loaded: false };
        }

        setIsLoadingCache(true);
        setCurrentFileId(fileId);
        setCurrentAssignmentId(assignmentId);

        try {
            const cacheResult = await getCachedExtraction(fileId, userId);
            
            if (cacheResult.cached && cacheResult.data) {
                // Load cached extraction
                setExtractedContent(cacheResult.data.extractedContent);
                setIsCached(true);
                
                // Load cached generated content
                if (cacheResult.data.generatedContent) {
                    setGeneratedContent(cacheResult.data.generatedContent);
                }
                
                console.log('Loaded from cache:', cacheResult.data.fileName);
                return { loaded: true, data: cacheResult.data };
            }
            
            return { loaded: false };
        } catch (error) {
            console.error('Failed to load cache:', error);
            return { loaded: false, error: error.message };
        } finally {
            setIsLoadingCache(false);
        }
    }, [userId]);

    /**
     * Extract content from a document (checks cache first)
     * @param {Object} options - Extraction options
     * @param {string} options.fileId - Google Drive file ID
     * @param {string} options.fileName - File name
     * @param {string} options.assignmentId - Assignment ID
     * @param {boolean} options.useVision - Whether to use vision API
     * @param {boolean} options.forceRefresh - Skip cache and re-extract
     * @returns {Promise<Object>}
     */
    const extractContent = useCallback(async ({ fileId, fileName, assignmentId, useVision = true, forceRefresh = false }) => {
        if (!fileId) {
            throw new Error('File ID is required');
        }

        setCurrentFileId(fileId);
        setCurrentAssignmentId(assignmentId);

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cacheResult = await loadFromCache({ fileId, assignmentId });
            if (cacheResult.loaded) {
                setExtractionProgress({ stage: 'complete', progress: 100, message: 'Loaded from cache!' });
                setTimeout(() => setExtractionProgress(null), 1500);
                return cacheResult.data.extractedContent;
            }
        }

        setIsExtracting(true);
        setExtractionProgress({ stage: 'starting', progress: 0, message: 'Starting extraction...' });
        setExtractionError(null);

        try {
            if (useVision) {
                checkApiKey();
            }

            const result = await withRateLimit(
                async () => {
                    return extractDocumentContext({
                        fileId,
                        userId,
                        fileName,
                        serverUrl: SERVER_URL,
                        onProgress: setExtractionProgress,
                        useVision,
                    });
                },
                { isHeavy: true }
            );

            setExtractedContent(result);
            setIsCached(false);
            
            // Save to cache in background
            saveExtraction(fileId, userId, fileName, assignmentId, result)
                .then(res => {
                    if (res.success) {
                        setIsCached(true);
                        console.log('Extraction cached successfully');
                    }
                })
                .catch(err => console.error('Failed to cache extraction:', err));
            
            refreshUsage();
            return result;
        } catch (error) {
            setExtractionError(error.message);
            throw error;
        } finally {
            setIsExtracting(false);
            setExtractionProgress(null);
        }
    }, [userId, checkApiKey, refreshUsage, loadFromCache]);

    /**
     * Generate AI content (draft, explain, quiz, flashcards)
     * @param {Object} options - Generation options
     * @param {string} options.mode - Generation mode
     * @param {Object} options.quizOptions - Quiz-specific options
     * @param {string} options.assignmentTitle - Assignment title
     * @param {string} options.courseName - Course name
     * @param {string} options.content - Content to use (optional, uses extractedContent if not provided)
     * @param {boolean} options.stream - Whether to stream the response
     * @param {Function} options.onChunk - Streaming chunk callback
     * @param {boolean} options.forceRefresh - Skip cache and regenerate
     * @returns {Promise<Object>}
     */
    const generate = useCallback(async ({
        mode,
        quizOptions,
        assignmentTitle,
        courseName,
        content,
        stream = false,
        onChunk,
        forceRefresh = false,
    }) => {
        // Check if already cached in state (unless force refresh)
        if (!forceRefresh && generatedContent[mode]) {
            console.log(`Using cached ${mode} from state`);
            return { content: generatedContent[mode], cached: true };
        }
        
        checkApiKey();

        const contentToUse = content || extractedContent?.content;
        if (!contentToUse) {
            throw new Error('No content available. Please extract document content first.');
        }

        setIsGenerating(true);
        setGeneratingMode(mode);
        setGenerationError(null);

        try {
            const result = await withRateLimit(
                async () => {
                    if (stream && onChunk && (mode === 'draft' || mode === 'explain')) {
                        return generateContentStream({
                            content: contentToUse,
                            mode,
                            assignmentTitle,
                            courseName,
                        }, onChunk);
                    }

                    return generateContent({
                        content: contentToUse,
                        mode,
                        quizOptions,
                        assignmentTitle,
                        courseName,
                    });
                },
                { isHeavy: true }
            );

            setGeneratedContent(prev => ({
                ...prev,
                [mode]: result.content,
            }));

            // Save generated content to cache in background
            if (currentFileId) {
                saveCachedGeneration(currentFileId, userId, mode, result.content)
                    .then(res => {
                        if (res.success) {
                            console.log(`${mode} cached successfully`);
                        }
                    })
                    .catch(err => console.error(`Failed to cache ${mode}:`, err));
            }

            refreshUsage();
            return result;
        } catch (error) {
            setGenerationError(error.message);
            throw error;
        } finally {
            setIsGenerating(false);
            setGeneratingMode(null);
        }
    }, [extractedContent, generatedContent, currentFileId, userId, checkApiKey, refreshUsage]);

    /**
     * Chat with document content
     * @param {string} question - User question
     * @param {Array} history - Chat history
     * @param {string} content - Content to use (optional)
     * @returns {Promise<string>}
     */
    const chat = useCallback(async (question, history = [], content = null) => {
        checkApiKey();

        const contentToUse = content || extractedContent?.content;
        if (!contentToUse) {
            throw new Error('No content available. Please extract document content first.');
        }

        const answer = await withRateLimit(
            async () => chatWithContent(contentToUse, question, history),
            { isHeavy: false }
        );

        refreshUsage();
        return answer;
    }, [extractedContent, checkApiKey, refreshUsage]);

    /**
     * Save generated content to backend (for persistence)
     * @param {Object} options - Save options
     * @param {string} options.assignmentId - Assignment ID
     * @param {string} options.mode - Content mode
     * @param {string} options.content - Generated content
     * @returns {Promise<Object>}
     */
    const saveToBackend = useCallback(async ({ assignmentId, mode, content }) => {
        const response = await api.post('/ai/save-solution', {
            assignmentId,
            mode,
            content: typeof content === 'object' ? JSON.stringify(content) : content,
            generatedAt: new Date().toISOString(),
            source: 'client-side',
        });
        return response.data;
    }, []);

    /**
     * Cancel ongoing extraction
     */
    const cancelExtraction = useCallback(() => {
        if (extractionAbortRef.current) {
            extractionAbortRef.current.abort();
        }
        setIsExtracting(false);
        setExtractionProgress(null);
    }, []);

    /**
     * Clear extracted content (local state only)
     */
    const clearContent = useCallback(() => {
        setExtractedContent(null);
        setGeneratedContent({});
        setIsCached(false);
    }, []);

    /**
     * Clear cache and optionally re-extract
     * @param {string} mode - Specific mode to clear ('extraction', 'quiz', etc.) or 'all'
     * @returns {Promise<{success: boolean}>}
     */
    const clearCacheAndRefresh = useCallback(async (mode = 'all') => {
        if (!currentFileId) {
            return { success: false, error: 'No file loaded' };
        }

        try {
            const result = await clearCache(currentFileId, userId, mode);
            
            if (result.success) {
                if (mode === 'all' || mode === 'extraction') {
                    setExtractedContent(null);
                    setGeneratedContent({});
                    setIsCached(false);
                } else {
                    setGeneratedContent(prev => {
                        const updated = { ...prev };
                        delete updated[mode];
                        return updated;
                    });
                }
            }
            
            return result;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return { success: false, error: error.message };
        }
    }, [currentFileId, userId]);

    /**
     * Check if content has been generated for a mode
     */
    const hasContent = useCallback((mode) => {
        return !!generatedContent[mode];
    }, [generatedContent]);

    /**
     * Get generated content for a mode
     */
    const getContent = useCallback((mode) => {
        return generatedContent[mode];
    }, [generatedContent]);

    return {
        // Extraction
        extractContent,
        extractedContent,
        isExtracting,
        extractionProgress,
        extractionError,
        cancelExtraction,
        
        // Generation
        generate,
        generatedContent,
        isGenerating,
        generatingMode,
        generationError,
        hasContent,
        getContent,
        
        // Chat
        chat,
        
        // Persistence
        saveToBackend,
        
        // Cache
        loadFromCache,
        clearCacheAndRefresh,
        isCached,
        isLoadingCache,
        currentFileId,
        
        // Utilities
        clearContent,
        refreshUsage,
        hasApiKey: hasApiKey(),
        rateLimiterState,
        usageSummary,
    };
};

export default useClientSideAI;
