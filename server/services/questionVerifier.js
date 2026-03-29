import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Lightweight Question Verifier
 * Validates extracted questions efficiently without consuming excessive tokens
 * 
 * Strategy:
 * 1. Local validation first (no API calls)
 * 2. Batch verification if needed
 * 3. Minimal-token AI verification using a short, focused prompt
 */

// Local validation - NO TOKEN COST
const localValidateQuestions = (questions) => {
    const issues = [];
    const stats = {
        totalQuestions: 0,
        questionsWithImages: 0,
        possibleDuplicates: [],
        incompleteQuestions: [],
        qualityScore: 100
    };

    if (!questions || typeof questions !== 'object') {
        return { valid: false, issues: ['Invalid questions object'], stats };
    }

    const questionTexts = [];
    
    Object.entries(questions).forEach(([key, q]) => {
        stats.totalQuestions++;

        // Check 1: Question text exists and is meaningful
        if (!q.question || q.question.trim().length < 10) {
            issues.push(`Q${key}: Question text too short or missing`);
            stats.qualityScore -= 15;
        }

        // Check 2: Detect solutions in questions (likely extraction error)
        const solutionKeywords = [
            'answer:', 'solution:', 'therefore', 'thus', 'hence',
            'so the answer', 'the correct answer', 'working:', 'steps:',
            '=', '→', '⇒', 'calculate:', 'derivation:'
        ];
        const questionLower = q.question?.toLowerCase() || '';
        const hasSolutionWords = solutionKeywords.some(kw => questionLower.includes(kw));
        
        if (hasSolutionWords && questionLower.length > 100) {
            issues.push(`Q${key}: May contain solution text mixed with question`);
            stats.qualityScore -= 20;
        }

        // Check 3: Image reference
        if (q.imageInfo && q.imageInfo.trim().length > 5) {
            stats.questionsWithImages++;
        }

        // Check 4: Duplicate detection (simple text similarity)
        for (const prevText of questionTexts) {
            const similarity = calculateSimilarity(q.question, prevText);
            if (similarity > 0.85) {
                stats.possibleDuplicates.push(`Q${key} might be duplicate`);
                stats.qualityScore -= 10;
                break;
            }
        }
        questionTexts.push(q.question);

        // Check 5: Sub-question detection
        if (q.otherInfo && q.otherInfo.includes('(')) {
            // Likely has sub-parts
        } else if (questionLower.includes('(a)') || questionLower.includes('(i)')) {
            // Sub-parts in question text itself
        }

        // Check 6: Incomplete question (ends with etc, incomplete)
        if (q.question?.endsWith('...') || q.question?.endsWith(',')) {
            issues.push(`Q${key}: Question appears incomplete`);
            stats.qualityScore -= 10;
        }
    });

    const valid = issues.length === 0 && stats.qualityScore >= 70;
    return { valid, issues, stats };
};

// Simple string similarity (Levenshtein-like estimate)
const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim().split(' ').sort();
    const s2 = str2.toLowerCase().trim().split(' ').sort();
    const common = s1.filter(w => s2.includes(w)).length;
    const total = Math.max(s1.length, s2.length);
    return total === 0 ? 0 : common / total;
};

/**
 * Smart AI verification - uses minimal tokens with batch approach
 * Only called if local validation finds issues
 */
const aiVerifyQuestions = async (questions, issues, apiKey) => {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    // Build a concise summary for verification
    const questionSummary = Object.entries(questions)
        .slice(0, 10) // Only verify first 10 questions to save tokens
        .map(([key, q]) => `Q${key}: ${q.question.substring(0, 100)}...`)
        .join('\n');

    const prompt = `QUICK VERIFICATION: Are these questions valid academic questions? (Yes/No for each)

${questionSummary}

Issues found: ${issues.slice(0, 3).join('; ')}

Response format:
{
  "allValid": true/false,
  "criticalIssues": ["issue1"],
  "suggestions": ["suggestion1"]
}`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model,
            temperature: 0,
            max_tokens: 500, // Very tight token limit
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return {
            aiVerification: true,
            tokensUsed: response.usage?.total_tokens || 0,
            result
        };
    } catch (error) {
        console.error('AI Verification failed:', error.message);
        return { aiVerification: false, error: error.message };
    }
};

