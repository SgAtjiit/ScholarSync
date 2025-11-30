import { GoogleGenerativeAI } from '@google/generative-ai';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import dotenv from 'dotenv';

dotenv.config();

// NOTE: Global genAI initialization has been removed to support BYOK (Bring Your Own Key)

/**
 * Prompt Templates for Different Modes
 */
// const PROMPT_TEMPLATES = {
//     explain: (title, description, content) => `
// You are an expert academic tutor helping a student understand their assignment without giving them the direct answer.

// ASSIGNMENT TITLE: ${title}

// DESCRIPTION: ${description || "No description provided"}

// ASSIGNMENT CONTENT:
// ${content}

// CRITICAL FORMATTING REQUIREMENTS:
// You MUST respond with clean, semantic HTML that is beautifully formatted.

// INSTRUCTIONS:
// 1. Break down the core concepts and topics covered in this assignment
// 2. Explain key theories, formulas, or principles needed to solve it
// 3. Provide study guidance and learning resources
// 4. Use proper HTML structure with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags
// 5. Make it educational and helpful
// 6. Do NOT give direct answers - guide them to learn
// 7. Dont write ''html' in your response
// `,

//     quiz: (title, description, content, questionCount) => `
// You are creating a practice quiz to test understanding of this assignment content.

// ASSIGNMENT TITLE: ${title}

// DESCRIPTION: ${description || "No description provided"}

// ASSIGNMENT CONTENT:
// ${content}

// CRITICAL INSTRUCTIONS:
// 1. Generate EXACTLY ${questionCount} multiple-choice questions based on the content
// 2. Each question must have exactly 4 options
// 3. Questions should test understanding, not just recall
// 4. Vary difficulty levels appropriately
// 5. YOU MUST respond with VALID JSON ONLY, no markdown formatting, no code blocks

// REQUIRED JSON FORMAT:
// {
//   "questions": [
//     {
//       "question": "Question text here?",
//       "options": ["Option A", "Option B", "Option C", "Option D"],
//       "correctAnswer": 0
//     }
//   ]
// }

// The correctAnswer is the 0-based index of the correct option (0, 1, 2, or 3).
// `,

//     flashcards: (title, description, content) => `
// You are a study aid designer. Extract key terms, concepts, and definitions from this assignment to create flashcards.

// ASSIGNMENT TITLE: ${title}

// DESCRIPTION: ${description || "No description provided"}

// ASSIGNMENT CONTENT:
// ${content}

// CRITICAL INSTRUCTIONS:
// 1. Extract 8-12 key terms, concepts, formulas, or definitions
// 2. Each flashcard has a FRONT (term/question) and BACK (definition/answer)
// 3. Keep fronts concise (1-10 words), backs can be 1-3 sentences
// 4. Cover the most important concepts from the content
// 5. YOU MUST respond with VALID JSON ONLY, no markdown formatting, no code blocks

// REQUIRED JSON FORMAT:
// {
//   "flashcards": [
//     {
//       "front": "Term or concept",
//       "back": "Definition or explanation"
//     }
//   ]
// }
// `,

//     draft: (title, description, content) => `
// You are an expert academic tutor generating a polished, ready-to-submit assignment solution.

// ASSIGNMENT TITLE: ${title}

// CONTEXT/DESCRIPTION: 
// ${description || "No specific description provided."}

// ATTACHED CONTENT (Extracted from files):
// ${content}

// CRITICAL FORMATTING REQUIREMENTS:
// You MUST respond with clean, semantic HTML that is beautifully formatted and fully editable.

// INSTRUCTIONS:
// 1. Answer all questions human like point wise with slightly detailed explanations
// 2. Show step-by-step work for math/science problems
// 3. Use proper HTML tags for structure:
//    - <h1> for main title: "${title}"
//    - <h2> for section headings (e.g., "Question 1", "Solution", "Analysis")
//    - <h3> for sub-sections
//    - <p> for paragraphs (keep them concise and well-spaced)
//    - <ul> and <li> for bullet points
//    - <ol> and <li> for numbered lists
//    - <strong> for important terms
//    - <em> for emphasis
//    - Use <br> sparingly for line breaks when needed
// 4. Start with: <h1>${title}</h1>
// 5. Organize content with clear headings for each question/section
// 6. Be professional, thorough, and academic
// 7. Make it visually appealing with good spacing and hierarchy
// 8.No extra thing Like Introduction,conclusion,void spaces must not be there!!
// 9.Please avoid giving very long answers to any question,if it may be explained in lesser no of words,lines
// 10.Dont write ''html' in your response
// OUTPUT ONLY THE HTML CONTENT - no markdown, no code blocks, just pure HTML.
// Note : Please try to avoid any extra usage of very much of extra spaces , very much of '\n' and very much of special chars like '*','/','#' etc.. 
// `
// };

