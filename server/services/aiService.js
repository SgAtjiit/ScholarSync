import Groq from 'groq-sdk';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import { runAgentPipeline, validateAndCleanContent } from './agentService.js';
import dotenv from 'dotenv';

dotenv.config();

// Helpers
const cleanAndParseJSON = (text) => {
    if (typeof text !== 'string') return text;
    try {
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(cleaned);
    } catch (e) { throw new Error("JSON Parsing Error: " + e.message); }
};

const cleanHTML = (text) => {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text.replace(/```html/g, '').replace(/```/g, '').trim();

    // Normalize terminal blocks for consistent Google Docs rendering
    cleaned = cleaned
        .replace(/<div class="terminal-title">\s*Sample Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<div class="terminal-title">\s*Expected Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<pre>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/gi, '<pre>$1</pre>')
        .replace(/<pre><\/pre>/gi, '<pre>Program executed successfully.</pre>');

    return cleaned;
};

/**
 * Clean text from encoding artifacts and garbage characters
 */
const cleanExtractedContent = (text) => {
    if (!text) return '';
    return text
        // Remove OCR/encoding artifacts
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/[ÃÂ§Ã¼Ã¶ÃŸÃ¤Ã±Ã©Ã¨Ã¢ÃªÃ®Ã´Ã»]/g, '')
        .replace(/;Ç[0-9A-Za-z]+/g, '')
        .replace(/[†‡•·°±×÷]+/g, ' ')
        .replace(/[\u0080-\u00FF]+/g, match => {
            // Keep valid extended ASCII if it makes sense
            if (/[àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ]/.test(match)) {
                return match;
            }
            return ' ';
        })
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};

/**
 * Get the appropriate system prompt based on mode
 */
const getSystemPrompt = (mode, title, quizOptions = {}) => {
    const { difficulty = 'medium', questionType = 'mixed', questionCount = 5 } = quizOptions;
    
    // Difficulty descriptions
    const difficultyGuide = {
        easy: 'Basic recall and understanding questions. Focus on definitions, simple facts, and direct comprehension.',
        medium: 'Application and analysis questions. Students should apply concepts to solve problems.',
        hard: 'Critical thinking and synthesis. Complex multi-step problems requiring deep understanding.'
    };
    
    // Question type guides
    const questionTypeGuide = {
        mixed: 'Mix of multiple choice, short answer, and true/false questions.',
        mcq: 'Only multiple choice questions with 4 options each.',
        short: 'Only short answer/open-ended questions requiring 1-3 sentence responses.',
        truefalse: 'Only true/false questions with explanations.'
    };
    
    const prompts = {
        draft: `You are a professional academic solutions provider. Create PROFESSIONAL-GRADE solutions with publication-quality formatting.

YOUR RESPONSE MUST BE VALID HTML with these formatting rules:

📋 STRUCTURE:
- Use <h2> for question headers: "Question 1" 
- Use <h3> for sub-parts: "Part (a)", "Part (i)"
- Use <p> for explanations (always end with periods)
- Use <strong> for emphasis NEVER CAPS

📊 TABLES (when data needs comparison/organization):
<table class="solution-table">
  <thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>
  <tbody>
    <tr><td>Data</td><td>Value</td></tr>
  </tbody>
</table>

💻 CODE BLOCKS (for C++, Python, Java, SQL, etc):
<pre class="code-block"><code class="language-cpp">
#include &lt;iostream&gt;
using namespace std;

int main() {
    cout &lt;&lt; "Hello World" &lt;&lt; endl;
    return 0;
}
</code></pre>

🖥️ PROGRAM RUN OUTPUT (required whenever code is present):
<div class="terminal-output">
<div class="terminal-title">Program Run</div>
<pre>Hello World
Final Grade: 86.5</pre>
</div>

🔢 FORMULAS & EQUATIONS:
- Use <code class="formula"> for inline formulas
- Example: <code class="formula">E = mc²</code> or <code class="formula">f(x) = 2x + 1</code>

📝 LISTS:
- Use <ul> for bullet points
- Use <ol> for numbered steps
- Example: <ol><li>Step one</li><li>Step two</li></ol>

☑️ SOLUTION CHECKLIST:
1. ✓ Answer EVERY question completely
2. ✓ Show step-by-step working for all calculations
3. ✓ Explain reasoning before the solution
4. ✓ Use proper code syntax highlighting tags
5. ✓ Add a "Program Run" terminal block after each code block
6. ✓ Create tables for comparative data
7. ✓ Use formulas in <code class="formula"> tags
8. ✓ Proper spacing: 1 blank line between questions
9. ✓ Professional academic language
10. ✓ If question references a figure, describe in context
11. ✓ Verify all HTML is valid and properly closed

🎨 RENDERING HINTS (system will apply):
- Code blocks auto-highlight syntax
- Tables auto-border and center
- Formulas auto-mono-space
- All text auto-colors to match dark theme`,

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

        quiz: `You are creating a practice quiz based on assignment content.

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
- Create exactly ${questionCount} questions
- Match the ${difficulty} difficulty level
- Cover key concepts from the assignment
- ${difficulty === 'easy' ? 'Focus on basic recall and definitions' : difficulty === 'hard' ? 'Include complex multi-step problems' : 'Balance conceptual and application questions'}
- Include calculation-based questions if applicable
- Explanations should be educational`,

        flashcards: `You are creating study flashcards based on assignment content.

Return ONLY valid JSON in this exact format:
{
  "flashcards": [
    {
      "id": 1,
      "front": "Term or question",
      "back": "Definition or answer",
      "category": "Topic category"
    }
  ]
}

RULES:
- Create 10-15 flashcards
- Include key terms, formulas, and concepts
- Front should be concise, back should be comprehensive
- Cover all major topics in the assignment`
    };

    return prompts[mode] || prompts.draft;
};

