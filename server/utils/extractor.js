import mammoth from 'mammoth';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Helper to download file
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
    console.warn(`Download warning for ${fileId}: ${error.message}`);
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
        const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
        if(source.trim()) text += `\n${source}\n`;
      });
    }
    return text;
  } catch (e) {
    return "";
  }
};

/**
 * Main Extraction Function
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
    
    // Safety check for binaries
    if (title.match(/\.(zip|exe|dll|png|jpg|jpeg)$/i)) continue;

    const fileBuffer = await downloadFile(file.id, accessToken);
    if (!fileBuffer) continue;

    try {
      let extracted = "";

      // ---------------------------------------------------------
      // PDF EXTRACTION (GEMINI VISION)
      // ---------------------------------------------------------
      if (mimeType.includes('pdf') || title.toLowerCase().endsWith('.pdf')) {
        if (!apiKey) {
            combinedText += `\n[PDF Skipped: API Key missing]\n`;
        } else {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Use env var or fallback, don't hardcode if possible
            const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"; 
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: fileBuffer.toString('base64')
                    }
                },
                {
                    text: `Extract all legible text from this document. 
                    - If it contains diagrams, describe them in text (e.g., "[Diagram: Logic Gate showing AND operation]").
                    - If it is blank, blurry, or just noise, return exactly 'NO_TEXT_FOUND'.
                    - Do NOT return markdown formatting.`
                }
            ]);
            
            const rawText = result.response.text();
            
            // Check for the specific failure flag or empty response
            if (rawText && !rawText.includes("NO_TEXT_FOUND") && rawText.trim().length > 20) {
                extracted = rawText;
                methodsUsed.push('gemini-vision');
            } else {
                console.warn(`⚠️ Gemini found no usable text in PDF: ${title}`);
            }
        }
      }
      
      // ---------------------------------------------------------
      // DOCX EXTRACTION (Mammoth)
      // ---------------------------------------------------------
      else if (mimeType.includes('document') || title.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        if (result.value) {
            extracted = result.value;
            methodsUsed.push('mammoth');
        }
      }
      
      // ---------------------------------------------------------
      // NOTEBOOK (IPYNB)
      // ---------------------------------------------------------
      else if (title.toLowerCase().endsWith('.ipynb')) {
        extracted = extractIpynb(fileBuffer);
        if (extracted) methodsUsed.push('ipynb');
      }
      
      // ---------------------------------------------------------
      // PLAIN TXT
      // ---------------------------------------------------------
      else if (mimeType.includes('text/plain') || title.toLowerCase().endsWith('.txt')) {
        extracted = fileBuffer.toString('utf-8');
        methodsUsed.push('text');
      }

      // Final Append
      if (extracted && extracted.trim().length > 20) {
          combinedText += `\n\n--- FILE: ${title} ---\n${extracted}\n`;
      }

    } catch (err) {
      console.error(`Extraction failed for ${title}:`, err.message);
    }
  }

  return { combinedText, methodsUsed };
};