/**
 * useClientSideAI Hook
 * Main hook for client-side AI processing.
 * Combines PDF extraction, vision processing, and AI generation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { extractDocumentContext } from '../services/contextExtractor';
import { generateContent, generateContentStream, chatWithContent, parseQuestions, getSocraticHint, getSocraticExplanation, verifySocraticSolution, getSocraticAnswer } from '../services/aiGenerationService';
import { hasApiKey, getUsageSummary } from '../services/llmService';
import { withRateLimit, getRateLimiterState, subscribeToRateLimiter } from '../services/rateLimiter';
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
    
    const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [isParsingQuestions, setIsParsingQuestions] = useState(false);

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
            throw new Error('Please configure your API Provider and keys in settings before using AI features.');
        }
        return true;
    }, []);

    /**
     * Extract content from a document
     * @param {Object} options - Extraction options
     * @param {string} options.fileId - Google Drive file ID
     * @param {string} options.fileName - File name
     * @param {string} options.assignmentId - Assignment ID
     * @param {boolean} options.useVision - Whether to use vision API
     * @param {boolean} options.appendMode - Append to existing content (for multi-doc extraction)
     * @returns {Promise<Object>}
     */
    const extractContent = useCallback(async ({ fileId, fileName, assignmentId, useVision = true, forceRefresh = false, appendMode = false, isManualFile = false }) => {
        if (!fileId) {
            throw new Error('File ID is required');
        }

        setCurrentAssignmentId(assignmentId);

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
                        isManualFile,
                    });
                },
                { isHeavy: true }
            );

            // Handle append mode for multi-document extraction
            if (appendMode && extractedContent) {
                const mergedContent = {
                    content: extractedContent.content + '\n\n---\n\n## ' + fileName + '\n\n' + result.content,
                    pageCount: (extractedContent.pageCount || 0) + (result.pageCount || 0),
                    hasImages: extractedContent.hasImages || result.hasImages,
                    tokenEstimate: (extractedContent.tokenEstimate || 0) + (result.tokenEstimate || 0),
                    pages: [...(extractedContent.pages || []), ...(result.pages || [])],
                    documents: [...(extractedContent.documents || [{ name: 'Previous' }]), { name: fileName, pageCount: result.pageCount }],
                };
                setExtractedContent(mergedContent);
                refreshUsage();
                return result; // Return individual result for progress tracking
            }

            // First document or single document mode
            const contentWithDocInfo = {
                ...result,
                documents: [{ name: fileName, pageCount: result.pageCount }],
            };
            setExtractedContent(contentWithDocInfo);
            
            refreshUsage();
            return result;
        } catch (error) {
            setExtractionError(error.message);
            throw error;
        } finally {
            setIsExtracting(false);
            setExtractionProgress(null);
        }
    }, [userId, checkApiKey, refreshUsage]);

    /**
     * Generate AI content (explain, quiz, flashcards)
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
        assignmentId,
        quizOptions,
        assignmentTitle,
        courseName,
        content,
        stream = false,
        onChunk,
        forceRefresh = false,
    }) => {
        const resolvedAssignmentId = assignmentId || currentAssignmentId;
        
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
                    if (stream && onChunk && mode === 'explain') {
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

            // Persist generated content to MongoDB so it survives refresh/reopen
            if (resolvedAssignmentId && userId) {
                api.post('/ai/save-solution', {
                    assignmentId: resolvedAssignmentId,
                    userId,
                    mode,
                    content: result.content,
                    generatedAt: new Date().toISOString(),
                    source: 'client-side',
                }).catch(err => console.error(`Failed to persist ${mode} to MongoDB:`, err));
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
    }, [extractedContent, generatedContent, currentAssignmentId, userId, checkApiKey, refreshUsage]);

    /**
     * Load saved generated solutions from MongoDB (all modes)
     * @param {string} assignmentId
     */
    const loadSavedGenerations = useCallback(async (assignmentId) => {
        if (!assignmentId || !userId) return { loaded: false };

        const modes = ['explain', 'quiz', 'flashcards'];
        const loaded = {};

        await Promise.all(
            modes.map(async (mode) => {
                try {
                    const res = await api.get(`/ai/solution/${assignmentId}`, {
                        params: { mode, userId }
                    });
                    if (res.data?.content) {
                        loaded[mode] = res.data.content;
                    }
                } catch {
                    // Ignore missing mode
                }
            })
        );

        if (Object.keys(loaded).length > 0) {
            setGeneratedContent(prev => ({ ...prev, ...loaded }));
            return { loaded: true, data: loaded };
        }

        return { loaded: false };
    }, [userId]);

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
            userId,
            mode,
            content: typeof content === 'object' ? JSON.stringify(content) : content,
            generatedAt: new Date().toISOString(),
            source: 'client-side',
        });
        return response.data;
    }, [userId]);

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
        setParsedQuestions([]);
    }, []);

    /**
     * Parse questions from active document content
     */
    const parseAssignmentQuestions = useCallback(async (content) => {
        const contentToUse = content || extractedContent?.content;
        if (!contentToUse) {
            throw new Error('No content available to parse questions from.');
        }

        setIsParsingQuestions(true);
        try {
            const questions = await parseQuestions(contentToUse);
            setParsedQuestions(questions);
            return questions;
        } catch (error) {
            console.error('Error parsing assignment questions:', error);
            throw error;
        } finally {
            setIsParsingQuestions(false);
        }
    }, [extractedContent]);

    /**
     * Get conceptual hint for tutor question
     */
    const getTutorHint = useCallback(async (questionText, studentAnswer) => {
        checkApiKey();
        const contentToUse = extractedContent?.content || '';
        return getSocraticHint({ questionText, documentContent: contentToUse, studentAnswer });
    }, [extractedContent, checkApiKey]);

    /**
     * Get tutorial/analogy explanation for tutor question
     */
    const getTutorExplanation = useCallback(async (questionText) => {
        checkApiKey();
        const contentToUse = extractedContent?.content || '';
        return getSocraticExplanation({ questionText, documentContent: contentToUse });
    }, [extractedContent, checkApiKey]);

    /**
     * Verify draft student solution
     */
    const verifyTutorSolution = useCallback(async (questionText, studentAnswer) => {
        checkApiKey();
        const contentToUse = extractedContent?.content || '';
        return verifySocraticSolution({ questionText, documentContent: contentToUse, studentAnswer });
    }, [extractedContent, checkApiKey]);

    /**
     * Get correct answer for tutor question directly
     */
    const getTutorAnswer = useCallback(async (questionText) => {
        checkApiKey();
        const contentToUse = extractedContent?.content || '';
        return getSocraticAnswer({ questionText, documentContent: contentToUse });
    }, [extractedContent, checkApiKey]);

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
        
        // Tutor
        parseAssignmentQuestions,
        parsedQuestions,
        isParsingQuestions,
        getTutorHint,
        getTutorExplanation,
        verifyTutorSolution,
        getTutorAnswer,
        setParsedQuestions,
        
        // Persistence
        saveToBackend,
        
        // Utilities
        clearContent,
        refreshUsage,
        hasApiKey: hasApiKey(),
        rateLimiterState,
        usageSummary,
    };
};

export default useClientSideAI;
