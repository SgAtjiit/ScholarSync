import { GoogleGenerativeAI } from '@google/generative-ai';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import dotenv from 'dotenv';

dotenv.config();

// --- HELPER: Clean & Parse JSON (Handles Markdown backticks) ---
const cleanAndParseJSON = (text) => {
    try {
        // Remove markdown code blocks (```json ... ```)
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
        
        // Find the first '{' and last '}' to strip external noise
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleaned);
    } catch (e) {
        throw new Error("JSON Parsing Failed: AI returned invalid format. " + e.message);
    }
};

// --- HELPER: Clean HTML (Handles Markdown backticks) ---
const cleanHTML = (text) => {
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
};

const PROMPT_TEMPLATES = {
  explain: (title, description, content) => `
You are an expert academic tutor.
ASSIGNMENT TITLE: ${title}
DESCRIPTION: ${description || "No description provided"}
CONTENT:
${content.substring(0, 20000)}

INSTRUCTIONS:
1. Explain the core concepts clearly.
2. Use semantic HTML (<h2>, <p>, <ul>, <strong>).
3. NO Markdown blocks. Output RAW HTML.
4. Do NOT include the word "html" at the start.

OUTPUT: Clean HTML only.
`,

  quiz: (title, description, content, questionCount) => `
You are a quiz generator.
ASSIGNMENT TITLE: ${title}
CONTENT:
${content.substring(0, 20000)}

INSTRUCTIONS:
1. Generate EXACTLY ${questionCount} MCQs.
2. Output ONLY VALID JSON.
3. NO Markdown formatting.

REQUIRED JSON FORMAT:
{
  "questions": [
    {
      "question": "Text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0
    }
  ]
}
`,

  flashcards: (title, description, content) => `
You are a flashcard generator.
ASSIGNMENT TITLE: ${title}
CONTENT:
${content.substring(0, 20000)}

INSTRUCTIONS:
1. Extract 8-12 key terms.
2. Output ONLY VALID JSON.
3. NO Markdown formatting.

REQUIRED JSON FORMAT:
{
  "flashcards": [
    {
      "front": "Term",
      "back": "Definition"
    }
  ]
}
`,

  draft: (title, description, content) => `
You are an expert solver.
ASSIGNMENT TITLE: ${title}
CONTENT:
${content.substring(0, 25000)}

INSTRUCTIONS:
1. Provide a detailed solution in clean HTML.
2. Start with <h1>${title}</h1>.
3. Use <ol> for steps, <pre> for code.
4. NO Markdown blocks. Output RAW HTML.

OUTPUT: Clean HTML solution.
`
};

/**
 * NEW: Content Validator
 * Uses a cheap model call to check if content is garbage.
 */
const validateExtractedContent = async (text, apiKey) => {
    // Hard fail for very short text
    if (!text || text.trim().length < 50) {
        return { isValid: false, reason: "Content is too short or empty." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use a fast model for validation
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash"; 
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        Analyze this text sample from an uploaded file.
        Determine if it contains VALID educational content (questions, notes, code, book text) OR if it is INVALID (gibberish, "lorem ipsum", file metadata only, empty tables, or just prompts).

        TEXT SAMPLE:
        "${text.substring(0, 1000)}"

        Respond with JSON:
        { "isValid": boolean, "reason": "short explanation" }
        `;

        const result = await model.generateContent(prompt);
        const response = JSON.parse(result.response.text());
        return response;

    } catch (error) {
        console.warn("Validation check failed to run, assuming valid to be safe:", error);
        return { isValid: true };
    }
};

/**
 * Main Generation Function
 */
export const generateSolution = async (assignmentId, userId, apiKey, mode = 'draft', questionCount = 5) => {
    const validModes = ['explain', 'quiz', 'flashcards', 'draft'];
    if (!validModes.includes(mode)) {
        throw new Error(`Invalid mode: ${mode}`);
    }

    if (!apiKey) throw new Error("API Key is required");

    const genAI = new GoogleGenerativeAI(apiKey);
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const extractedText = assignment.extractedContent?.fullText || "";

    // --- STEP 1: STRICT CONTENT VALIDATION ---
    console.log(`[AI Service] Validating content for: ${assignment.title}`);
    
    // Check 1: Length
    if (extractedText.length < 50) {
        throw new Error("Extracted content is too short to generate a solution. Please upload a clearer file.");
    }

    // Check 2: Semantic Analysis (The Gatekeeper)
    const validation = await validateExtractedContent(extractedText, apiKey);
    
    if (!validation.isValid) {
        const msg = `Content Validation Failed: ${validation.reason || "File does not contain valid study material."}`;
        console.error(msg);
        throw new Error(msg); // Stop here! Don't waste tokens on full generation.
    }

    // --- STEP 2: GENERATION ---
    const promptTemplate = PROMPT_TEMPLATES[mode];
    const prompt = mode === 'quiz'
        ? promptTemplate(assignment.title, assignment.description, extractedText, questionCount)
        : promptTemplate(assignment.title, assignment.description, extractedText);

    try {
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        let modelConfig = { model: modelName };

        // Force JSON structure for data modes
        if (mode === 'quiz' || mode === 'flashcards') {
            modelConfig.generationConfig = { responseMimeType: "application/json" };
        }

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // --- STEP 3: CLEANING & PARSING ---
        if (mode === 'quiz' || mode === 'flashcards') {
            // Use the robust cleaner
            const parsed = cleanAndParseJSON(text);

            // Validate specific structures
            if (mode === 'quiz' && (!parsed.questions || !Array.isArray(parsed.questions))) {
                throw new Error("Invalid Quiz structure received from AI");
            }
            if (mode === 'flashcards' && (!parsed.flashcards || !Array.isArray(parsed.flashcards))) {
                throw new Error("Invalid Flashcard structure received from AI");
            }

            text = JSON.stringify(parsed, null, 2);
        } else {
            // Clean HTML
            text = cleanHTML(text);
        }

        // --- STEP 4: SAVE ---
        let solution = await Solution.findOne({ assignmentId: assignment._id });

        if (solution) {
            solution.mode = mode;
            solution.content = text;
            solution.version += 1;
            await solution.save();
        } else {
            solution = await Solution.create({
                assignmentId: assignment._id,
                userId: userId,
                mode: mode,
                content: text
            });
        }

        assignment.status = 'completed';
        await assignment.save();

        return solution;

    } catch (error) {
        console.error("Gemini Processing Error:", error);
        throw new Error(`AI Generation Failed: ${error.message}`);
    }
};

// ... (Keep answerPDFQuestion and answerTextQuestion as they are, just ensure they check apiKey) ...
export const answerPDFQuestion = async (pdfBuffer, question, apiKey) => { /* ... same as before ... */ };
export const answerTextQuestion = async (textContext, question, apiKey) => { /* ... same as before ... */ };