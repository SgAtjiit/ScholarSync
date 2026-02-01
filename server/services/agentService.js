import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Multi-Agent System for High-Quality Content Processing
 * 
 * Agents:
 * 1. Extractor Agent - Cleans and structures raw content
 * 2. Validator Agent - Validates completeness and fixes issues
 * 3. Solver Agent - Creates detailed solutions with step-by-step working
 * 4. Reviewer Agent - Reviews and improves solutions
 */

// Clean text from encoding artifacts
const cleanText = (text) => {
    if (!text) return '';
    return text
        // Remove common OCR/encoding artifacts
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/[Ã§Ã¼Ã¶ÃŸÃ¤Ã±Ã©Ã¨Ã¢ÃªÃ®Ã´Ã»]/g, '')
        .replace(/;Ç[0-9A-Za-z]+/g, '')
        .replace(/[†‡•·°±×÷]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};

/**
 * Agent 1: Content Validator & Cleaner
 * Validates extracted content and ensures all questions are captured
 */
export const validateAndCleanContent = async (rawContent, apiKey) => {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const prompt = `You are a Content Validator Agent. Your job is to clean and validate extracted assignment content.

INPUT CONTENT:
${rawContent}

YOUR TASKS:
1. Remove any garbled/corrupted text (encoding errors, random symbols, etc.)
2. Identify and count ALL questions (main questions and sub-parts)
3. Preserve all mathematical formulas and expressions properly
4. Preserve all figure/diagram descriptions
5. Structure the content clearly

OUTPUT FORMAT (JSON):
{
    "totalQuestions": <number>,
    "questionList": [
        {
            "id": "Q1",
            "mainQuestion": "Full question text",
            "subParts": ["(a) sub question", "(b) sub question"],
            "hasFigure": true/false,
            "figureDescription": "Description if any"
        }
    ],
    "cleanedContent": "The complete cleaned content",
    "metadata": {
        "subject": "detected subject",
        "topics": ["topic1", "topic2"]
    }
}`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model,
            temperature: 0.1,
            max_tokens: 8000,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        console.log(`Validator Agent: Found ${result.totalQuestions} questions`);
        return result;
    } catch (error) {
        console.error('Validator Agent failed:', error.message);
        return { error: error.message, cleanedContent: cleanText(rawContent) };
    }
};

/**
 * Agent 2: Expert Solver
 * Creates detailed step-by-step solutions for each question
 */
export const solveQuestions = async (validatedContent, apiKey) => {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const questionList = validatedContent.questionList || [];
    const solutions = [];

    // Process questions in batches of 3 for efficiency
    const batchSize = 3;
    for (let i = 0; i < questionList.length; i += batchSize) {
        const batch = questionList.slice(i, i + batchSize);
        
        const prompt = `You are an Expert Solver Agent. Create DETAILED, STEP-BY-STEP solutions.

QUESTIONS TO SOLVE:
${batch.map((q, idx) => `
### ${q.id}: ${q.mainQuestion}
${q.subParts?.map(p => `   ${p}`).join('\n') || ''}
${q.hasFigure ? `[Figure: ${q.figureDescription}]` : ''}
`).join('\n')}

SOLUTION REQUIREMENTS:
1. For EACH question and sub-part:
   - State what is given
   - State what needs to be found
   - Show the formula/concept to use
   - Show step-by-step calculation with proper units
   - Box or highlight the final answer
   
2. For theoretical questions:
   - Define key terms
   - Explain the concept clearly
   - Give examples if helpful
   - Compare/contrast if asked

3. For diagram-based questions:
   - Reference the diagram description
   - Explain what the diagram shows
   - Use information from the diagram in your solution

OUTPUT FORMAT (JSON):
{
    "solutions": [
        {
            "questionId": "Q1",
            "solution": {
                "given": "What is given in the problem",
                "toFind": "What we need to find",
                "approach": "Method/formula to use",
                "steps": [
                    "Step 1: ...",
                    "Step 2: ...",
                    "Step 3: ..."
                ],
                "finalAnswer": "The final answer with units",
                "explanation": "Additional explanation if needed"
            },
            "subPartSolutions": {
                "a": { "steps": [...], "answer": "..." },
                "b": { "steps": [...], "answer": "..." }
            }
        }
    ]
}`;

        try {
            const response = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model,
                temperature: 0.2,
                max_tokens: 6000,
                response_format: { type: 'json_object' }
            });

            const batchResult = JSON.parse(response.choices[0]?.message?.content || '{}');
            if (batchResult.solutions) {
                solutions.push(...batchResult.solutions);
            }
            console.log(`Solver Agent: Solved batch ${Math.floor(i/batchSize) + 1}`);
        } catch (error) {
            console.error(`Solver Agent batch ${i} failed:`, error.message);
        }
    }

    return { solutions, totalSolved: solutions.length };
};

