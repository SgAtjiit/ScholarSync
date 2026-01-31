import { generateSolution, answerTextQuestion, submitSolution as saveSolution, explainConcept } from '../services/aiService.js';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';

export const generateAiSolution = async (req, res) => {
    const { assignmentId, userId, mode, questionCount } = req.body;
    try {
        const apiKey = req.headers['x-groq-api-key'];
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        console.log(`Generating ${mode} for assignment ${assignmentId}`);
        const solution = await generateSolution(assignmentId, userId, apiKey, mode, questionCount);
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
            return res.status(400).json({ error: 'API key is required' });
        }

        const assignment = await Assignment.findById(assignmentId);
        
        // Use both structured data and extracted content for better context
        let context = '';
        if (assignment.extractedContent?.structuredData) {
            context += JSON.stringify(assignment.extractedContent.structuredData);
        }
        if (assignment.extractedContent?.extractedContent) {
            context += '\n\nExtracted Content:\n' + assignment.extractedContent.extractedContent;
        }
        
        if (!context) {
            return res.status(400).json({ error: 'Assignment content not extracted yet' });
        }

        const answer = await answerTextQuestion(context, question, apiKey);
        res.json({ answer });
    } catch (error) { 
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message }); 
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