/**
 * Main verification function - returns comprehensive report with minimal tokens
 * 
 * @param {Object} questions - Extracted questions object
 * @param {string} apiKey - Groq API key (optional, for AI verification)
 * @returns {Promise<Object>} Verification report
 */
export const verifyQuestions = async (questions, apiKey) => {
    console.log('🔍 Starting Question Verification...');
    const startTime = Date.now();

    // STEP 1: Local validation (FREE - no tokens)
    const localResult = localValidateQuestions(questions);
    console.log(`✓ Local validation: ${localResult.stats.totalQuestions} questions found`);
    console.log(`  Quality score: ${localResult.stats.qualityScore}/100`);

    const report = {
        timestamp: new Date().toISOString(),
        source: 'local',
        totalQuestions: localResult.stats.totalQuestions,
        questionsWithImages: localResult.stats.questionsWithImages,
        qualityScore: localResult.stats.qualityScore,
        passed: localResult.valid,
        issues: localResult.issues,
        suggestions: [],
        tokensUsed: 0,
        processingTime: 0
    };

    // STEP 2: AI verification only if needed (has issues) AND api key provided
    if (!localResult.valid && apiKey && localResult.stats.qualityScore < 80) {
        console.log('🤖 Running AI verification due to detected issues...');
        const aiResult = await aiVerifyQuestions(questions, localResult.issues, apiKey);
        
        if (aiResult.aiVerification) {
            report.source = 'local+ai';
            report.tokensUsed = aiResult.result?.tokensUsed || aiResult.tokensUsed;
            report.aiVerification = aiResult.result;
            report.suggestions = aiResult.result?.suggestions || [];
            
            if (aiResult.result?.criticalIssues) {
                report.issues.push(...aiResult.result.criticalIssues);
            }
        }
    }

    // STEP 3: Generate fix suggestions
    if (localResult.stats.possibleDuplicates.length > 0) {
        report.suggestions.push(`⚠️ ${localResult.stats.possibleDuplicates.length} possible duplicate questions found`);
    }
    if (localResult.stats.incompleteQuestions.length > 0) {
        report.suggestions.push(`📝 ${localResult.stats.incompleteQuestions.length} questions may be incomplete`);
    }

    report.processingTime = Date.now() - startTime;

    console.log(`✅ Verification complete (${report.processingTime}ms, ${report.tokensUsed} tokens)`);
    return report;
};

/**
 * Quick verification - ULTRA-lightweight, no API calls
 * Returns pass/fail only
 * 
 * @param {Object} questions - Questions to verify
 * @returns {Object} Simple pass/fail with basic stats
 */
export const quickVerifyQuestions = (questions) => {
    const local = localValidateQuestions(questions);
    return {
        passed: local.valid,
        score: local.stats.qualityScore,
        count: local.stats.totalQuestions,
        issues: local.issues.length > 0 ? local.issues.slice(0, 3) : []
    };
};

/**
 * Fix detected issues - provides auto-corrections where possible
 * 
 * @param {Object} questions - Questions with issues
 * @param {Array} issues - Issues found
 * @returns {Object} Corrected questions
 */
export const autoFixQuestions = (questions, issues) => {
    const fixed = JSON.parse(JSON.stringify(questions)); // Deep clone
    let fixedCount = 0;

    Object.entries(fixed).forEach(([key, q]) => {
        // Fix 1: Trim whitespace
        if (q.question) {
            const trimmed = q.question.trim();
            if (trimmed !== q.question) {
                q.question = trimmed;
                fixedCount++;
            }
        }

        // Fix 2: Remove solution markers if detected
        if (q.question?.includes('Answer:') || q.question?.includes('Solution:')) {
            q.question = q.question.split(/Answer:|Solution:/)[0].trim();
            fixedCount++;
        }

        // Fix 3: Complete incomplete questions
        if (q.question?.endsWith(',')) {
            q.question = q.question.slice(0, -1);
            fixedCount++;
        }
    });

    return { fixed, fixedCount };
};

export default {
    verifyQuestions,
    quickVerifyQuestions,
    autoFixQuestions,
    localValidateQuestions
};
