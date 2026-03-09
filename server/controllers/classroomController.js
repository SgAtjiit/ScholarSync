import Assignment from '../models/Assignment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Solution from '../models/Solution.js';
import { scanClassroomService } from '../services/classroomService.js';
import { extractTextFromMaterials } from '../utils/extractor.js';
import { createPDF } from '../utils/pdfGenerator.js';
import { google } from 'googleapis';
import { PassThrough } from 'stream';

export const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ userId: req.params.userId });
        res.json(courses);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAssignments = async (req, res) => {
    try {
        const { userId } = req.params;
        const { mode, courseId } = req.query;
        
        // Build query based on filter mode
        let query = { userId };
        
        if (mode === 'all') {
            // Show ALL assignments - no filter
        } else if (mode === 'assigned') {
            // Show assignments that are NOT submitted (pending)
            query.status = { $nin: ['submitted'] };
        } else if (mode === 'submitted') {
            // Show only submitted assignments
            query.status = 'submitted';
        } else if (mode === 'missing') {
            // Show assignments that are past due AND not submitted
            query.$and = [
                { status: { $nin: ['submitted'] } },
                {
                    $or: [
                        { status: 'missing' },
                        { dueDate: { $lt: new Date(), $ne: null } }
                    ]
                }
            ];
        } else if (mode === 'byCourse' && courseId) {
            // Filter by specific course (courseId is the Google Course ID)
            query.courseId = courseId;
        }
        // If no mode specified, return all assignments
        
        const assignments = await Assignment.find(query).sort({ createdAt: -1 });
        res.json(assignments);
    } catch (error) { 
        console.error('Get assignments error:', error);
        res.status(500).json({ error: error.message }); 
    }
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
/**
 * Submit Solution to Google Drive and redirect to Classroom
 * Organizes files in: ScholarSync/CourseName/AssignmentTitle/
 */
export const submitToClassroom = async (req, res) => {
    const { solutionId, assignmentId: directAssignmentId, userId, editedContent, content } = req.body;

    try {
        // 1. Fetch Data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        let assignment;
        let contentToSubmit;
        
        // Support both legacy (solutionId) and new (assignmentId + content) flow
        if (solutionId) {
            // Legacy flow: get content from Solution document
            const solution = await Solution.findById(solutionId);
            
            if (!solution) {
                return res.status(404).json({ error: "Solution not found" });
            }
            
            assignment = await Assignment.findById(solution.assignmentId);
            
            // Validate that only draft mode can be submitted
            const solutionMode = solution.mode || 'draft';
            if (solutionMode !== 'draft') {
                return res.status(400).json({ 
                    error: `Cannot submit ${solutionMode} mode. Only 'draft' mode solutions can be submitted.` 
                });
            }
            
            contentToSubmit = editedContent || solution.editedContent || solution.content;
            
            // Save editedContent to solution if provided
            if (editedContent && editedContent !== solution.content) {
                solution.editedContent = editedContent;
                await solution.save();
            }
        } else if (directAssignmentId) {
            // New flow: direct assignment ID + content (client-side AI)
            assignment = await Assignment.findById(directAssignmentId);
            contentToSubmit = editedContent || content;
        } else {
            return res.status(400).json({ error: "Either solutionId or assignmentId is required" });
        }

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }
        
        if (!contentToSubmit) {
            return res.status(400).json({ error: "No content available to submit" });
        }

        // 4. Setup OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 5. Generate PDF Buffer
        console.log("Generating PDF in memory...");
        const pdfBuffer = await createPDF(contentToSubmit);

        // 6. Convert Buffer to Stream
        const bufferStream = new PassThrough();
        bufferStream.end(pdfBuffer);

        // 7. Get course and assignment names
        const courseName = assignment.courseName || "Unknown Course";
        const assignmentTitle = assignment.title || "Unknown Assignment";
        
        // Sanitize names for folder/file names
        const safeCourseName = courseName.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const safeAssignmentTitle = assignmentTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();

        // 8. Create folder structure: ScholarSync/CourseName/AssignmentTitle

        // 8a. Find or create main "ScholarSync" folder
        const mainFolderName = "ScholarSync";
        let mainFolderId;

        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files?.length > 0) {
            mainFolderId = mainFolderSearch.data.files[0].id;
        } else {
            const mainFolder = await drive.files.create({
                requestBody: {
                    name: mainFolderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            mainFolderId = mainFolder.data.id;
        }

        // 8b. Find or create course subfolder
        let courseFolderId;
        const courseFolderSearch = await drive.files.list({
            q: `name='${safeCourseName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (courseFolderSearch.data.files?.length > 0) {
            courseFolderId = courseFolderSearch.data.files[0].id;
        } else {
            const courseFolder = await drive.files.create({
                requestBody: {
                    name: safeCourseName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [mainFolderId]
                },
                fields: 'id'
            });
            courseFolderId = courseFolder.data.id;
        }

        // 8c. Find or create assignment subfolder
        let assignmentFolderId;
        const assignmentFolderSearch = await drive.files.list({
            q: `name='${safeAssignmentTitle}' and mimeType='application/vnd.google-apps.folder' and '${courseFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (assignmentFolderSearch.data.files?.length > 0) {
            assignmentFolderId = assignmentFolderSearch.data.files[0].id;
        } else {
            const assignmentFolder = await drive.files.create({
                requestBody: {
                    name: safeAssignmentTitle,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [courseFolderId]
                },
                fields: 'id'
            });
            assignmentFolderId = assignmentFolder.data.id;
        }

        // 9. Upload PDF to the assignment folder
        const fileName = `Solution_${new Date().toISOString().split('T')[0]}.pdf`;
        const fileMetadata = {
            name: fileName,
            mimeType: 'application/pdf',
            parents: [assignmentFolderId]
        };

        const media = {
            mimeType: 'application/pdf',
            body: bufferStream
        };

        const driveFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        const driveFileId = driveFile.data.id;
        const driveFileLink = driveFile.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

        // 10. Make the file accessible
        try {
            await drive.permissions.create({
                fileId: driveFileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        } catch (shareError) {
            console.warn("Could not share file globally:", shareError.message);
        }

        // 11. Get the classroom assignment link for manual submission
        let classroomLink = assignment.alternateLink;
        if (!classroomLink && assignment.courseId && assignment.googleClassroomAssignmentId) {
            classroomLink = `https://classroom.google.com/c/${assignment.courseId}/a/${assignment.googleClassroomAssignmentId}/submissions/by-status/and-target/all`;
        }
        if (!classroomLink && assignment.courseId) {
            classroomLink = `https://classroom.google.com/c/${assignment.courseId}`;
        }

        // 12. Update database
        assignment.status = 'submitted';
        assignment.submissionInfo = {
            submittedAt: new Date(),
            driveFileId,
            driveFileLink,
            folderPath: `${mainFolderName}/${safeCourseName}/${safeAssignmentTitle}`
        };
        await assignment.save();

        console.log(`Solution uploaded to Drive: ${mainFolderName}/${safeCourseName}/${safeAssignmentTitle}/${fileName}`);

        res.json({
            success: true,
            message: `Solution saved to Google Drive: ${mainFolderName}/${safeCourseName}/${safeAssignmentTitle}`,
            driveFileId,
            driveFileLink,
            classroomLink,
            folderPath: `${mainFolderName}/${safeCourseName}/${safeAssignmentTitle}`,
            fileName
        });

    } catch (error) {
        console.error("Submit to Classroom error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create a Google Doc from HTML content and open it for editing
 * Uses Drive API to upload HTML and convert to Google Docs format
 */
export const openInGoogleDocs = async (req, res) => {
    const { solutionId, assignmentId: directAssignmentId, userId, content } = req.body;

    try {
        // 1. Fetch User
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Fetch assignment for naming
        let docName = `Solution_${new Date().toISOString().split('T')[0]}`;
        let assignmentTitle = "Assignment";
        
        if (directAssignmentId) {
            // New flow: direct assignment ID
            const assignment = await Assignment.findById(directAssignmentId);
            if (assignment) {
                assignmentTitle = assignment.title || "Assignment";
                docName = `${assignmentTitle.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 50)}_Solution`;
            }
        } else if (solutionId) {
            // Legacy flow: get assignment from solution
            const solution = await Solution.findById(solutionId);
            if (solution) {
                const assignment = await Assignment.findById(solution.assignmentId);
                if (assignment) {
                    assignmentTitle = assignment.title || "Assignment";
                    docName = `${assignmentTitle.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 50)}_Solution`;
                }
            }
        }

        // 3. Setup OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 4. Find or create ScholarSync folder
        const mainFolderName = "ScholarSync";
        let mainFolderId;

        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files?.length > 0) {
            mainFolderId = mainFolderSearch.data.files[0].id;
        } else {
            const mainFolder = await drive.files.create({
                requestBody: {
                    name: mainFolderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            mainFolderId = mainFolder.data.id;
        }

        // 5. Create HTML content with proper styling for Google Docs
        const htmlDocument = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${docName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        code { background: #f4f4f4; padding: 2px 6px; }
    </style>
</head>
<body>
${content || '<p>Empty document</p>'}
</body>
</html>`;

        // 6. Upload HTML and convert to Google Docs using Drive API
        const bufferStream = new PassThrough();
        bufferStream.end(Buffer.from(htmlDocument, 'utf-8'));

        const docFile = await drive.files.create({
            requestBody: {
                name: docName,
                mimeType: 'application/vnd.google-apps.document', // Convert to Google Docs
                parents: [mainFolderId]
            },
            media: {
                mimeType: 'text/html',
                body: bufferStream
            },
            fields: 'id, webViewLink'
        });

        const docId = docFile.data.id;

        // 7. Get the editable link
        const editLink = `https://docs.google.com/document/d/${docId}/edit`;

        console.log(`Created Google Doc: ${docName} in ${mainFolderName}`);

        res.json({
            success: true,
            message: `Document created in ${mainFolderName} folder`,
            docId,
            editLink,
            docName
        });

    } catch (error) {
        console.error("Open in Google Docs error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Sync content FROM a Google Doc back to the app
 * Exports the Google Doc as HTML and returns it
 */
export const syncFromGoogleDocs = async (req, res) => {
    const { docId, userId } = req.body;

    try {
        if (!docId) {
            return res.status(400).json({ error: "No document ID provided" });
        }

        // 1. Fetch User
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Setup OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 3. Export the Google Doc as HTML
        const response = await drive.files.export({
            fileId: docId,
            mimeType: 'text/html'
        });

        let htmlContent = response.data;

        // 4. Extract body content
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            htmlContent = bodyMatch[1];
        }

        // 5. Clean up HTML while PRESERVING images, tables, and important formatting
        // Remove problematic Google-specific classes but keep structure
        htmlContent = htmlContent
            // Remove Google's class attributes (they reference missing stylesheets)
            .replace(/\sclass="[^"]*"/gi, '')
            // Clean up empty paragraphs
            .replace(/<p[^>]*><\/p>/gi, '')
            // Replace non-breaking spaces
            .replace(/&nbsp;/g, ' ')
            // Clean up excessive whitespace
            .replace(/\s+/g, ' ')
            .trim();

        // 6. Fix image sources - Google Docs uses blob URLs that won't work externally
        // Keep images but note they may need special handling
        // Images from Google Docs are typically embedded as base64 or Google URLs
        
        // 7. Preserve table structure - just clean up Google-specific attributes
        htmlContent = htmlContent
            // Remove Google's border attribute but keep table structure
            .replace(/<table[^>]*>/gi, (match) => {
                return '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">';
            })
            // Style table cells
            .replace(/<td([^>]*)>/gi, (match, attrs) => {
                return '<td style="border: 1px solid #ddd; padding: 8px;"' + attrs + '>';
            })
            .replace(/<th([^>]*)>/gi, (match, attrs) => {
                return '<th style="border: 1px solid #ddd; padding: 8px; background: #f4f4f4; font-weight: bold;"' + attrs + '>';
            });

        // 8. Style images for proper display
        htmlContent = htmlContent
            .replace(/<img([^>]*)>/gi, (match, attrs) => {
                // Preserve src but add max-width styling
                if (!attrs.includes('style=')) {
                    return '<img style="max-width: 100%; height: auto; margin: 1em 0;"' + attrs + '>';
                }
                return match;
            });

        console.log(`Synced content from Google Doc: ${docId}`);

        res.json({
            success: true,
            content: htmlContent,
            docId
        });

    } catch (error) {
        console.error("Sync from Google Docs error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create Draft as Google Doc
 * Creates a Google Doc from HTML content in ScholarSync/Drafts folder
 */
export const createDraftDoc = async (req, res) => {
    const { assignmentId, userId, content, title, courseName } = req.body;

    try {
        if (!content) {
            return res.status(400).json({ error: "No content provided" });
        }

        // 1. Fetch User
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Setup OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 3. Find or create ScholarSync/Drafts folder structure
        const mainFolderName = "ScholarSync";
        const draftsFolderName = "Drafts";
        let mainFolderId, draftsFolderId;

        // Find/create main folder
        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files?.length > 0) {
            mainFolderId = mainFolderSearch.data.files[0].id;
        } else {
            const mainFolder = await drive.files.create({
                requestBody: {
                    name: mainFolderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            mainFolderId = mainFolder.data.id;
        }

        // Find/create Drafts subfolder
        const draftsFolderSearch = await drive.files.list({
            q: `name='${draftsFolderName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (draftsFolderSearch.data.files?.length > 0) {
            draftsFolderId = draftsFolderSearch.data.files[0].id;
        } else {
            const draftsFolder = await drive.files.create({
                requestBody: {
                    name: draftsFolderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [mainFolderId]
                },
                fields: 'id'
            });
            draftsFolderId = draftsFolder.data.id;
        }

        // 4. Create HTML document with proper styling
        const safeTitle = (title || 'Draft').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
        const htmlDocument = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #1a1a2e; margin-top: 1.5em; }
        h1 { font-size: 24px; border-bottom: 2px solid #4a4a8a; padding-bottom: 10px; }
        h2 { font-size: 20px; color: #2d2d5a; }
        h3 { font-size: 16px; color: #3d3d7a; }
        p { margin: 1em 0; }
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin: 0.5em 0; }
        code { background: #f4f4f8; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f4f4f8; padding: 15px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #4a4a8a; margin: 1em 0; padding-left: 1em; color: #555; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f4f4f8; font-weight: bold; }
        strong { color: #1a1a2e; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
${content}
</body>
</html>`;

        // 5. Upload HTML and convert to Google Docs
        const bufferStream = new PassThrough();
        bufferStream.end(Buffer.from(htmlDocument, 'utf-8'));

        const docFile = await drive.files.create({
            requestBody: {
                name: safeTitle,
                mimeType: 'application/vnd.google-apps.document',
                parents: [draftsFolderId]
            },
            media: {
                mimeType: 'text/html',
                body: bufferStream
            },
            fields: 'id, webViewLink'
        });

        const docId = docFile.data.id;
        const editLink = `https://docs.google.com/document/d/${docId}/edit`;

        console.log(`Created draft Google Doc: ${safeTitle} in ${mainFolderName}/${draftsFolderName}`);

        res.json({
            success: true,
            docId,
            editLink,
            previewLink: `https://docs.google.com/document/d/${docId}/preview`,
            folderPath: `${mainFolderName}/${draftsFolderName}`
        });

    } catch (error) {
        console.error("Create draft doc error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Submit Doc to Classroom
 * Can submit as Google Doc or convert to PDF
 */
export const submitDoc = async (req, res) => {
    const { docId, assignmentId, userId, format, courseName, assignmentTitle } = req.body;

    try {
        if (!docId) {
            return res.status(400).json({ error: "No document ID provided" });
        }

        // 1. Fetch User and Assignment
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        // 2. Setup OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // 3. Setup folder structure
        const mainFolderName = "ScholarSync";
        const safeCourse = (courseName || assignment.courseName || "Course").replace(/[/\\?%*:|"<>]/g, '-').trim();
        const safeAssignment = (assignmentTitle || assignment.title || "Assignment").replace(/[/\\?%*:|"<>]/g, '-').trim();

        // Find/create main folder
        let mainFolderId;
        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files?.length > 0) {
            mainFolderId = mainFolderSearch.data.files[0].id;
        } else {
            const mainFolder = await drive.files.create({
                requestBody: { name: mainFolderName, mimeType: 'application/vnd.google-apps.folder' },
                fields: 'id'
            });
            mainFolderId = mainFolder.data.id;
        }

        // Find/create course folder
        let courseFolderId;
        const courseFolderSearch = await drive.files.list({
            q: `name='${safeCourse}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`,
            fields: 'files(id)',
            spaces: 'drive'
        });

        if (courseFolderSearch.data.files?.length > 0) {
            courseFolderId = courseFolderSearch.data.files[0].id;
        } else {
            const courseFolder = await drive.files.create({
                requestBody: { name: safeCourse, mimeType: 'application/vnd.google-apps.folder', parents: [mainFolderId] },
                fields: 'id'
            });
            courseFolderId = courseFolder.data.id;
        }

        // Find/create assignment folder
        let assignmentFolderId;
        const assignmentFolderSearch = await drive.files.list({
            q: `name='${safeAssignment}' and mimeType='application/vnd.google-apps.folder' and '${courseFolderId}' in parents and trashed=false`,
            fields: 'files(id)',
            spaces: 'drive'
        });

        if (assignmentFolderSearch.data.files?.length > 0) {
            assignmentFolderId = assignmentFolderSearch.data.files[0].id;
        } else {
            const assignmentFolder = await drive.files.create({
                requestBody: { name: safeAssignment, mimeType: 'application/vnd.google-apps.folder', parents: [courseFolderId] },
                fields: 'id'
            });
            assignmentFolderId = assignmentFolder.data.id;
        }

        let uploadedFileId, uploadedFileName;
        const timestamp = new Date().toISOString().split('T')[0];

        if (format === 'pdf') {
            // 4a. Export as PDF and upload
            const pdfResponse = await drive.files.export({
                fileId: docId,
                mimeType: 'application/pdf'
            }, { responseType: 'arraybuffer' });

            const pdfBuffer = Buffer.from(pdfResponse.data);
            const pdfStream = new PassThrough();
            pdfStream.end(pdfBuffer);

            uploadedFileName = `${safeAssignment}_Solution_${timestamp}.pdf`;

            const pdfFile = await drive.files.create({
                requestBody: {
                    name: uploadedFileName,
                    parents: [assignmentFolderId]
                },
                media: {
                    mimeType: 'application/pdf',
                    body: pdfStream
                },
                fields: 'id, webViewLink'
            });

            uploadedFileId = pdfFile.data.id;

        } else {
            // 4b. Copy the Google Doc to the submission folder
            uploadedFileName = `${safeAssignment}_Solution_${timestamp}`;

            const copiedFile = await drive.files.copy({
                fileId: docId,
                requestBody: {
                    name: uploadedFileName,
                    parents: [assignmentFolderId]
                },
                fields: 'id, webViewLink'
            });

            uploadedFileId = copiedFile.data.id;
        }

        // 5. Update assignment status
        assignment.status = 'submitted';
        assignment.submittedAt = new Date();
        await assignment.save();

        const folderPath = `${mainFolderName}/${safeCourse}/${safeAssignment}`;

        console.log(`Submitted ${format.toUpperCase()}: ${uploadedFileName} to ${folderPath}`);

        // 6. Build Classroom link
        const classroomLink = `https://classroom.google.com/c/${assignment.courseId}/a/${assignment.classroomId}/submissions/by-status/and-target/all`;

        res.json({
            success: true,
            fileId: uploadedFileId,
            fileName: uploadedFileName,
            format,
            folderPath,
            classroomLink
        });

    } catch (error) {
        console.error("Submit doc error:", error);
        res.status(500).json({ error: error.message });
    }
};