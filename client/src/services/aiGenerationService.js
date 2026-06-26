/**
 * Client-Side AI Generation Service
 * Generates solutions, quizzes, flashcards, and explanations
 * directly from the browser using Groq API.
 */

import { chatCompletion, chatCompletionStream, hasApiKey, getActiveConfig } from './llmService';
import { cleanMarkdownFromHTML, cleanJSONContent, sanitizeHTML } from '../utils/textCleaner';

/**
 * System prompts for different generation modes
 */
const SYSTEM_PROMPTS = {
    explain: `You are a professional educational content creator. Explain concepts at publication quality with professional formatting.

📋 RESPONSE FORMAT (Valid HTML):
- <h2> for concept titles
- <h3> for sub-topics  
- <p> for clear explanations
- <ul>/<ol> for key points
- <strong> for terminology
- <code class="formula"> for equations

📊 USE TABLES for:
- Comparisons between concepts
- Formulas with explanations
- Property listings
- Data organization

💻 USE CODE BLOCKS for:
- Programming examples
- Syntax demonstrations
- Implementation details

🖥️ WHENEVER YOU SHOW CODE, ALSO SHOW ITS PROGRAM RUN OUTPUT:
- Add a terminal style block immediately after code
- Use this exact structure:
<div class="terminal-output">
<div class="terminal-title">Program Run</div>
<pre>Enter n: 5
You printed 5</pre>
</div>
- Do NOT write "expected output"
- Show realistic console transcript exactly as a run would look
- If input is required, include prompt + typed input in transcript (e.g., Enter n: 5)

✅ REQUIREMENTS:
1. Overview paragraph (2-3 sentences)
2. Key Concepts section with explanations
3. Important Formulas/Equations section
4. Practical Examples section
5. Common Misconceptions section
6. Study Tips for students
7. All text properly formatted in HTML
8. Tables where data comparison helps
9. Code blocks for technical examples
10. Professional academic style
11. Include program run output block for every code snippet`,

    flashcards: `You are creating study flashcards from assignment content.

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "id": 1,
      "front": "Question or term to memorize",
      "back": "Answer or definition",
      "category": "Topic category"
    }
  ]
}

RULES:
1. Create 10-15 flashcards covering key concepts
2. Front should be a clear question or term
3. Back should be a concise, memorable answer
4. Group by category when possible
5. Focus on definitions, formulas, key facts
6. Make them suitable for quick review`,
};


/**
 * Get quiz system prompt with options
 */
const getQuizPrompt = (options = {}) => {
    const { difficulty = 'medium', questionType = 'mixed', questionCount = 5 } = options;

    const difficultyGuide = {
        easy: 'Basic recall and understanding questions. Focus on definitions, simple facts, and direct comprehension.',
        medium: 'Application and analysis questions. Students should apply concepts to solve problems.',
        hard: 'Critical thinking and synthesis. Complex multi-step problems requiring deep understanding.',
    };

    const questionTypeGuide = {
        mixed: 'Mix of multiple choice, short answer, and true/false questions.',
        mcq: 'Only multiple choice questions with 4 options each.',
        short: 'Only short answer/open-ended questions requiring 1-3 sentence responses.',
        truefalse: 'Only true/false questions with explanations.',
    };

    return `You are creating a practice quiz based on assignment content.

DIFFICULTY: ${difficulty.toUpperCase()} - ${difficultyGuide[difficulty]}
QUESTION TYPE: ${questionTypeGuide[questionType]}
NUMBER OF QUESTIONS: ${questionCount}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "type": "mcq", 
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct",
      "difficulty": "${difficulty}"
    }
  ]
}

For short answer questions, use this format:
{
  "id": 2,
  "type": "short",
  "question": "Question text",
  "sampleAnswer": "Expected answer",
  "explanation": "Key points to include",
  "difficulty": "${difficulty}"
}

For true/false questions:
{
  "id": 3,
  "type": "truefalse",
  "question": "Statement to evaluate",
  "correctAnswer": true,
  "explanation": "Why this is true/false",
  "difficulty": "${difficulty}"
}

RULES:
1. Generate EXACTLY ${questionCount} questions
2. Base questions strictly on the provided content
3. Make questions progressively challenging within the difficulty level
4. Ensure all correct answers are unambiguous
5. Write clear, educational explanations
6. Vary question topics to cover different parts of the content`;
};