/**
 * Generate Solutions using Multi-Agent System for high accuracy
 */
export const generateSolution = async (assignmentId, userId, apiKey, mode = 'draft', quizOptions = {}, selectedDocId = null) => {
    // Handle legacy questionCount parameter
    if (typeof quizOptions === 'number') {
        quizOptions = { questionCount: quizOptions };
    }
    
    const assignment = await Assignment.findById(assignmentId);
    const structuredData = assignment.extractedContent?.structuredData;
    const rawExtractedContent = assignment.extractedContent?.extractedContent || '';

    if (!structuredData && !rawExtractedContent) {
        throw new Error("Assignment content not extracted yet. Please open the assignment first.");
    }

    // Clean the extracted content from encoding artifacts
    const extractedContent = cleanExtractedContent(rawExtractedContent);

    const groq = new Groq({ apiKey });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    // Build content context
    let contentContext = '';
    
    // If specific document selected, prioritize its content
    if (selectedDocId) {
        contentContext += `\n⚠️ FOCUS ON THIS DOCUMENT: ${selectedDocId}\n`;
        contentContext += `Filter and prioritize content from document ID: ${selectedDocId}\n\n`;
    }
    
    if (structuredData?.questions) {
        contentContext += '\n=== QUESTIONS FROM ASSIGNMENT ===\n';
        Object.entries(structuredData.questions).forEach(([key, q]) => {
            contentContext += `\n${key.toUpperCase()}: ${q.question}\n`;
            if (q.imageInfo) contentContext += `[Related Figure/Diagram: ${q.imageInfo}]\n`;
        });
    }
    
    if (extractedContent) {
        contentContext += '\n=== FULL EXTRACTED CONTENT ===\n' + extractedContent;
    }

    // For draft and explain modes, use the Multi-Agent system for higher quality
    if (mode === 'draft' || mode === 'explain') {
        console.log(`Using Multi-Agent Pipeline for ${mode} mode...`);
        
        const agentResult = await runAgentPipeline(contentContext, apiKey, mode);
        
        if (agentResult.error) {
            console.error('Agent Pipeline Error:', agentResult.error);
            // Fall back to single-pass generation
        } else if (agentResult.html) {
            const text = agentResult.html;
            console.log(`Agent Pipeline completed: ${agentResult.questionCount} questions, ${agentResult.solvedCount} solved`);
            
            return await Solution.findOneAndUpdate(
                { assignmentId, userId, mode },
                { content: text, $inc: { version: 1 } },
                { upsert: true, new: true }
            );
        }
    }

    // For quiz/flashcards or fallback, use single-pass generation
    const systemPrompt = getSystemPrompt(mode, assignment.title, quizOptions);

    const userPrompt = `Assignment Title: "${assignment.title}"

${contentContext}

${mode === 'draft' ? 'Create a complete solution document answering ALL questions shown above.' : ''}
${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
${mode === 'quiz' ? `Create ${quizOptions.questionCount || 5} practice quiz questions based on this content. Difficulty: ${quizOptions.difficulty || 'medium'}. Type: ${quizOptions.questionType || 'mixed'}.` : ''}
${mode === 'flashcards' ? 'Create study flashcards for the key terms and concepts.' : ''}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    const completion = await groq.chat.completions.create({
        messages,
        model: modelName,
        temperature: mode === 'draft' || mode === 'explain' ? 0.3 : 0.5,
        max_tokens: 8000
    });
    
    const rawResponse = completion.choices[0]?.message?.content || '';

    let text;
    if (mode === 'quiz' || mode === 'flashcards') {
        // Accept either already-parsed object or string JSON from the model
        let parsed;
        if (typeof rawResponse === 'object') {
            parsed = rawResponse;
        } else {
            try {
                parsed = cleanAndParseJSON(String(rawResponse));
            } catch (e) {
                // Fallbacks: try direct JSON.parse, then return error container
                try {
                    parsed = JSON.parse(String(rawResponse));
                } catch (e2) {
                    parsed = { error: 'Parsing failed', raw: String(rawResponse) };
                }
            }
        }
        
        // Normalize quiz response - frontend expects { questions: [...] }
        if (mode === 'quiz') {
            if (parsed.quiz && !parsed.questions) {
                parsed.questions = parsed.quiz;
                delete parsed.quiz;
            }
            // Handle case where model returns array directly
            if (Array.isArray(parsed)) {
                parsed = { questions: parsed };
            }
        }
        
        // Normalize flashcards response - frontend expects { flashcards: [...] }
        if (mode === 'flashcards') {
            if (parsed.cards && !parsed.flashcards) {
                parsed.flashcards = parsed.cards;
                delete parsed.cards;
            }
            // Handle case where model returns array directly
            if (Array.isArray(parsed)) {
                parsed = { flashcards: parsed };
            }
        }
        
        text = parsed;
    } else {
        // For HTML/draft/explain modes ensure we return clean HTML string
        if (typeof rawResponse === 'string') text = cleanHTML(rawResponse);
        else text = cleanHTML(JSON.stringify(rawResponse));
    }

    return await Solution.findOneAndUpdate(
        { assignmentId, userId, mode },
        { content: text, $inc: { version: 1 } },
        { upsert: true, new: true }
    );
};

/**
 * Chat Logic using extracted assignment content - STREAMING VERSION
 */
export const answerTextQuestionStream = async (context, question, apiKey, onChunk) => {
    const groq = new Groq({ apiKey });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    // Clean the context from encoding artifacts
    const cleanedContext = cleanExtractedContent(context);
    
    const systemPrompt = `You are an expert academic tutor helping a student with their assignment. You have access to the full extracted content of the assignment including all questions, figures, diagrams, and text.

YOUR CAPABILITIES:
- You can see all questions in the assignment
- You can see descriptions of all figures and diagrams ([FIGURE: ...] tags)
- You can explain concepts, solve problems, and provide guidance

RESPONSE FORMAT RULES (important):
1. Use clean markdown formatting for readability.
2. Use short section headings like: "### Explanation", "### Steps", "### Final Answer" when helpful.
3. Use bullet points for lists and numbered lists for step-by-step solutions.
4. Use fenced code blocks for code examples:
    \`\`\`cpp
    // code
    \`\`\`
5. Use inline code for formulas/variables like \`V = IR\`.
6. Keep paragraphs short (2-4 lines), avoid giant text walls.
7. If user asks direct answer only, keep it concise.

CONTENT RULES:
1. Be conversational, helpful, and educational
2. If asked to solve a problem, show step-by-step working with formulas
3. If asked about a figure or diagram, reference the description provided
4. If asked to summarize, give a clear overview of all questions
5. Use simple language but maintain academic accuracy
6. Format your response with clear, readable structure
7. If you're unsure about something, say so honestly

IMPORTANT: The assignment content includes [FIGURE: ...] descriptions where images/diagrams appeared. Use these descriptions to answer questions about visuals.`;

    const userPrompt = `=== ASSIGNMENT CONTENT ===
${cleanedContext}

=== STUDENT'S QUESTION ===
${question}

Please provide a clear, well-formatted answer in markdown.`;
    
    const stream = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        model: modelName,
        temperature: 0.4,
        max_tokens: 3000,
        stream: true
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
            fullResponse += content;
            onChunk(content);
        }
    }
    
    return fullResponse;
};