const PROMPT_TEMPLATES = {
  explain: (title, description, content) => `
You are an expert academic tutor who helps a student understand their assignment without giving the direct answer.

ASSIGNMENT TITLE: ${title}

DESCRIPTION: ${description || "No description provided"}

ASSIGNMENT CONTENT:
${content}

CRITICAL FORMATTING & CONTENT REQUIREMENTS:
- Respond with clean, semantic HTML only (no surrounding explanation or commentary).
- Avoid extra special characters (no stray '*', '/', '#', excessive punctuation).
- Avoid large blocks of extra whitespace or many consecutive blank lines.
- Use clear content segregation and consistent spacing so the output is easy to read and copy.
- The explanation must be completely separate from the drafted solution.
- Do NOT give direct answers — guide learning and show approach, not final answers.
- Do NOT include the literal word 'html' in the output.
- **No matter how many questions are processed, formatting must remain perfectly consistent.**

INSTRUCTIONS (Explain version):
1. Break down the core concepts and topics covered by this assignment.
2. Explain key theories, formulas, or principles needed to approach it.
3. For maths/science/algorithms: give step-by-step reasoning (no final numeric answers) and highlight formulas.
4. For non-math topics: use short, bulleted conceptual steps.
5. Provide study guidance, understanding tips, and resource directions.
6. Use semantic HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
7. Keep content concise, clean, and well spaced.

OUTPUT: Return only the HTML content for the explanation.
`,

  quiz: (title, description, content, questionCount) => `
You are creating a practice quiz to test understanding of this assignment content.

ASSIGNMENT TITLE: ${title}

DESCRIPTION: ${description || "No description provided"}

ASSIGNMENT CONTENT:
${content}

CRITICAL INSTRUCTIONS:
1. Generate EXACTLY ${questionCount} multiple-choice questions.
2. Each question must have exactly 4 options.
3. Questions should test understanding, not recall.
4. Vary difficulty appropriately.
5. YOU MUST respond with VALID JSON ONLY. No markdown, no code blocks, no extra text.
6. Avoid extra special characters or unnecessary whitespace.
7. **No matter how many questions are processed, JSON structure must remain perfectly consistent.**

REQUIRED JSON FORMAT:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

The correctAnswer is the 0-based index of correct option.
`,

  flashcards: (title, description, content) => `
You are a study aid designer. Extract key terms, concepts, and definitions from this assignment to create flashcards.

ASSIGNMENT TITLE: ${title}

DESCRIPTION: ${description || "No description provided"}

ASSIGNMENT CONTENT:
${content}

CRITICAL INSTRUCTIONS:
1. Extract 8–12 important terms or definitions.
2. EACH flashcard must have:
   - FRONT: 1–10 words
   - BACK: 1–3 clear sentences
3. YOU MUST respond only in VALID JSON (no markdown, no code blocks).
4. Avoid extra special characters and excessive spaces.
5. **No matter how many flashcards are created, JSON formatting must always remain consistent.**

REQUIRED JSON FORMAT:
{
  "flashcards": [
    {
      "front": "Term or concept",
      "back": "Definition or explanation"
    }
  ]
}
`,

  draft: (title, description, content) => `
You are an expert academic tutor generating a polished, ready-to-submit assignment solution.

ASSIGNMENT TITLE: ${title}

CONTEXT / DESCRIPTION:
${description || "No specific description provided."}

ATTACHED CONTENT (Extracted from files):
${content}

CRITICAL FORMATTING & CONTENT REQUIREMENTS:
- Respond with clean, semantic HTML only.
- Must begin with <h1>${title}</h1>
- Avoid extra characters (*, /, # etc.) and avoid extra spaces or blank lines.
- Do NOT include the literal word 'html'.
- Explanation and Solution must be separate and clearly labeled.
- Solution must strictly follow the "Q(No) - Ans -" format.
- **Maths/science/algorithms: step-by-step ordered list, formulas highlighted.**
- **Other subjects: short bulleted list answers.**
- No Introduction or Conclusion unless originally required.
- Keep answers concise.
- **Even if there are MANY questions, formatting must NEVER break — numbering, structure, and HTML hierarchy must remain perfect.**

STRUCTURE & TAG GUIDELINES:
- <h1> for main title
- <h2> for "Drafted Explanation" and "Drafted Solution"
- For each question:
  <h3>Q{N} - [short title if available]</h3>
  <p><strong>Ans -</strong></p>
  Then:
    - <ol> for step-by-step numeric solving (math/science/algorithms)
    - <ul> for conceptual/bulleted answers
- Keep steps short and formulas highlighted with <strong> or <em>.
- Maintain tight, clean formatting with consistent spacing.
- No unnecessary line breaks or special characters.

INSTRUCTIONS (Draft Version):
1. Answer all questions point-wise with clear, slightly detailed explanations.
2. Show step-by-step work for math/science/algorithm questions.
3. Use 3–6 concise bullet points for theory questions.
4. Keep responses short but complete.

OUTPUT: Return only the clean, final HTML.
`
};