/**
 * Clean and parse JSON from AI response
 */
const cleanAndParseJSON = (text) => {
    if (typeof text !== 'string') return text;
    try {
        // Remove markdown code blocks
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
        // Find JSON boundaries
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        const parsed = JSON.parse(cleaned);
        // Clean text content within JSON (removes markdown artifacts)
        return cleanJSONContent(parsed);
    } catch (e) {
        throw new Error('Failed to parse JSON response: ' + e.message);
    }
};

/**
 * Clean HTML response - removes markdown artifacts and sanitizes
 */
const cleanHTML = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    // Only strip outer code block wrappers (e.g. ```html ... ```)
    cleaned = cleaned.replace(/^```(?:html|xml)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
    cleaned = cleaned.replace(/^```(?:html|xml)?\s*\n([\s\S]*?)$/i, '$1').trim();
    
    // Clean markdown artifacts that leaked into HTML
    cleaned = cleanMarkdownFromHTML(cleaned);

    // Normalize terminal blocks to keep them stable in web + Google Docs rendering
    cleaned = cleaned
        .replace(/<div class="terminal-title">\s*Sample Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<div class="terminal-title">\s*Expected Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<pre>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/gi, '<pre>$1</pre>')
        .replace(/<pre><\/pre>/gi, '<pre>Program executed successfully.</pre>');
    
    // Sanitize for safe rendering
    cleaned = sanitizeHTML(cleaned);
    
    return cleaned.trim();
};

/**
 * Generate solution/explanation/quiz/flashcards
 * @param {Object} options - Generation options
 * @param {string} options.content - Extracted document content (Markdown)
 * @param {string} options.mode - Generation mode (explain, quiz, flashcards)
 * @param {Object} options.quizOptions - Quiz-specific options
 * @param {string} options.assignmentTitle - Assignment title
 * @param {string} options.courseName - Course name
 * @returns {Promise<{content: string|Object, mode: string}>}
 */
export const generateContent = async ({
    content,
    mode,
    quizOptions = {},
    assignmentTitle = 'Assignment',
    courseName = '',
}) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured. Please set your Groq API key in settings.');
    }

    if (!content || content.length < 20) {
        throw new Error('Insufficient content for generation. Please extract document content first.');
    }

    // Get appropriate system prompt
    let systemPrompt;
    if (mode === 'quiz') {
        systemPrompt = getQuizPrompt(quizOptions);
    } else {
        systemPrompt = SYSTEM_PROMPTS[mode];
    }

    if (!systemPrompt) {
        throw new Error(`Unknown generation mode: ${mode}`);
    }

    // Build user message with context
    const userMessage = `
ASSIGNMENT: ${assignmentTitle}
${courseName ? `COURSE: ${courseName}` : ''}

=== DOCUMENT CONTENT ===
${content}
=== END CONTENT ===

${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
${mode === 'quiz' ? `Generate a ${quizOptions.questionCount || 5}-question quiz based on this content.` : ''}
${mode === 'flashcards' ? 'Create study flashcards from this content.' : ''}
`.trim();

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        model: getActiveConfig().model,
        temperature: 0.7,
        maxTokens: 8000,
    });

    let generatedContent = response.choices[0]?.message?.content || '';

    // Process response based on mode
    if (mode === 'quiz' || mode === 'flashcards') {
        generatedContent = cleanAndParseJSON(generatedContent);
    } else {
        generatedContent = cleanHTML(generatedContent);
    }

    return {
        content: generatedContent,
        mode,
        tokens: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0,
        },
    };
};

/**
 * Generate content with streaming
 * @param {Object} options - Same as generateContent
 * @param {Function} onChunk - Callback for streaming chunks
 * @returns {Promise<{content: string, mode: string}>}
 */
export const generateContentStream = async (options, onChunk) => {
    const { content, mode, assignmentTitle = 'Assignment', courseName = '' } = options;

    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    // Only stream HTML modes (explain)
    if (mode === 'quiz' || mode === 'flashcards') {
        // These need complete JSON, can't stream
        return generateContent(options);
    }

    const systemPrompt = SYSTEM_PROMPTS[mode];
    const userMessage = `
ASSIGNMENT: ${assignmentTitle}
${courseName ? `COURSE: ${courseName}` : ''}

=== DOCUMENT CONTENT ===
${content}
=== END CONTENT ===

${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
`.trim();

    const result = await chatCompletionStream(
        {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            model: getActiveConfig().model,
            temperature: 0.7,
            maxTokens: 8000,
        },
        onChunk
    );

    return {
        content: cleanHTML(result.content),
        mode,
    };
};