/**
 * Chat Logic using extracted assignment content - NON-STREAMING (fallback)
 */
export const answerTextQuestion = async (context, question, apiKey) => {
    const groq = new Groq({ apiKey });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    // Clean the context from encoding artifacts
    const cleanedContext = cleanExtractedContent(context);
    
    const systemPrompt = `You are an expert academic tutor helping a student with their assignment. You have access to the full extracted content of the assignment including all questions, figures, diagrams, and text.

YOUR CAPABILITIES:
- You can see all questions in the assignment
- You can see descriptions of all figures and diagrams ([FIGURE: ...] tags)
- You can explain concepts, solve problems, and provide guidance

RESPONSE FORMAT RULES (important):
1. Use clean markdown formatting for readability.
2. Use short section headings like: "### Explanation", "### Steps", "### Final Answer" when helpful.
3. Use bullet points for lists and numbered lists for step-by-step solutions.
4. Use fenced code blocks for code examples:
    \`\`\`cpp
    // code
    \`\`\`
5. Use inline code for formulas/variables like \`V = IR\`.
6. Keep paragraphs short (2-4 lines), avoid giant text walls.
7. If user asks direct answer only, keep it concise.

CONTENT RULES:
1. Be conversational, helpful, and educational
2. If asked to solve a problem, show step-by-step working with formulas
3. If asked about a figure or diagram, reference the description provided
4. If asked to summarize, give a clear overview of all questions
5. Use simple language but maintain academic accuracy
6. Format your response with clear, readable structure
7. If you're unsure about something, say so honestly

IMPORTANT: The assignment content includes [FIGURE: ...] descriptions where images/diagrams appeared. Use these descriptions to answer questions about visuals.`;

    const userPrompt = `=== ASSIGNMENT CONTENT ===
${cleanedContext}

=== STUDENT'S QUESTION ===
${question}

Please provide a clear, well-formatted answer in markdown.`;
    
    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        model: modelName,
        temperature: 0.4,
        max_tokens: 3000
    });
    
    return completion.choices[0]?.message?.content || '';
};

/**
 * Explain Concept - dedicated function for better concept explanations
 */
export const explainConcept = async (assignmentId, userId, apiKey, topic = null) => {
    return await generateSolution(assignmentId, userId, apiKey, 'explain');
};

/**
 * FIXED: submitSolution Export (Crucial for fixing your crash)
 */
export const submitSolution = async (solutionId, userId, editedContent) => {
    return await Solution.findOneAndUpdate(
        { _id: solutionId, userId },
        { content: editedContent },
        { new: true }
    );
};