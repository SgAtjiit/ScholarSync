import { generateSolution, answerTextQuestion, answerTextQuestionStream, submitSolution as saveSolution, explainConcept } from '../services/aiService.js';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import Chat from '../models/Chat.js';

export const generateAiSolution = async (req, res) => {
    const { assignmentId, userId, mode, questionCount, difficulty, questionType, selectedDocId } = req.body;
    try {
        const apiKey = req.headers['x-groq-api-key'];
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Build quiz options object
        const quizOptions = {
            questionCount: questionCount || 5,
            difficulty: difficulty || 'medium',
            questionType: questionType || 'mixed'
        };

        console.log(`Generating ${mode} for assignment ${assignmentId}${selectedDocId ? ` (Document: ${selectedDocId})` : ''}${mode === 'quiz' ? ` (${quizOptions.questionCount} ${quizOptions.difficulty} questions)` : ''}`);
        const solution = await generateSolution(assignmentId, userId, apiKey, mode, quizOptions, selectedDocId);
        console.log(`Successfully generated ${mode}, content length: ${solution.content?.length}`);
        
        res.json(solution);
    } catch (error) { 
        console.error('Generate solution error:', error);
        res.status(500).json({ error: error.message }); 
    }
};

export const explainConceptHandler = async (req, res) => {
    const { assignmentId, userId, topic } = req.body;
    try {
        const apiKey = req.headers['x-groq-api-key'];
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const solution = await explainConcept(assignmentId, userId, apiKey, topic);
        res.json(solution);
    } catch (error) { 
        console.error('Explain concept error:', error);
        res.status(500).json({ error: error.message }); 
    }
};

export const chatWithAssignment = async (req, res) => {
    const { assignmentId, question } = req.body;
    try {
        const apiKey = req.headers['x-groq-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        const assignment = await Assignment.findById(assignmentId);
        
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        // Build comprehensive context from extracted content
        let context = '';
        
        // Add assignment title and course info
        context += `Assignment: ${assignment.title || 'Unknown'}\n`;
        context += `Course: ${assignment.courseName || 'Unknown'}\n\n`;
        
        // Add the full extracted content (this includes all [FIGURE: ...] descriptions)
        if (assignment.extractedContent?.extractedContent) {
            context += '=== EXTRACTED CONTENT ===\n';
            context += assignment.extractedContent.extractedContent;
        }
        
        // Also add structured data if available
        if (assignment.extractedContent?.structuredData?.questions) {
            context += '\n\n=== STRUCTURED QUESTIONS ===\n';
            Object.entries(assignment.extractedContent.structuredData.questions).forEach(([key, q]) => {
                context += `\n${key}: ${q.question}\n`;
                if (q.imageInfo) context += `[Related Figure: ${q.imageInfo}]\n`;
                if (q.answer) context += `Answer hint: ${q.answer}\n`;
            });
        }
        
        if (!context || context.length < 50) {
            return res.status(400).json({ error: 'Assignment content not extracted yet. Please wait for extraction to complete.' });
        }

        console.log(`Chat with assignment: ${assignment.title}, Question: ${question.substring(0, 50)}...`);
        
        const answer = await answerTextQuestion(context, question, apiKey);
        res.json({ answer });
    } catch (error) { 
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message }); 
    }
};

/**
 * Streaming Chat with Assignment - SSE endpoint
 */
export const chatWithAssignmentStream = async (req, res) => {
    const { assignmentId, question } = req.body;
    
    try {
        const apiKey = req.headers['x-groq-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        const assignment = await Assignment.findById(assignmentId);
        
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        // Build comprehensive context from extracted content
        let context = '';
        context += `Assignment: ${assignment.title || 'Unknown'}\n`;
        context += `Course: ${assignment.courseName || 'Unknown'}\n\n`;
        
        if (assignment.extractedContent?.extractedContent) {
            context += '=== EXTRACTED CONTENT ===\n';
            context += assignment.extractedContent.extractedContent;
        }
        
        if (assignment.extractedContent?.structuredData?.questions) {
            context += '\n\n=== STRUCTURED QUESTIONS ===\n';
            Object.entries(assignment.extractedContent.structuredData.questions).forEach(([key, q]) => {
                context += `\n${key}: ${q.question}\n`;
                if (q.imageInfo) context += `[Related Figure: ${q.imageInfo}]\n`;
            });
        }
        
        if (!context || context.length < 50) {
            return res.status(400).json({ error: 'Assignment content not extracted yet.' });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        console.log(`Streaming chat: ${assignment.title}, Question: ${question.substring(0, 50)}...`);

        // Stream the response
        await answerTextQuestionStream(context, question, apiKey, (chunk) => {
            // Send each chunk as SSE data
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        });

        // Send done signal
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        
    } catch (error) { 
        console.error('Stream chat error:', error);
        
        // Handle rate limit errors specially
        let errorMessage = error.message;
        if (error.status === 429 || error.message?.includes('rate_limit') || error.message?.includes('Rate limit')) {
            // Extract retry time if available
            const retryMatch = error.message?.match(/try again in (\d+m?\d*\.?\d*s?)/i);
            const retryTime = retryMatch ? retryMatch[1] : '5 minutes';
            errorMessage = `⏳ Rate limit reached. Please wait ${retryTime} and try again. Consider upgrading to Groq Dev Tier for higher limits.`;
        }
        
        // Send error as SSE
        res.write(`data: ${JSON.stringify({ error: errorMessage, isRateLimit: error.status === 429 })}\n\n`);
        res.end();
    }
};

export const getSolution = async (req, res) => {
    try {
        const { mode } = req.query;
        const query = { assignmentId: req.params.assignmentId };
        if (mode) query.mode = mode;
        
        const solution = await Solution.findOne(query).sort({ createdAt: -1 });
        res.json(solution);
    } catch (error) { 
        console.error('Get solution error:', error);
        res.status(500).json({ error: error.message }); 
    }
};

/**
 * Get chat history for an assignment
 */
export const getChatHistory = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const chat = await Chat.findOne({ userId, assignmentId });
        res.json(chat || { messages: [] });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Save a message to chat history
 */
export const saveChatMessage = async (req, res) => {
    try {
        const { assignmentId, userId, message, assignmentTitle } = req.body;
        
        if (!assignmentId || !userId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Find or create chat document
        let chat = await Chat.findOne({ userId, assignmentId });
        
        if (!chat) {
            chat = new Chat({
                userId,
                assignmentId,
                assignmentTitle,
                messages: []
            });
        }
        
        // Add the new message
        chat.messages.push({
            role: message.role,
            content: message.content,
            timestamp: new Date()
        });
        chat.lastActivity = new Date();
        
        await chat.save();
        res.json({ success: true, messageCount: chat.messages.length });
    } catch (error) {
        console.error('Save chat message error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Clear chat history for an assignment
 */
export const clearChatHistory = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        await Chat.deleteOne({ userId, assignmentId });
        res.json({ success: true });
    } catch (error) {
        console.error('Clear chat history error:', error);
        res.status(500).json({ error: error.message });
    }
};