/**
 * Chat with extracted content
 * @param {string} content - Document content
 * @param {string} question - User question
 * @param {Array} history - Chat history [{role, content}]
 * @returns {Promise<string>}
 */
export const chatWithContent = async (content, question, history = []) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const systemMessage = `You are a helpful tutor assistant. Answer questions about the following document content:

${content}

Be concise but thorough. If the question cannot be answered from the content, say so clearly.`;

    const messages = [
        { role: 'system', content: systemMessage },
        ...history,
        { role: 'user', content: question },
    ];

    const response = await chatCompletion({
        messages,
        model: getActiveConfig().model,
        temperature: 0.7,
        maxTokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
};

/**
 * Chat about document content with streaming
 * @param {string} content - Document content
 * @param {string} question - User question
 * @param {Array} history - Chat history [{role, content}]
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>}
 */
export const chatWithContentStream = async (content, question, history = [], onChunk) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const systemMessage = `You are a helpful tutor assistant. Answer questions about the following document content:

${content}

Be concise but thorough. If the question cannot be answered from the content, say so clearly.`;

    const messages = [
        { role: 'system', content: systemMessage },
        ...history,
        { role: 'user', content: question },
    ];

    const result = await chatCompletionStream({
        messages,
        model: getActiveConfig().model,
        temperature: 0.7,
        maxTokens: 2000,
    }, onChunk);

    return result.content;
};

/**
 * Explain a specific concept
 * @param {string} content - Document content
 * @param {string} topic - Topic to explain
 * @returns {Promise<string>}
 */
export const explainConcept = async (content, topic) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const response = await chatCompletion({
        messages: [
            {
                role: 'system',
                content: `You are an expert tutor. Explain concepts clearly and thoroughly.
Use examples and analogies when helpful. Format response as clean HTML with <h3>, <p>, <ul>, etc.`,
            },
            {
                role: 'user',
                content: `Based on this content:

${content}

Explain this concept in detail: ${topic}

Include:
1. Definition and key points
2. How it relates to other concepts in the content
3. Practical examples or applications
4. Common misconceptions`,
            },
        ],
        model: getActiveConfig().model,
        temperature: 0.7,
        maxTokens: 3000,
    });

    return cleanHTML(response.choices[0]?.message?.content || '');
};

/**
 * Extract structured questions from extracted document content
 */
export const parseQuestions = async (documentContent) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const systemPrompt = `You are a professional educational parsing assistant. Your task is to analyze the provided document content and extract a clean list of all questions to be solved.
Extract each question with its label (e.g., "Q1", "Question 1", "Part A") and its full details.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "Q1",
      "text": "Full text of the question including mathematical expressions, sub-parts, tables, and instructions..."
    }
  ]
}

Make sure the "text" property preserves the question's sub-parts or details. 
If no explicit numbered questions exist, partition the document content into logical tasks or sections and extract them as separate items.
Do not add any markdown blocks around the JSON output, and do not write any commentary. Output raw JSON.`;

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `=== DOCUMENT CONTENT ===\n${documentContent}\n=== END CONTENT ===` }
        ],
        model: getActiveConfig().model,
        temperature: 0.1,
        maxTokens: 4000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    try {
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        const parsed = JSON.parse(cleaned);
        return parsed.questions || [];
    } catch (e) {
        console.error('Failed to parse questions JSON:', e);
        // Fallback: Return a single chunk
        return [{ id: 'Question 1', text: documentContent.slice(0, 1000) + '...' }];
    }
};

/**
 * Get Socratic hints for a question
 */
export const getSocraticHint = async ({ questionText, documentContent, studentAnswer }) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const prompt = `You are a Socratic tutor. A student is working on the following assignment question:
[QUESTION]
${questionText}
[/QUESTION]

Here is the document context:
[CONTEXT]
${documentContent}
[/CONTEXT]
${studentAnswer ? `\nThe student's current draft solution is: "${studentAnswer}".` : ''}

