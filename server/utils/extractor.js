import mammoth from 'mammoth';
import axios from 'axios';
import Groq from 'groq-sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import dotenv from 'dotenv';

dotenv.config();

/**
 * Clean text from encoding artifacts
 */
const cleanText = (text) => {
    if (!text) return '';
    return text
        // Remove control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove common OCR artifacts
        .replace(/;Ç[0-9A-Za-z]+/g, '')
        .replace(/[†‡•·]/g, ' ')
        // Clean up multiple spaces and newlines
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};

/**
 * Downloads file from Google Drive as a buffer.
 */
const downloadFile = async (fileId, accessToken, fileName = 'Unknown') => {
    try {
        const response = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer'
        });
        return { success: true, data: response.data, fileName };
    } catch (error) {
        const statusCode = error.response?.status;
        let errorMessage = error.message;

        if (statusCode === 403) {
            errorMessage = `Access denied - file may be from an external organization or you don't have permission`;
        } else if (statusCode === 404) {
            errorMessage = `File not found - it may have been deleted or moved`;
        } else if (statusCode === 401) {
            errorMessage = `Authentication expired - please try logging in again`;
        }

        console.warn(`Download failed for file ${fileName} (${fileId}): [${statusCode}] ${errorMessage}`);
        return { success: false, data: null, error: errorMessage, errorCode: statusCode, fileName };
    }
};

/**
 * Convert PDF pages to images
 */
const getPdfPageImages = async (fileBuffer, title) => {
    try {
        const pdfParser = new PDFParse({ data: fileBuffer });
        const screenshots = await pdfParser.getScreenshot({
            scale: 1.2,  // Reduced scale to keep images under 4MB limit
            imageDataUrl: true,
            imageBuffer: false
        });
        
        // Filter images and ensure they're under 4MB (base64 limit for Groq)
        const MAX_BASE64_SIZE = 3.5 * 1024 * 1024; // 3.5MB to be safe
        const images = screenshots.pages
            .map(page => ({
                pageNumber: page.pageNumber,
                dataUrl: page.dataUrl
            }))
            .filter(img => img.dataUrl && img.dataUrl.length < MAX_BASE64_SIZE);
        
        console.log(`Converted ${images.length} pages to images from: ${title}`);
        return images;
    } catch (err) {
        const errorMessage = err.message || '';
        const lowerError = errorMessage.toLowerCase();
        
        // Check for specific PDF issues
        if (lowerError.includes('encrypt') || lowerError.includes('password')) {
            console.error(`PDF is encrypted/password-protected: ${title}`);
            throw new Error(`PDF is encrypted or password-protected. Cannot extract content.`);
        } else if (lowerError.includes('invalid pdf') || lowerError.includes('bad pdf')) {
            console.error(`Invalid/corrupted PDF: ${title}`);
            throw new Error(`PDF appears to be corrupted or invalid.`);
        }
        
        console.error(`Failed to convert PDF pages to images for ${title}:`, err.message);
        return [];
    }
};

/**
 * Extract complete content from a single page image using vision model
 * This includes ALL text + detailed descriptions of ALL images/diagrams
 */
const extractPageContent = async (groq, visionModel, pageImage, fileName, pageNum) => {
    const prompt = `Extract ALL content from page ${pageNum} of "${fileName}".

INSTRUCTIONS:
1. Extract ALL text EXACTLY as written - questions, instructions, paragraphs
2. Preserve numbering format: "1.", "Q1", "(a)", "(i)" etc.
3. For mathematical expressions, write them clearly: 
   - Subscripts: use _ (e.g., R_1, V_out)
   - Superscripts: use ^ (e.g., x^2, 10^3)
   - Fractions: use / (e.g., 1/2, V/R)
4. For EVERY diagram, figure, circuit, graph or image write:
   [FIGURE: <detailed description including all labels, values, connections>]
5. For tables, recreate the structure clearly

OUTPUT FORMAT - be structured:

Question 1: <exact question text>
[FIGURE: <description if any>]
(a) <sub-question text>
(b) <sub-question text>

Question 2: <exact question text>
...

DO NOT add any commentary. Just extract the content as it appears.`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: pageImage.dataUrl } }
                ]
            }],
            model: visionModel,
            temperature: 0.1,
            max_tokens: 4000
        });

        let content = response.choices[0]?.message?.content || '';
        // Clean the content
        content = cleanText(content);
        console.log(`Extracted content from ${fileName} page ${pageNum}: ${content.length} chars`);
        return content;
    } catch (err) {
        console.error(`Vision extraction failed for ${fileName} page ${pageNum}:`, err.message);
        return `[Page ${pageNum} extraction failed: ${err.message}]`;
    }
};

/**
 * Main Extraction Function
 */
