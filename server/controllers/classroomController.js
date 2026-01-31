import Assignment from '../models/Assignment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { scanClassroomService } from '../services/classroomService.js';
import { extractTextFromMaterials } from '../utils/extractor.js';
import { google } from 'googleapis';

export const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ userId: req.params.userId });
        res.json(courses);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAssignments = async (req, res) => {
    try {
        const { userId } = req.params;
        const assignments = await Assignment.find({ userId }).sort({ createdAt: -1 });
        res.json(assignments);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const triggerScan = async (req, res) => {
    try {
        const result = await scanClassroomService(req.body.userId);
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAssignmentDetailsAndExtract = async (req, res) => {
    const { assignmentId } = req.params;
    const { userId } = req.body;

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        const apiKey = req.headers['x-groq-api-key'];

        // If already extracted, return existing data
        if (assignment.extractedContent?.structuredData) {
            return res.json({
                assignment,
                message: "Already extracted",
                warnings: assignment.extractedContent.structuredData._warnings || []
            });
        }

        const user = await User.findById(userId || assignment.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });
        const { token } = await oauth2Client.getAccessToken();

        const result = await extractTextFromMaterials(assignment.materials, token, apiKey);

        // Handle extraction error
        if (result.extractedJson?.error) {
            return res.status(422).json({
                error: result.extractedJson.error,
                failedFiles: result.failedFiles || []
            });
        }

        assignment.extractedContent = {
            structuredData: result.extractedJson,
            extractionMethod: result.methodsUsed
        };
        assignment.status = 'ready';
        await assignment.save();

        res.json({
            assignment,
            message: "Extraction complete",
            warnings: result.failedFiles?.map(f => `${f.fileName}: ${f.error}`) || []
        });
    } catch (error) {
        console.error("Extraction error:", error);
        res.status(500).json({ error: error.message });
    }
};
