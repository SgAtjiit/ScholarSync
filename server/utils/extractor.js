import mammoth from 'mammoth';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to download file from Google Drive
const downloadFile = async (fileId, accessToken) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer'
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(`⚠️ File not found (404): ${fileId}. It might be a restricted file.`);
    } else {
      console.error(`❌ Download failed for ${fileId}: ${error.message}`);
    }
    return null;
  }
};

// Helper for notebooks
const extractIpynb = (buffer) => {
  try {
    const jsonStr = buffer.toString('utf-8');
    const notebook = JSON.parse(jsonStr);
    let text = "";
    if (notebook.cells && Array.isArray(notebook.cells)) {
      notebook.cells.forEach(cell => {
        const cellType = cell.cell_type?.toUpperCase() || 'UNKNOWN';
        const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
        text += `\n[${cellType} CELL]:\n${source}\n`;
      });
    }
    return text;
  } catch (e) {
    console.error("Error extracting IPYNB:", e);
    return "Error parsing notebook content.";
  }
};

/**
 * Main Extraction Function
 * UPDATED: Now accepts apiKey to use User's Personal Key for PDF processing
 */
export const extractTextFromMaterials = async (materials, accessToken, apiKey) => {

  if (!materials || materials.length === 0) {
    return { combinedText: "", methodsUsed: [] };
  }

  let combinedText = "";
  const methodsUsed = [];

  for (const mat of materials) {
    const file = mat.driveFile?.driveFile || mat.driveFile;

    if (!file || !file.id) continue;

    const title = file.title || 'Unknown File';
    const mimeType = file.mimeType || '';

    // Skip unsupported binaries
    if (title.endsWith('.zip') || title.endsWith('.exe') || title.endsWith('.png') || title.endsWith('.jpg')) {
      continue;
    }

    const fileBuffer = await downloadFile(file.id, accessToken);
    if (!fileBuffer) continue;

    try {
      // ---------------------------------------------------------
      // PDF EXTRACTION (GEMINI ONLY APPROACH)
      // ---------------------------------------------------------
      if (mimeType.includes('pdf') || title.toLowerCase().endsWith('.pdf')) {

        if (!apiKey) {
          console.warn(`⚠️ Skipping PDF ${title}: No Gemini API Key provided for analysis.`);
          combinedText += `\n\n[ERROR: Could not extract PDF. API Key missing.]\n`;
          continue;
        }

        // Initialize Gemini with User's Key
        const genAI = new GoogleGenerativeAI(apiKey);
        const gemini_model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        const model = genAI.getGenerativeModel({ model: gemini_model });

        const base64Pdf = fileBuffer.toString('base64');

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf
            }
          },
          {
            text: `You are a data extraction engine. Your job is to convert this PDF entirely into text.
            
            INSTRUCTIONS:
            1. Extract ALL text content exactly as written.
            2. For every DIAGRAM, IMAGE, CHART, or TABLE:
               - Do NOT skip it.
               - Analyze it visually.
               - Convert it into a detailed text description or text-based table representation.
               - Label it clearly (e.g., "[Visual Analysis of Chart: Growth Trends]").
            
            OUTPUT FORMAT:
            Return ONLY the extracted text content. Do not include markdown formatting like \`\`\`json or \`\`\`html. Just raw, readable text that represents the entire document content.`
          }
        ]);

        const geminiContent = await result.response.text();

        if (geminiContent && geminiContent.length > 0) {
          combinedText += `\n\n--- SOURCE: ${title} (PDF - AI EXTRACTED) ---\n${geminiContent}`;
          methodsUsed.push('gemini-vision-only');
        } else {
          console.warn(`⚠️ Gemini returned empty response for PDF: ${title}`);
        }
      }

      // ---------------------------------------------------------
      // DOCX EXTRACTION (Mammoth)
      // ---------------------------------------------------------
      else if (mimeType.includes('document') || title.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const cleanText = result.value ? result.value.trim() : "";

        if (cleanText.length > 0) {
          combinedText += `\n\n--- SOURCE: ${title} (DOCX) ---\n${cleanText}`;
          methodsUsed.push('mammoth');
        }
      }

      // ---------------------------------------------------------
      // NOTEBOOK EXTRACTION
      // ---------------------------------------------------------
      else if (title.toLowerCase().endsWith('.ipynb')) {
        const ipynbText = extractIpynb(fileBuffer);
        if (ipynbText.length > 0) {
          combinedText += `\n\n--- SOURCE: ${title} (NOTEBOOK) ---\n${ipynbText}`;
          methodsUsed.push('ipynb-parser');
        }
      }

      // ---------------------------------------------------------
      // PLAIN TEXT
      // ---------------------------------------------------------
      else if (mimeType.includes('text/plain') || title.toLowerCase().endsWith('.txt')) {
        const textData = fileBuffer.toString('utf-8');
        combinedText += `\n\n--- SOURCE: ${title} (TXT) ---\n${textData}`;
        methodsUsed.push('text');
      }

      else {
        // File type not supported
      }

    } catch (err) {
      console.error(`❌ Failed to extract content from ${title}:`, err.message);
    }
  }

  return { combinedText, methodsUsed };
};