export const extractTextFromMaterials = async (materials, accessToken, apiKey) => {
    console.log("Starting extraction...");
    console.log("Materials count:", materials?.length);

    if (!materials || materials.length === 0) {
        return { extractedJson: { error: "No materials provided" }, methodsUsed: [] };
    }

    if (!apiKey) {
        return { extractedJson: { error: "No API key provided" }, methodsUsed: [] };
    }

    const groq = new Groq({ apiKey });
    const textModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const visionModel = process.env.GROQ_VISION_MODEL || 'llama-3.2-90b-vision-preview';
    console.log("Using text model:", textModel);
    console.log("Using vision model:", visionModel);

    let fullExtractedContent = '';
    const methodsUsed = [];
    const failedFiles = [];

    // --- Process each material ---
    for (const mat of materials) {
        const file = mat.driveFile?.driveFile || mat.driveFile;
        if (!file || !file.id) continue;

        const title = file.title || 'Untitled';
        const mimeType = file.mimeType || '';
        const downloadResult = await downloadFile(file.id, accessToken, title);

        if (!downloadResult.success) {
            failedFiles.push({ fileName: title, error: downloadResult.error });
            continue;
        }

        const fileBuffer = downloadResult.data;

        try {
            if (mimeType.includes('pdf') || title.toLowerCase().endsWith('.pdf')) {
                // Convert PDF to images and extract content from each page
                let pageImages = [];
                let pdfError = null;
                
                try {
                    pageImages = await getPdfPageImages(fileBuffer, title);
                } catch (pdfErr) {
                    pdfError = pdfErr.message;
                    console.error(`PDF processing error for ${title}:`, pdfErr.message);
                }
                
                // If we got an explicit error (like encryption), add to failed files
                if (pdfError) {
                    failedFiles.push({ fileName: title, error: pdfError });
                    continue;
                }
                
                if (pageImages.length === 0) {
                    // Fallback to text extraction if image conversion fails
                    try {
                        const pdfParser = new PDFParse({ data: fileBuffer });
                        const pdfData = await pdfParser.getText();
                        const textContent = pdfData.text || '';
                        
                        if (textContent.trim().length < 50) {
                            failedFiles.push({ fileName: title, error: 'PDF appears to be image-only or has no extractable text' });
                            continue;
                        }
                        
                        fullExtractedContent += `\n\n========== ${title} ==========\n${textContent}`;
                        methodsUsed.push(`pdf-text-fallback:${title}`);
                    } catch (textErr) {
                        const errMsg = textErr.message?.toLowerCase() || '';
                        if (errMsg.includes('encrypt') || errMsg.includes('password')) {
                            failedFiles.push({ fileName: title, error: 'PDF is encrypted or password-protected' });
                        } else {
                            failedFiles.push({ fileName: title, error: `PDF extraction failed: ${textErr.message}` });
                        }
                        continue;
                    }
                } else {
                    fullExtractedContent += `\n\n========== ${title} ==========\n`;
                    
                    // Process each page with vision model
                    for (const pageImg of pageImages) {
                        const pageContent = await extractPageContent(groq, visionModel, pageImg, title, pageImg.pageNumber);
                        fullExtractedContent += `\n--- Page ${pageImg.pageNumber} ---\n${pageContent}\n`;
                    }
                    methodsUsed.push(`pdf-vision:${title} (${pageImages.length} pages)`);
                }
                
            } else if (mimeType.includes('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(title)) {
                // Direct image file
                const base64 = Buffer.from(fileBuffer).toString('base64');
                const imgMime = mimeType || 'image/png';
                const dataUrl = `data:${imgMime};base64,${base64}`;
                
                const imageContent = await extractPageContent(groq, visionModel, { dataUrl }, title, 1);
                fullExtractedContent += `\n\n========== ${title} ==========\n${imageContent}`;
                methodsUsed.push(`image-vision:${title}`);
                
            } else if (mimeType.includes('document') || title.toLowerCase().endsWith('.docx')) {
                const result = await mammoth.extractRawText({ buffer: fileBuffer });
                fullExtractedContent += `\n\n========== ${title} ==========\n${result.value}`;
                methodsUsed.push(`docx:${title}`);
                
            } else if (mimeType.includes('text') || title.toLowerCase().endsWith('.txt')) {
                fullExtractedContent += `\n\n========== ${title} ==========\n${fileBuffer.toString('utf-8')}`;
                methodsUsed.push(`text:${title}`);
            }
        } catch (err) {
            console.error(`Error processing ${title}:`, err.message);
            failedFiles.push({ fileName: title, error: err.message });
        }
    }

    // --- Generate Q&A JSON from extracted content ---
    if (!fullExtractedContent.trim()) {
        return {
            extractedJson: { error: "No content could be extracted from materials" },
            methodsUsed,
            failedFiles
        };
    }

    console.log(`Total extracted content: ${fullExtractedContent.length} chars`);

    const systemPrompt = `You are an expert academic assistant. Analyze the extracted assignment content below and create a structured JSON response.

The content includes:
- All text from the documents
- [IMAGE: ...] or [FIGURE: ...] descriptions where visual elements appeared

YOUR TASK:
1. Identify ALL questions in the content
2. Provide comprehensive answers for each question
3. If a question references an image/figure, use the description provided to give a complete answer
4. Include the image/figure description in the 'imageInfo' field

RESPONSE FORMAT (JSON only, no markdown):
{
  "questions": {
    "q1": {
      "question": "The exact question text",
      "answer": "Complete, detailed answer",
      "imageInfo": "Description of any related image/diagram (from [IMAGE:] or [FIGURE:] tags)",
      "otherInfo": "Any additional context or tips"
    }
  },
  "extractedContent": "The complete extracted content for reference",
  "importantInfo": "Due dates, submission instructions, weightage, etc."
}

If no questions found, return: {"error": "No questions found in the content", "extractedContent": "...the content..."}`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Here is the extracted content:\n\n${fullExtractedContent}` }
            ],
            model: textModel,
            temperature: 0.2,
            max_tokens: 8000,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        const extractedJson = JSON.parse(responseText);

        // Always include the full extracted content
        if (!extractedJson.extractedContent) {
            extractedJson.extractedContent = fullExtractedContent;
        }

        if (failedFiles.length > 0) {
            extractedJson._warnings = failedFiles.map(f => `${f.fileName}: ${f.error}`);
        }

        return { extractedJson, methodsUsed, failedFiles };
    } catch (error) {
        console.error("Groq Extraction Failed:", error);
        return {
            extractedJson: { 
                error: "AI processing failed: " + error.message,
                extractedContent: fullExtractedContent 
            },
            methodsUsed,
            failedFiles
        };
    }
};
