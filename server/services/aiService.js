import Groq from 'groq-sdk';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
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

const cleanHTML = (text) => text.replace(/```html/g, '').replace(/```/g, '').trim();

/**
 * Get the appropriate system prompt based on mode
 */
const getSystemPrompt = (mode, title) => {
    const prompts = {
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

        quiz: `You are creating a practice quiz based on assignment content.

Return ONLY valid JSON in this exact format:
{
  "quiz": [
    {
      "id": 1,
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

RULES:
- Create 5-10 multiple choice questions
- Cover key concepts from the assignment
- Make questions progressively harder
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
 * Generate Solutions using Structured JSON
 */
export const generateSolution = async (assignmentId, userId, apiKey, mode = 'draft', questionCount = 5) => {
    const assignment = await Assignment.findById(assignmentId);
    const structuredData = assignment.extractedContent?.structuredData;
    const extractedContent = assignment.extractedContent?.extractedContent || '';

    if (!structuredData && !extractedContent) {
        throw new Error("Assignment content not extracted yet. Please open the assignment first.");
    }

    const groq = new Groq({ apiKey });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const systemPrompt = getSystemPrompt(mode, assignment.title);

    // Build context from both structured data and raw extracted content
    let contentContext = '';
    
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

    const userPrompt = `Assignment Title: "${assignment.title}"

${contentContext}

${mode === 'draft' ? 'Create a complete solution document answering ALL questions shown above.' : ''}
${mode === 'explain' ? 'Explain all the key concepts covered in this assignment.' : ''}
${mode === 'quiz' ? `Create ${questionCount} practice quiz questions based on this content.` : ''}
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
        if (typeof rawResponse === 'object') {
            text = rawResponse;
        } else {
            try {
                text = cleanAndParseJSON(String(rawResponse));
            } catch (e) {
                // Fallbacks: try direct JSON.parse, then return error container
                try {
                    text = JSON.parse(String(rawResponse));
                } catch (e2) {
                    text = { error: 'Parsing failed', raw: String(rawResponse) };
                }
            }
        }
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
 * Chat Logic using JSON context
 */
export const answerTextQuestion = async (context, question, apiKey) => {
    const groq = new Groq({ apiKey });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    const systemPrompt = `You are an expert academic tutor. Answer the student's question based on the assignment context provided.

RULES:
1. Be clear and educational
2. If the question is about solving a problem, show step-by-step working
3. If relevant, mention which concepts from the assignment apply
4. Use simple language but maintain academic accuracy
5. Format your response with proper paragraphs and structure`;

    const userPrompt = `Assignment Context:
${context}

Student's Question: ${question}

Please provide a clear, helpful answer.`;
    
    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        model: modelName,
        temperature: 0.4,
        max_tokens: 2000
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