/**
 * Agent 3: Solution Reviewer & Formatter
 * Reviews solutions and formats them as clean HTML
 */
export const reviewAndFormat = async (solutions, validatedContent, apiKey) => {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const prompt = `You are a Solution Reviewer Agent. Format the solutions into a clean, professional document.

VALIDATED QUESTIONS:
${JSON.stringify(validatedContent.questionList, null, 2)}

SOLUTIONS:
${JSON.stringify(solutions, null, 2)}

YOUR TASK:
Create a beautifully formatted HTML document with all solutions. 

FORMAT REQUIREMENTS:
1. Use proper HTML structure:
   - <h2> for each main question number
   - <h3> for sub-parts (a), (b), etc.
   - <p> for explanations
   - <div class="solution-box"> for step-by-step solutions
   - <div class="formula"> for formulas
   - <div class="answer"> for final answers (highlighted)
   
2. Include for each question:
   - The question text
   - Given information
   - Step-by-step solution
   - Final answer (clearly marked)
   - Brief explanation if helpful

3. Make it visually organized:
   - Proper spacing between questions
   - Clear numbering
   - Highlighted final answers

OUTPUT FORMAT:
Return ONLY the HTML content (no markdown code blocks). Start with the first <h2> tag.`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model,
            temperature: 0.3,
            max_tokens: 8000
        });

        let html = response.choices[0]?.message?.content || '';
        // Clean any markdown artifacts
        html = html.replace(/```html/g, '').replace(/```/g, '').trim();
        
        console.log('Reviewer Agent: Formatted solutions');
        return html;
    } catch (error) {
        console.error('Reviewer Agent failed:', error.message);
        return `<h2>Error formatting solutions</h2><p>${error.message}</p>`;
    }
};

/**
 * Master Orchestrator: Coordinates all agents
 */
export const runAgentPipeline = async (rawContent, apiKey, mode = 'draft') => {
    console.log('Starting Agent Pipeline...');
    
    // Step 1: Validate and clean content
    console.log('Agent 1: Validating content...');
    const validated = await validateAndCleanContent(rawContent, apiKey);
    
    if (validated.error) {
        return { error: validated.error, html: null };
    }

    if (mode === 'explain') {
        // For explain mode, return concept explanations
        return await generateExplanation(validated, apiKey);
    }

    // Step 2: Solve all questions
    console.log('Agent 2: Solving questions...');
    const solved = await solveQuestions(validated, apiKey);
    
    // Step 3: Review and format
    console.log('Agent 3: Reviewing and formatting...');
    const finalHtml = await reviewAndFormat(solved.solutions, validated, apiKey);
    
    return {
        html: finalHtml,
        questionCount: validated.totalQuestions,
        solvedCount: solved.totalSolved,
        metadata: validated.metadata
    };
};

/**
 * Generate concept explanations (for 'explain' mode)
 */
const generateExplanation = async (validated, apiKey) => {
    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const prompt = `You are an Expert Tutor. Create educational explanations for the concepts in this assignment.

ASSIGNMENT CONTENT:
${JSON.stringify(validated, null, 2)}

CREATE AN EDUCATIONAL GUIDE WITH:

1. <h2>Overview</h2>
   - Brief summary of what this assignment covers
   - Key learning objectives

2. <h2>Core Concepts</h2>
   For each major topic:
   - <h3>Concept Name</h3>
   - Clear definition
   - Real-world examples
   - Key formulas with explanations

3. <h2>Important Formulas</h2>
   - List all relevant formulas
   - Explain when to use each
   - Show example calculations

4. <h2>Common Mistakes to Avoid</h2>
   - List typical errors students make
   - How to avoid them

5. <h2>Tips for Solving</h2>
   - Problem-solving strategies
   - Time-saving techniques

OUTPUT: Clean HTML only (no markdown code blocks).`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model,
            temperature: 0.3,
            max_tokens: 6000
        });

        let html = response.choices[0]?.message?.content || '';
        html = html.replace(/```html/g, '').replace(/```/g, '').trim();
        
        return { html, metadata: validated.metadata };
    } catch (error) {
        return { error: error.message, html: null };
    }
};

export default {
    validateAndCleanContent,
    solveQuestions,
    reviewAndFormat,
    runAgentPipeline
};