Provide 1 or 2 leading conceptual clues, hints, or tips pointing to formulas or concepts without giving away calculations, code, or the direct answers. Keep the tone helpful, encouraging, and Socratic. Format the output in HTML (e.g. use <p>, <ul>, etc.).`;

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: 'You are an educational tutor guide. Always guide the student conceptually without giving direct answers.' },
            { role: 'user', content: prompt }
        ],
        model: getActiveConfig().model,
        temperature: 0.4,
        maxTokens: 2000,
    });

    return cleanHTML(response.choices[0]?.message?.content || '');
};

/**
 * Get background explanation for a question
 */
export const getSocraticExplanation = async ({ questionText, documentContent }) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const prompt = `You are a professional educational tutor. Explain the concepts and theories related to the following question:
[QUESTION]
${questionText}
[/QUESTION]

Here is the document context:
[CONTEXT]
${documentContent}
[/CONTEXT]

Write a clear educational guide containing:
1. Core definition and key concepts.
2. Important formulas or background theories.
3. A similar worked analogy or example (using different numbers/values).
Do NOT solve the actual question for the user.

Format your response as valid HTML with <h3>, <p>, <ul>, and tables where helpful.`;

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: 'You are an educational expert. Explain the concept and provide worked analogies without solving the student\'s exact question.' },
            { role: 'user', content: prompt }
        ],
        model: getActiveConfig().model,
        temperature: 0.5,
        maxTokens: 3000,
    });

    return cleanHTML(response.choices[0]?.message?.content || '');
};

/**
 * Verify student's solution draft socratically
 */
export const verifySocraticSolution = async ({ questionText, documentContent, studentAnswer }) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    if (!studentAnswer || studentAnswer.trim().length < 5) {
        return '<p class="text-amber-400">Please write a draft solution in the workspace first before verifying.</p>';
    }

    const prompt = `You are a Socratic grader. A student is asking to review their solution for the following question:
[QUESTION]
${questionText}
[/QUESTION]

[STUDENT DRAFT SOLUTION]
${studentAnswer}
[/STUDENT DRAFT SOLUTION]

Here is the document context:
[CONTEXT]
${documentContent}
[/CONTEXT]

Carefully analyze the student's solution. Compare it with correct steps, check for math, logic, formatting, or code errors.
Write a review in HTML including:
1. An evaluation/grade assessment (e.g. "Excellent progress", "Minor errors", "Needs correction").
2. Highlight specific parts or assumptions that are incorrect.
3. Conceptual tips/instructions on how to correct the errors.
Do NOT write the final correct solution/code directly for the student.

Format your response as valid HTML with <h3>, <p>, <ul>.`;

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: 'You are a Socratic evaluator. Critically analyze the student\'s work, point out exact logical/mathematical mistakes, but do not solve it for them.' },
            { role: 'user', content: prompt }
        ],
        model: getActiveConfig().model,
        temperature: 0.3,
        maxTokens: 3000,
    });

    return cleanHTML(response.choices[0]?.message?.content || '');
};

/**
 * Generate correct answer for a question directly
 */
export const getSocraticAnswer = async ({ questionText, documentContent }) => {
    if (!hasApiKey()) {
        throw new Error('API key not configured');
    }

    const prompt = `You are an expert academic tutor. A student is struggling with the following question and needs the correct answer:
[QUESTION]
${questionText}
[/QUESTION]

Here is the document context:
[CONTEXT]
${documentContent}
[/CONTEXT]

Please provide a detailed, correct, and professional-grade solution to this question.
YOUR RESPONSE MUST BE VALID HTML. Follow these formatting rules:
1. Use <h3> for sub-parts: "Part (a)", "Part (i)"
2. Use <p> for explanation text.
3. Use <strong> for emphasis.
4. Use <code class="formula"> for inline math formulas (e.g. E = mc²).
5. For calculations, show step-by-step working.
6. For coding tasks, use <pre class="code-block"><code class="language-xyz">...</code></pre> blocks.

Only output the HTML response block, do not include any conversational greeting or concluding text outside the solution.`;

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: 'You are an educational assistant who provides clear, mathematically correct, and well-structured academic solutions in HTML.' },
            { role: 'user', content: prompt }
        ],
        model: getActiveConfig().model,
        temperature: 0.2,
        maxTokens: 3000,
    });

    return cleanHTML(response.choices[0]?.message?.content || '');
};

export default {
    generateContent,
    generateContentStream,
    chatWithContent,
    chatWithContentStream,
    explainConcept,
    parseQuestions,
    getSocraticHint,
    getSocraticExplanation,
    verifySocraticSolution,
    getSocraticAnswer,
};