/**
 * Main AI Service Function with Multi-Mode Support
 * UPDATED: Now requires apiKey as the 3rd argument
 */
export const generateSolution = async (assignmentId, userId, apiKey, mode = 'draft', questionCount = 5) => {
    const validModes = ['explain', 'quiz', 'flashcards', 'draft'];
    if (!validModes.includes(mode)) {
        throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    if (!apiKey) {
        throw new Error("API Key is required for generation");
    }

    // 1. Initialize Gemini with User's Key
    const genAI = new GoogleGenerativeAI(apiKey);

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const extractedText = assignment.extractedContent?.fullText || "";
    if (extractedText.length < 20) {
        throw new Error("Not enough content extracted to generate a solution. Please check the assignment files or description.");
    }

    const promptTemplate = PROMPT_TEMPLATES[mode];
    const prompt = mode === 'quiz'
        ? promptTemplate(assignment.title, assignment.description, extractedText, questionCount)
        : promptTemplate(assignment.title, assignment.description, extractedText);

    try {
        const gemini_model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        let modelConfig = { model: gemini_model }; // Updated to faster Flash 2.0 if available, or keep 1.5-flash

        if (mode === 'quiz' || mode === 'flashcards') {
            modelConfig.generationConfig = {
                responseMimeType: "application/json"
            };
        }

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // (Validation logic remains identical)
        if (mode === 'quiz' || mode === 'flashcards') {
            try {
                const parsed = JSON.parse(text);

                if (mode === 'quiz') {
                    if (!parsed.questions || !Array.isArray(parsed.questions)) {
                        throw new Error('Invalid quiz JSON structure');
                    }
                    parsed.questions.forEach((q, idx) => {
                        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
                            throw new Error(`Invalid question structure at index ${idx}`);
                        }
                        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
                            throw new Error(`Invalid correctAnswer at index ${idx}`);
                        }
                    });
                }

                if (mode === 'flashcards') {
                    if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
                        throw new Error('Invalid flashcards JSON structure');
                    }
                    parsed.flashcards.forEach((card, idx) => {
                        if (!card.front || !card.back) {
                            throw new Error(`Invalid flashcard structure at index ${idx}`);
                        }
                    });
                }

                text = JSON.stringify(parsed, null, 2);
            } catch (parseError) {
                console.error("JSON Parsing Error:", parseError);
                throw new Error(`Failed to parse ${mode} response as JSON: ${parseError.message}`);
            }
        }

        // Database logic
        let solution = await Solution.findOne({ assignmentId: assignment._id });

        if (solution) {
            solution.mode = mode;
            solution.content = text;
            solution.promptUsed = prompt;
            solution.editedContent = null;
            solution.version += 1;
            await solution.save();
        } else {
            solution = await Solution.create({
                assignmentId: assignment._id,
                userId: userId,
                mode: mode,
                promptUsed: prompt,
                content: text
            });
        }

        assignment.status = 'processing';
        await assignment.save();

        return solution;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Failed to generate ${mode} solution from AI: ${error.message}`);
    }
};

/**
 * Answer questions about a PDF using Gemini Multimodal
 * UPDATED: Requires apiKey as 3rd argument
 */
export const answerPDFQuestion = async (pdfBuffer, question, apiKey) => {
    try {
        if (!apiKey) throw new Error("API Key required for PDF Chat");
        if (!pdfBuffer) throw new Error("PDF/Doc Buffer required for Document Chat");

        // Initialize with User Key
        const genAI = new GoogleGenerativeAI(apiKey);
        const gemini_model = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: gemini_model });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBuffer.toString('base64')
                }
            },
            {
                text: `You are a helpful AI assistant analyzing a PDF document. Answer the following question based on the PDF content. Be concise, accurate, and helpful.

Question: ${question}

Provide a clear answer with relevant details from the document.`
            }
        ]);

        const response = await result.response;
        const answer = response.text();

        return answer;

    } catch (error) {
        console.error('PDF Question Error:', error);
        throw new Error('Failed to answer question: ' + error.message);
    }
};

/**
 * Answer questions about text content (DOCX, TXT, etc.)
 */
export const answerTextQuestion = async (textContext, question, apiKey) => {
    try {
        if (!apiKey) throw new Error("API Key required for Chat");
        if (!textContext) throw new Error("Context required for Chat");

        const genAI = new GoogleGenerativeAI(apiKey);
        const gemini_model = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: gemini_model });

        const prompt = `You are a helpful AI assistant analyzing a document. Answer the following question based on the provided document content. Be concise, accurate, and helpful.

DOCUMENT CONTENT:
${textContext.substring(0, 100000)} ... (truncated if too long)

QUESTION: ${question}

Provide a clear answer with relevant details from the document.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        return answer;

    } catch (error) {
        console.error('Text Question Error:', error);
        throw new Error('Failed to answer question: ' + error.message);
    }
};