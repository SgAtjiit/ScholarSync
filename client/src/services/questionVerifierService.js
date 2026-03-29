/**
 * Client-Side Question Verifier Service
 * Calls the backend verification endpoints to validate extracted questions
 * with minimal token consumption
 */

import api from '../api/axios';

/**
 * Quick verification - instant check without API calls
 * Uses local validation only, no tokens consumed
 * 
 * @param {Object} questions - Questions object to verify
 * @returns {Promise<Object>} Quick verification result
 */
export const quickVerifyQuestionsLocal = async (questions) => {
    try {
        const response = await api.post('/ai/quick-verify-questions', { questions });
        return {
            success: true,
            ...response.data.quickCheck,
            tokensUsed: 0
        };
    } catch (error) {
        console.error('Quick verify error:', error);
        return {
            success: false,
            error: error.message,
            tokensUsed: 0
        };
    }
};

/**
 * Full verification - includes optional AI verification if issues found
 * Uses minimal tokens through smart batching and focused prompts
 * 
 * @param {Object} questions - Questions to verify
 * @param {string} apiKey - Optional Groq API key for AI verification
 * @param {boolean} useAi - Whether to use AI verification
 * @returns {Promise<Object>} Full verification report
 */
export const verifyQuestionsWithAI = async (questions, apiKey, useAi = true) => {
    try {
        const config = {};
        if (apiKey) {
            config.headers = { 'x-groq-api-key': apiKey };
        }

        const response = await api.post(
            '/ai/verify-questions',
            { 
                questions,
                useAiVerification: useAi && !!apiKey 
            },
            config
        );

        return {
            success: true,
            ...response.data
        };
    } catch (error) {
        console.error('Full verification error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Two-step verification process:
 * 1. Quick local check (no tokens)
 * 2. AI verification only if needed (minimal tokens)
 * 
 * @param {Object} questions - Questions to verify
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} Comprehensive verification result
 */
export const smartVerifyQuestions = async (questions, apiKey) => {
    console.log('🔍 Starting smart question verification...');
    
    // Step 1: Quick local check (FREE)
    console.log('📋 Running quick local validation...');
    const quickResult = await quickVerifyQuestionsLocal(questions);
    
    if (!quickResult.success) {
        return { success: false, error: quickResult.error };
    }

    console.log(`✓ Quick check complete. Score: ${quickResult.score}/100`);

    // Step 2: AI verification only if score is low and API key provided
    if (quickResult.score < 80 && apiKey) {
        console.log('🤖 Score low, running AI verification to find issues...');
        const fullResult = await verifyQuestionsWithAI(questions, apiKey, true);
        
        if (fullResult.success) {
            console.log(`✅ AI verification complete (${fullResult.verification?.tokensUsed || 0} tokens)`);
            return {
                success: true,
                strategy: 'smart',
                quickCheck: quickResult,
                fullVerification: fullResult.verification,
                autoCorrections: fullResult.autoCorrections,
                recommendation: fullResult.recommendation,
                totalTokensUsed: fullResult.verification?.tokensUsed || 0
            };
        }
    }

    // If score is good or no API key, just return quick result
    console.log('✅ Verification complete. Questions look good!');
    return {
        success: true,
        strategy: 'local-only',
        quickCheck: quickResult,
        recommendation: quickResult.score >= 80 ? 'approved' : 'review_recommended',
        totalTokensUsed: 0  // No tokens used for local-only verification
    };
};

/**
 * Get verification status badge info
 * Returns UI-friendly status information
 * 
 * @param {Object} verificationResult - Result from verification
 * @returns {Object} Badge info with status, color, message
 */
export const getVerificationStatus = (verificationResult) => {
    if (!verificationResult.success) {
        return {
            status: 'error',
            color: 'red',
            icon: '❌',
            message: 'Verification failed',
            score: 0
        };
    }

    const score = verificationResult.quickCheck?.score || verificationResult.fullVerification?.qualityScore || 0;
    
    if (score >= 85) {
        return {
            status: 'approved',
            color: 'green',
            icon: '✅',
            message: 'All questions verified',
            score
        };
    } else if (score >= 70) {
        return {
            status: 'review',
            color: 'yellow',
            icon: '⚠️',
            message: 'Review recommended',
            score,
            issues: verificationResult.fullVerification?.issues || verificationResult.quickCheck?.issues || []
        };
    } else {
        return {
            status: 'failed',
            color: 'red',
            icon: '❌',
            message: 'Issues found',
            score,
            issues: verificationResult.fullVerification?.issues || verificationResult.quickCheck?.issues || []
        };
    }
};

/**
 * Format verification results for display
 * 
 * @param {Object} result - Verification result
 * @returns {Object} Formatted display data
 */
export const formatVerificationReport = (result) => {
    const status = getVerificationStatus(result);
    
    return {
        ...status,
        summary: {
            totalQuestions: result.quickCheck?.count || result.fullVerification?.totalQuestions || 0,
            questionsWithImages: result.fullVerification?.questionsWithImages || 0,
            tokensUsed: result.totalTokensUsed || 0,
            processingTime: result.fullVerification?.processingTime || '<1ms'
        },
        issues: status.issues || [],
        suggestions: result.fullVerification?.suggestions || [],
        autoCorrections: result.autoCorrections || null
    };
};

export default {
    quickVerifyQuestionsLocal,
    verifyQuestionsWithAI,
    smartVerifyQuestions,
    getVerificationStatus,
    formatVerificationReport
};
