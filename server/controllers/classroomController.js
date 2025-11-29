import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import { scanClassroomService } from '../services/classroomService.js';
import { extractTextFromMaterials } from '../utils/extractor.js';
import { google } from 'googleapis';

// --- 1. Get All Courses (Req: Clear route for courses) ---
export const getAllCourses = async (req, res) => {
    try {
        const { userId } = req.params;
        const courses = await Course.find({ userId }).sort({ updateTime: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 2. Trigger Scan (Metadata Only) ---
export const triggerScan = async (req, res) => {
    const { userId } = req.body;
    try {
        // Service now only fetches metadata, doesn't extract files
        const result = await scanClassroomService(userId);
        res.json(result);
    } catch (error) {
        console.error("Scan failed:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 3. Get Assignments (List View) ---
export const getAssignments = async (req, res) => {
    const { userId } = req.params;
    const { mode = 'assigned', courseId } = req.query;

    try {
        let query = { userId };
        let assignments;

        // Filtering logic
        if (mode === 'byCourse' && courseId) {
            // Show ALL assignments for this course, including submitted ones
            query.courseId = courseId;
            assignments = await Assignment.find(query).sort({ createdAt: -1 });
        } else if (mode === 'missing') {
            const now = new Date();
            assignments = await Assignment.find({
                ...query,
                dueDate: { $lt: now },
                status: { $ne: 'submitted' }
            }).limit(10);
        } else {
            // Default: Assigned (not submitted yet, with due date)
            assignments = await Assignment.find({
                ...query,
                dueDate: { $exists: true },
                status: { $ne: 'submitted' }
            }).sort({ dueDate: 1 }).limit(10);
        }
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 4. Get Single Assignment & Extract Content (Lazy Load) ---
export const getAssignmentDetailsAndExtract = async (req, res) => {
    const { assignmentId } = req.params;
    const { userId } = req.body;

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: "Assignment not found" });

        // Optimization: If we already extracted text, don't do it again
        if (assignment.extractedContent?.fullText && assignment.extractedContent.fullText.length > 50) {
            return res.json({
                message: "Content already extracted",
                assignment
            });
        }

        console.log(`📥 Lazy Loading: Extracting content for "${assignment.title}"...`);

        // Get API Key from Header (BYOK)
        const apiKey = req.headers['x-gemini-api-key'];

        // Note: We do NOT throw an error here if apiKey is missing, 
        // because we can still extract DOCX/TXT files without it. 
        // The extractor will just skip PDFs if the key is missing.

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // 1. Get Access Token for Drive Downloads
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });
        const { token: accessToken } = await oauth2Client.getAccessToken();

        // 2. Extract Text from Files (PDFs/DOCX/etc)
        // UPDATED: Passing apiKey as the 3rd argument
        const extractionResult = await extractTextFromMaterials(assignment.materials, accessToken, apiKey);

        // 3. Combine Title + Description + File Content
        let combinedText = "";

        // Add title first (always present)
        combinedText += `--- ASSIGNMENT TITLE ---\n${assignment.title}\n\n`;
        if (combinedText == '' && assignment.description.trim() == 0) {
            return res.status(500).json({ error: "Not able to extract content due to type of assignment(not pdf,docx): " + error.message });
        }
        // Add description (if exists)
        if (assignment.description && assignment.description.trim().length > 0) {
            combinedText += `--- ASSIGNMENT DESCRIPTION ---\n${assignment.description}\n\n`;
        }


        // Add extracted file content
        if (extractionResult.combinedText && extractionResult.combinedText.length > 0) {
            combinedText += extractionResult.combinedText;
        }

        console.log(`📊 Total combined text: ${combinedText.length} chars`);

        // 4. Update Database
        const methods = ['title'];
        if (assignment.description && assignment.description.trim().length > 0) {
            methods.push('description');
        }
        if (extractionResult.methodsUsed.length > 0) {
            methods.push(...extractionResult.methodsUsed);
        }

        assignment.extractedContent = {
            fullText: combinedText,
            extractionMethod: methods
        };
        assignment.status = 'processing'; // Ready for AI
        await assignment.save();

        res.json({
            message: "Extraction complete",
            assignment
        });

    } catch (error) {
        console.error("Extraction error:", error);
        res.status(500).json({ error: "Failed to extract content: " + error.message });
    }
};