import { google } from 'googleapis';
import User from '../models/User.js';
import axios from 'axios';
import { PassThrough } from 'stream';

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
    const { userId } = req.query;

    if (!fileId) {
        return res.status(400).json({ error: 'File ID is required' });
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

        // Set response headers for streaming
        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name || 'document')}"`);
        if (size) {
            res.setHeader('Content-Length', size);
        }
        // Allow CORS for streaming
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

        // Stream the file directly without buffering
        const fileStream = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream'
        });

        // Pipe the stream directly to response (no memory buffering!)
        fileStream.data.pipe(res);

        // Handle stream errors
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
    const { userId } = req.query;

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
    const { userId } = req.query;

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
