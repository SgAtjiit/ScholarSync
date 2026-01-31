import mammoth from 'mammoth';
import axios from 'axios';
import Groq from 'groq-sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import dotenv from 'dotenv';

dotenv.config();

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
        console.error(`Failed to convert PDF pages to images for ${title}:`, err.message);
        return [];
    }
};

/**
 * Extract complete content from a single page image using vision model
 * This includes ALL text + detailed descriptions of ALL images/diagrams
 */
const extractPageContent = async (groq, visionModel, pageImage, fileName, pageNum) => {
    const prompt = `You are extracting content from page ${pageNum} of "${fileName}".

YOUR TASK: Create a COMPLETE textual representation of this page. Someone reading your output should be able to understand EVERYTHING on this page without seeing the original.

RULES:
1. Extract ALL text exactly as written (questions, instructions, paragraphs, etc.)
2. For EVERY image, diagram, figure, chart, or visual element:
   - Write "[IMAGE: detailed description]" or "[FIGURE X: detailed description]"
   - Describe what the image shows in enough detail that someone could recreate it or answer questions about it
   - Include all labels, values, measurements, arrows, and relationships shown
3. Preserve the structure (numbered questions, bullet points, etc.)
4. If there's a table, recreate it in text format
5. Include headers, footers, page numbers if visible

EXAMPLE OUTPUT FORMAT:
---
Question 1: What is the process shown in the figure below?

[FIGURE 1: A flowchart showing the water cycle. Arrows connect: Sun → Evaporation from ocean → Cloud formation → Precipitation (rain) → Rivers/groundwater → Ocean. Labels show "Solar energy", "Water vapor rising", "Condensation", "Rainfall", and "Runoff".]

Question 2: Calculate the current in the circuit shown.

[CIRCUIT DIAGRAM: A simple series circuit with a 12V battery connected to two resistors. R1 = 4Ω and R2 = 8Ω are connected in series. An ammeter is shown between the battery and R1.]

(a) Find the total resistance
(b) Calculate the current using Ohm's law
---

Now extract ALL content from this page:`;

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
            max_tokens: 3000
        });

        const content = response.choices[0]?.message?.content || '';
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
                const pageImages = await getPdfPageImages(fileBuffer, title);
                
                if (pageImages.length === 0) {
                    // Fallback to text extraction if image conversion fails
                    const pdfParser = new PDFParse({ data: fileBuffer });
                    const pdfData = await pdfParser.getText();
                    fullExtractedContent += `\n\n========== ${title} ==========\n${pdfData.text || '[No text content]'}`;
                    methodsUsed.push(`pdf-text-fallback:${title}`);
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
