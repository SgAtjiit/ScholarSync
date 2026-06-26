import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import { createPDF } from '../utils/pdfGenerator.js';

const getLlmConfig = (req) => {
    return {
        provider: req.headers['x-active-provider'] || 'groq',
        apiKey: req.headers['x-active-api-key'] || req.headers['x-groq-api-key'],
        textModel: req.headers['x-active-text-model'],
        visionModel: req.headers['x-active-vision-model'],
        ollamaUrl: req.headers['x-ollama-url']
    };
};





export const getSolution = async (req, res) => {
    try {
        const { mode } = req.query;
        const userId = req.user.id;
        const query = { assignmentId: req.params.assignmentId };
        if (userId) query.userId = userId;
        if (mode) query.mode = mode;
        
        const solution = await Solution.findOne(query).sort({ createdAt: -1 });
        res.json(solution);
    } catch (error) { 
        console.error('Get solution error:', error);
        res.status(500).json({ error: error.message }); 
    }
};



/**
 * Save a solution generated client-side
 * This endpoint stores solutions that were generated in the browser
 */
export const saveClientSolution = async (req, res) => {
    try {
        const { assignmentId, mode, content, generatedAt, source } = req.body;
        const userId = req.user.id;
        
        if (!assignmentId || !userId || !mode || !content) {
            return res.status(400).json({ error: 'Missing required fields: assignmentId, userId, mode, content' });
        }
        
        // Update or create solution
        const solution = await Solution.findOneAndUpdate(
            { assignmentId, userId, mode },
            {
                assignmentId,
                userId,
                mode,
                content,
                generatedAt: generatedAt || new Date(),
                source: source || 'client-side',
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );
        
        res.json({ 
            success: true, 
            solutionId: solution._id,
            mode: solution.mode,
        });
    } catch (error) {
        console.error('Save client solution error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Save extracted content for an assignment
 * This caches extracted text so we don't need to re-extract
 */
export const saveExtractedContent = async (req, res) => {
    try {
        const { assignmentId, content, pageCount, hasImages, tokenEstimate } = req.body;
        
        if (!assignmentId || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        await Assignment.findByIdAndUpdate(assignmentId, {
            'extractedContent.extractedContent': content,
            'extractedContent.pageCount': pageCount,
            'extractedContent.hasImages': hasImages,
            'extractedContent.tokenEstimate': tokenEstimate,
            'extractedContent.extractedAt': new Date(),
            'extractedContent.source': 'client-side',
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Save extracted content error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Compile HTML to PDF and send as download
 */
export const compilePdf = async (req, res) => {
    try {
        const { htmlContent } = req.body;
        if (!htmlContent) {
            return res.status(400).json({ error: 'htmlContent is required' });
        }
        const pdfBuffer = await createPDF(htmlContent);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Solution.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Compile PDF error:', error);
        res.status(500).json({ error: error.message });
    }
};
