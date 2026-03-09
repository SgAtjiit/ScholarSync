/**
 * Client-Side AI Generation Service
 * Generates solutions, quizzes, flashcards, and explanations
 * directly from the browser using Groq API.
 */

import { chatCompletion, chatCompletionStream, hasApiKey } from './groqService';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * System prompts for different generation modes
 */
const SYSTEM_PROMPTS = {
    draft: `You are an expert academic tutor helping students complete their assignments. 
Your task is to create a COMPLETE, WELL-FORMATTED solution document.

FORMAT YOUR RESPONSE AS CLEAN HTML that can be directly displayed:
- Use <h2> for question numbers (e.g., "Question 1")
- Use <h3> for sub-parts (e.g., "Part (a)")
- Use <p> for explanations and answers
- Use <ul>/<ol> for lists
- Use <strong> for important terms
- Use <code> for formulas, code, or technical terms
- Use proper spacing between sections

IMPORTANT RULES:
1. Answer EVERY question completely
2. Show step-by-step working for calculations
3. Explain concepts clearly before solving
4. Include formulas where applicable
5. If a question references a figure/diagram, use the description provided to answer
6. Make answers comprehensive but easy to understand
7. Use proper academic language`,

    explain: `You are an expert academic tutor. Your task is to EXPLAIN the concepts in this assignment in a clear, educational way.

FORMAT YOUR RESPONSE AS CLEAN HTML:
- Use <h2> for main concept headings
- Use <h3> for sub-topics
- Use <p> for explanations
- Use <ul>/<ol> for key points
- Use <strong> for important terms
- Use <code> for formulas
- Use <blockquote> for definitions or key takeaways

STRUCTURE YOUR EXPLANATION:
1. **Overview**: Brief summary of what this assignment covers
2. **Key Concepts**: Explain each major concept mentioned
3. **Formulas & Equations**: List important formulas with explanations
4. **Common Mistakes**: Things students often get wrong
5. **Tips for Solving**: Practical advice for answering these questions

Make it educational and easy to understand for a student who is learning these topics.`,

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
        return JSON.parse(cleaned);
    } catch (e) {
        throw new Error('Failed to parse JSON response: ' + e.message);
    }
};

/**
 * Clean HTML response
 */
const cleanHTML = (text) => {
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
};

/**
 * Generate solution/explanation/quiz/flashcards
 * @param {Object} options - Generation options
 * @param {string} options.content - Extracted document content (Markdown)
 * @param {string} options.mode - Generation mode (draft, explain, quiz, flashcards)
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

${mode === 'draft' ? 'Generate a complete solution for ALL questions in this assignment.' : ''}
${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
${mode === 'quiz' ? `Generate a ${quizOptions.questionCount || 5}-question quiz based on this content.` : ''}
${mode === 'flashcards' ? 'Create study flashcards from this content.' : ''}
`.trim();

    const response = await chatCompletion({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        model: DEFAULT_MODEL,
        temperature: mode === 'draft' ? 0.3 : 0.7,
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

    // Only stream HTML modes (draft, explain)
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

${mode === 'draft' ? 'Generate a complete solution for ALL questions in this assignment.' : ''}
${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
`.trim();

    const result = await chatCompletionStream(
        {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            model: DEFAULT_MODEL,
            temperature: mode === 'draft' ? 0.3 : 0.7,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL,
        temperature: 0.7,
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
};
