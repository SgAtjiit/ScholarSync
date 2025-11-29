import { generateSolution, answerPDFQuestion, answerTextQuestion } from '../services/aiService.js';
import { submitAssignment } from '../services/submissionService.js';
import Solution from '../models/Solution.js';
import User from '../models/User.js';
import axios from 'axios';
import mammoth from 'mammoth';

// Helper to extract key or throw error
const getApiKey = (req) => {
  const apiKey = req.headers['x-gemini-api-key'];
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return apiKey;
};

export const generateAiSolution = async (req, res) => {
  const { assignmentId, userId, mode = 'draft', questionCount = 5 } = req.body;

  try {
    // 1. EXTRACT KEY
    const apiKey = getApiKey(req);

    // 2. PASS KEY TO SERVICE
    const solution = await generateSolution(assignmentId, userId, apiKey, mode, questionCount);

    res.json(solution);
  } catch (error) {
    if (error.message === "MISSING_API_KEY") {
      return res.status(401).json({ error: "Gemini API Key is missing. Please add it in Settings." });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getSolution = async (req, res) => {
  try {
    const { preferredMode } = req.query;
    if (preferredMode) {
      const preferredSolution = await Solution.findOne({
        assignmentId: req.params.assignmentId,
        mode: preferredMode
      }).sort({ createdAt: -1 });
      if (preferredSolution) return res.json(preferredSolution);
    }
    const solution = await Solution.findOne({ assignmentId: req.params.assignmentId })
      .sort({ mode: 1, createdAt: -1 });
    res.json(solution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const submitSolution = async (req, res) => {
  const { solutionId, userId, editedContent } = req.body;
  try {
    const result = await submitAssignment(solutionId, userId, editedContent);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const chatWithPDF = async (req, res) => {
  const { pdfFileId, question, userId } = req.body;

  try {
    // 1. EXTRACT KEY
    const apiKey = getApiKey(req);

    console.log(`📄 Chat with Document request: ${pdfFileId}`);

    // Get user's access token for Drive
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: user.refreshToken });
    const { token: accessToken } = await oauth2Client.getAccessToken();

    // 1. Get File Metadata to check MIME type
    console.log(`🔍 Checking file metadata...`);
    const metadataRes = await axios({
      method: 'GET',
      url: `https://www.googleapis.com/drive/v3/files/${pdfFileId}?fields=mimeType,name`,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const { mimeType, name } = metadataRes.data;
    console.log(`📄 File: ${name}, Type: ${mimeType}`);

    let answer;

    // --- CASE 1: Google Docs / Sheets / Slides (Export as PDF) ---
    if (mimeType.startsWith('application/vnd.google-apps')) {
      console.log('🔄 Converting Google Doc to PDF...');
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${pdfFileId}/export?mimeType=application/pdf`;

      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer'
      });
      const pdfBuffer = Buffer.from(response.data);

      if (pdfBuffer.length < 100) throw new Error("Exported PDF is too small.");

      answer = await answerPDFQuestion(pdfBuffer, question, apiKey);
    }

    // --- CASE 2: PDF Files (Native) ---
    else if (mimeType === 'application/pdf') {
      console.log('⬇️ Downloading PDF binary...');
      const response = await axios({
        method: 'GET',
        url: `https://www.googleapis.com/drive/v3/files/${pdfFileId}?alt=media`,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer'
      });
      const pdfBuffer = Buffer.from(response.data);

      if (pdfBuffer.length < 100) throw new Error("Downloaded PDF is too small.");

      answer = await answerPDFQuestion(pdfBuffer, question, apiKey);
    }

    // --- CASE 3: Word Documents (DOCX) ---
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('⬇️ Downloading DOCX binary...');
      const response = await axios({
        method: 'GET',
        url: `https://www.googleapis.com/drive/v3/files/${pdfFileId}?alt=media`,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer'
      });

      console.log('📝 Extracting text from DOCX...');
      const result = await mammoth.extractRawText({ buffer: Buffer.from(response.data) });
      const text = result.value;

      if (!text || text.length < 10) throw new Error("Could not extract text from DOCX.");

      answer = await answerTextQuestion(text, question, apiKey);
    }

    // --- CASE 4: Plain Text Files ---
    else if (mimeType === 'text/plain') {
      console.log('⬇️ Downloading Text file...');
      const response = await axios({
        method: 'GET',
        url: `https://www.googleapis.com/drive/v3/files/${pdfFileId}?alt=media`,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'text' // Get as text directly
      });

      const text = response.data;
      if (!text || text.length < 10) throw new Error("Text file is empty.");

      answer = await answerTextQuestion(text, question, apiKey);
    }

    // --- UNSUPPORTED ---
    else {
      throw new Error(`Unsupported file type for chat: ${mimeType}. Only PDF, Google Docs, DOCX, and Text files are supported.`);
    }

    res.json({ answer });

  } catch (error) {
    if (error.message === "MISSING_API_KEY") {
      return res.status(401).json({ error: "Gemini API Key is missing. Please add it in Settings." });
    }
    console.error('Chat Document Error:', error);
    res.status(500).json({ error: error.message });
  }
};