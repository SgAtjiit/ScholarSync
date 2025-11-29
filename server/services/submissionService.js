import { google } from 'googleapis';
import fs from 'fs';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import { createPDF } from '../utils/pdfGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

export const submitAssignment = async (solutionId, userId, editedContent = null) => {
    console.log(`🚀 Starting submission for Solution ID: ${solutionId}`);

    // 1. Fetch Data
    const user = await User.findById(userId);
    const solution = await Solution.findById(solutionId);
    const assignment = await Assignment.findById(solution.assignmentId);

    if (!user || !solution || !assignment) throw new Error("Data missing");

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
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

    try {
        // 5. Generate PDF
        console.log("📄 Generating PDF...");
        const pdfPath = await createPDF(contentToSubmit, `Solution_${assignment.title}`);

        // 6. Fetch actual course name from Classroom API
        console.log("📚 Fetching course details...");
        let courseName = assignment.courseId; // Fallback to ID
        try {
            const courseDetails = await classroom.courses.get({
                id: assignment.courseId
            });
            courseName = courseDetails.data.name || assignment.courseId;
            console.log(`   ✅ Course name: ${courseName}`);
        } catch (courseError) {
            console.warn(`   ⚠️ Could not fetch course name, using ID: ${courseError.message}`);
        }

        // 7. Ensure organized folder structure exists
        console.log("📁 Setting up Drive folders...");

        // 7a. Find or create main "ScholarSync Solutions" folder
        const mainFolderName = "ScholarSync Solutions";
        let mainFolderId;

        const mainFolderSearch = await drive.files.list({
            q: `name='${mainFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (mainFolderSearch.data.files && mainFolderSearch.data.files.length > 0) {
            mainFolderId = mainFolderSearch.data.files[0].id;
            console.log(`   ✅ Found main folder: ${mainFolderName}`);
        } else {
            const mainFolder = await drive.files.create({
                requestBody: {
                    name: mainFolderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            mainFolderId = mainFolder.data.id;
            console.log(`   ✨ Created main folder: ${mainFolderName}`);
        }

        // 7b. Find or create course-specific subfolder (using actual course name)
        let courseFolderId;

        const courseFolderSearch = await drive.files.list({
            q: `name='${courseName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (courseFolderSearch.data.files && courseFolderSearch.data.files.length > 0) {
            courseFolderId = courseFolderSearch.data.files[0].id;
            console.log(`   ✅ Found course folder: ${courseName}`);
        } else {
            const courseFolder = await drive.files.create({
                requestBody: {
                    name: courseName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [mainFolderId]
                },
                fields: 'id'
            });
            courseFolderId = courseFolder.data.id;
            console.log(`   ✨ Created course folder: ${courseName}`);
        }

        // 8. Upload PDF to organized location
        console.log("☁️ Uploading to Drive...");
        const fileMetadata = {
            name: `Solution - ${assignment.title}.pdf`,
            mimeType: 'application/pdf',
            parents: [courseFolderId] // Upload into course-specific folder
        };
        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(pdfPath),
        };

        const driveFile = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        const driveFileId = driveFile.data.id;
        console.log(`✅ Uploaded to Drive. File ID: ${driveFileId}`);
        console.log(`   📂 Location: ${mainFolderName}/${courseName}/`);

        // 9. Share the file
        console.log("🔗 Sharing Drive file...");
        try {
            await drive.permissions.create({
                fileId: driveFileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
            console.log("✅ File shared successfully");
        } catch (shareError) {
            console.warn("⚠️ Could not share file, but continuing...", shareError.message);
        }

        // 10. Get links
        const driveFileLink = `https://drive.google.com/file/d/${driveFileId}/view`;
        const driveFolderLink = `https://drive.google.com/drive/folders/${courseFolderId}`;
        const classroomLink = assignment.alternateLink ||
            `https://classroom.google.com/c/${assignment.courseId}/a/${assignment.googleClassroomAssignmentId}`;

        // 11. Cleanup and Update DB
        fs.unlinkSync(pdfPath);

        assignment.status = 'submitted';
        assignment.submissionInfo = {
            submittedAt: new Date(),
            driveFileId,
            driveFileLink,
            driveFolderLink
        };
        await assignment.save();

        console.log("✅ PDF ready for manual submission!");
        console.log(`   📄 Drive File: ${driveFileLink}`);
        console.log(`   📁 Course Folder: ${driveFolderLink}`);
        console.log(`   📝 Classroom: ${classroomLink}`);

        return {
            success: true,
            message: "PDF uploaded to organized Drive folder!",
            driveFileId,
            driveFileLink,
            driveFolderLink,
            classroomLink,
            fileName: `Solution - ${assignment.title}.pdf`,
            folderPath: `${mainFolderName}/${courseName}`
        };

    } catch (error) {
        console.error("Upload Failed:", error);
        throw error;
    }
};