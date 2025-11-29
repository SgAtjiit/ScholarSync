import { google } from 'googleapis';
import { PassThrough } from 'stream'; // Native Node module for streams
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import { createPDF } from '../utils/pdfGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

export const submitAssignment = async (solutionId, userId, editedContent = null) => {

    // 1. Fetch Data
    const user = await User.findById(userId);
    const solution = await Solution.findById(solutionId);
    
    if (!solution) throw new Error("Solution not found");
    
    const assignment = await Assignment.findById(solution.assignmentId);

    if (!user || !assignment) throw new Error("User or Assignment missing");

    // 2. Validate that only draft mode can be submitted
    const solutionMode = solution.mode || 'draft';
    if (solutionMode !== 'draft') {
        throw new Error(`Cannot submit ${solutionMode} mode. Only 'draft' mode solutions can be submitted to Classroom.`);
    }

    // 3. Determine content to use
    const contentToSubmit = editedContent || solution.editedContent || solution.content;
    if (!contentToSubmit) {
        throw new Error("No content available to submit");
    }

    // Save editedContent to solution if provided
    if (editedContent && editedContent !== solution.content) {
        solution.editedContent = editedContent;
        await solution.save();
    }

    // 4. Setup Auth
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: user.refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    // Note: Classroom API strictly needs courseId for certain operations
    
    try {
        // 5. Generate PDF Buffer (In-Memory, No File System)
        console.log("Generating PDF in memory...");
        const pdfBuffer = await createPDF(contentToSubmit);

        // 6. Convert Buffer to Stream for Google Drive Upload
        const bufferStream = new PassThrough();
        bufferStream.end(pdfBuffer);

        // 7. Fetch actual course name
        let courseName = "Unknown Course";
        // Only fetch if we have a valid courseId format (not purely local)
        if (assignment.courseId) {
             // Sometimes assignment.courseId is stored, strictly checking ensures we don't break
             courseName = assignment.courseName || assignment.courseId; 
        }

        // 8. Ensure organized folder structure exists
        
        // 8a. Find or create main "ScholarSync Solutions" folder
        const mainFolderName = "ScholarSync Solutions";
        let mainFolderId;

        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files && mainFolderSearch.data.files.length > 0) {
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

        // 8b. Find or create course-specific subfolder
        // Sanitize course name to avoid invalid characters in folder name if necessary
        const safeCourseName = courseName.replace(/[/\\?%*:|"<>]/g, '-'); 
        let courseFolderId;

        const courseFolderSearch = await drive.files.list({
            q: `name='${safeCourseName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (courseFolderSearch.data.files && courseFolderSearch.data.files.length > 0) {
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

        // 9. Upload PDF using the Stream
        const fileMetadata = {
            name: `Solution - ${assignment.title}.pdf`,
            mimeType: 'application/pdf',
            parents: [courseFolderId]
        };

        const media = {
            mimeType: 'application/pdf',
            body: bufferStream, // Stream directly from memory
        };

        const driveFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        const driveFileId = driveFile.data.id;

        // 10. Share the file (Permissions)
        try {
            await drive.permissions.create({
                fileId: driveFileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        } catch (shareError) {
            console.warn("⚠️ Could not share file globally, but continuing...", shareError.message);
        }

        // 11. Links
        const driveFileLink = `https://drive.google.com/file/d/${driveFileId}/view`;
        const driveFolderLink = `https://drive.google.com/drive/folders/${courseFolderId}`;
        
        // Construct valid classroom link if possible
        let classroomLink = assignment.alternateLink;
        if (!classroomLink && assignment.courseId && assignment.googleClassroomAssignmentId) {
             classroomLink = `https://classroom.google.com/c/${assignment.courseId}/a/${assignment.googleClassroomAssignmentId}`;
        }

        // 12. Update Database (No file cleanup needed!)
        assignment.status = 'submitted';
        assignment.submissionInfo = {
            submittedAt: new Date(),
            driveFileId,
            driveFileLink,
            driveFolderLink
        };
        await assignment.save();

        return {
            success: true,
            message: "PDF uploaded successfully!",
            driveFileId,
            driveFileLink,
            driveFolderLink,
            classroomLink,
            fileName: `Solution - ${assignment.title}.pdf`,
            folderPath: `${mainFolderName}/${safeCourseName}`
        };

    } catch (error) {
        console.error("Upload Failed:", error);
        throw error;
    }
};