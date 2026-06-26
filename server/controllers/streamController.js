import { google } from 'googleapis';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import axios from 'axios';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { supabase, getBucketName } from '../config/supabaseClient.js';

const require = createRequire(import.meta.url);
const { convert } = require('docx2pdf-converter');
const PDFDocument = require('pdfkit');
const mammoth = require('mammoth');

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const isDocxFile = (name = '', mimeType = '') => {
    return mimeType === DOCX_MIME_TYPE || name.toLowerCase().endsWith('.docx');
};

const toPdfFileName = (name = 'document.docx') => {
    const parsed = path.parse(name);
    return `${parsed.name || 'document'}.pdf`;
};

const createPdfFromText = (text = '', title = 'Document') => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const pdf = new PDFDocument({ margin: 50 });

        pdf.on('data', (chunk) => chunks.push(chunk));
        pdf.on('end', () => resolve(Buffer.concat(chunks)));
        pdf.on('error', reject);

        pdf.fontSize(16).text(title || 'Document', { underline: true });
        pdf.moveDown();
        pdf.fontSize(11);

        const normalizedText = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        const printableText = normalizedText.length > 0 ? normalizedText : 'No extractable text found in this DOCX file.';

        pdf.text(printableText, {
            align: 'left',
            lineGap: 2,
        });

        pdf.end();
    });
};

const convertDocxBufferToPdf = async (docxBuffer, originalName) => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scholarsync-docx-'));
    const inputName = originalName?.toLowerCase().endsWith('.docx') ? originalName : `${originalName || 'document'}.docx`;
    const inputPath = path.join(tempDir, inputName);
    const outputPath = path.join(tempDir, toPdfFileName(inputName));

    try {
        await fs.writeFile(inputPath, docxBuffer);
        try {
            convert(inputPath, outputPath);
            return await fs.readFile(outputPath);
        } catch (error) {
            const fallback = await mammoth.extractRawText({ buffer: docxBuffer });
            const fallbackPdf = await createPdfFromText(fallback.value, originalName || 'document.docx');
            console.warn(
                `DOCX conversion dependency unavailable for ${originalName || 'document.docx'}. Using text-only fallback PDF. Original error: ${error.message}`
            );
            return fallbackPdf;
        }
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
};

/**
 * Streaming Proxy Controller
 * Streams files from Google Drive directly to the client without buffering in memory.
 * This solves OOM crashes on Render by never loading the entire file into memory.
 */

/**
 * Stream a file from Google Drive to the client
 * @route GET /api/stream/download/:fileId
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID for authentication (from query)
 */
export const streamFileFromDrive = async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!fileId) {
        return res.status(400).json({ error: 'File ID is required' });
    }

    // Handle manual upload streaming
    if (fileId.startsWith('manual_file_') || req.query.isManual === 'true') {
        try {
            const assignment = await Assignment.findOne({ "materials.driveFile.id": fileId });
            if (!assignment) {
                return res.status(404).json({ error: 'Manual assignment not found for this file' });
            }

            const material = assignment.materials.find(m => m.driveFile?.id === fileId);
            if (!material) {
                return res.status(404).json({ error: 'File material not found in assignment' });
            }

            const driveFile = material.driveFile;
            const name = driveFile.title || 'document.pdf';
            const mimeType = driveFile.mimeType || 'application/pdf';
            const storedFileName = driveFile.storedFileName || `${fileId}.pdf`;

            // Download from Supabase Storage
            const bucketName = getBucketName();
            const { data: fileBlob, error: downloadError } = await supabase.storage
                .from(bucketName)
                .download(storedFileName);

            if (downloadError) {
                console.error("Supabase download error:", downloadError);
                return res.status(404).json({ error: `File not found in Supabase storage: ${downloadError.message}` });
            }

            const buffer = Buffer.from(await fileBlob.arrayBuffer());

            res.setHeader('Content-Type', mimeType);
            const disposition = mimeType === 'application/pdf' ? 'inline' : 'attachment';
            res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(name)}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

            return res.end(buffer);
        } catch (error) {
            console.error('Manual file streaming error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Get user's OAuth credentials
        const user = await User.findById(userId);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ error: 'User not authenticated or token expired' });
        }

        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        // Get fresh access token
        const { token } = await oauth2Client.getAccessToken();

        // First, get file metadata to set proper headers
        const metadataResponse = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}`,
            headers: { Authorization: `Bearer ${token}` },
            params: { fields: 'name,mimeType,size' }
        });

        const { name, mimeType, size } = metadataResponse.data;

        // For DOCX files, convert to PDF before returning so client PDF tools can process it.
        if (isDocxFile(name, mimeType)) {
            const docxResponse = await axios({
                method: 'GET',
                url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'arraybuffer'
            });

            const pdfBuffer = await convertDocxBufferToPdf(Buffer.from(docxResponse.data), name || 'document.docx');
            const pdfName = toPdfFileName(name || 'document.docx');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfName)}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

            return res.end(pdfBuffer);
        }

        // Set response headers for direct streaming
        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name || 'document')}"`);
        if (size) {
            res.setHeader('Content-Length', size);
        }
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

        const fileStream = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream'
        });

        fileStream.data.pipe(res);

        fileStream.data.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream file' });
            }
        });

    } catch (error) {
        console.error('Stream download error:', error);

        const statusCode = error.response?.status;
        let errorMessage = error.message;

        if (statusCode === 403) {
            errorMessage = 'Access denied - file may be from an external organization';
            return res.status(403).json({ error: errorMessage });
        } else if (statusCode === 404) {
            errorMessage = 'File not found';
            return res.status(404).json({ error: errorMessage });
        } else if (statusCode === 401) {
            errorMessage = 'Authentication expired - please log in again';
            return res.status(401).json({ error: errorMessage });
        }

        if (!res.headersSent) {
            res.status(500).json({ error: errorMessage });
        }
    }
};

/**
 * Get file metadata without downloading
 * @route GET /api/stream/metadata/:fileId
 */
export const getFileMetadata = async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!fileId || !userId) {
        return res.status(400).json({ error: 'File ID and User ID are required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || !user.refreshToken) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const { token } = await oauth2Client.getAccessToken();

        const response = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}`,
            headers: { Authorization: `Bearer ${token}` },
            params: { fields: 'id,name,mimeType,size,thumbnailLink,webContentLink' }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Metadata fetch error:', error);
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error?.message || error.message 
        });
    }
};

/**
 * Check if user can access a file (for pre-flight checks)
 * @route GET /api/stream/check/:fileId
 */
export const checkFileAccess = async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!fileId || !userId) {
        return res.status(400).json({ error: 'File ID and User ID are required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || !user.refreshToken) {
            return res.json({ accessible: false, reason: 'User not authenticated' });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });

        const { token } = await oauth2Client.getAccessToken();

        // Try to get file metadata to check access
        await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}`,
            headers: { Authorization: `Bearer ${token}` },
            params: { fields: 'id,name' }
        });

        res.json({ accessible: true });
    } catch (error) {
        const statusCode = error.response?.status;
        let reason = 'Unknown error';

        if (statusCode === 403) {
            reason = 'Access denied - external organization or no permission';
        } else if (statusCode === 404) {
            reason = 'File not found or deleted';
        } else if (statusCode === 401) {
            reason = 'Authentication expired';
        }

        res.json({ accessible: false, reason, statusCode });
    }
};
