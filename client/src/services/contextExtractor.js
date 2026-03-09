/**
 * Context Extraction Pipeline
 * Combines PDF text extraction and AI vision processing to create
 * a cohesive Markdown context for AI generation.
 */

import { fetchFileAsArrayBuffer, extractPdfContent, estimateTokens } from './pdfService';
import { extractImageContent, hasApiKey } from './groqService';

/**
 * Clean text from encoding artifacts
 * @param {string} text - Raw text
 * @returns {string}
 */
const cleanText = (text) => {
    if (!text) return '';
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/;Ç[0-9A-Za-z]+/g, '')
        .replace(/[†‡•·]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};

/**
 * Full extraction pipeline: Download -> Parse -> Vision -> Stitch
 * @param {Object} options - Pipeline options
 * @param {string} options.fileId - Google Drive file ID
 * @param {string} options.userId - User ID for authentication
 * @param {string} options.fileName - File name for context
 * @param {string} options.serverUrl - Backend server URL
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.useVision - Whether to process images with vision (default: true)
 * @returns {Promise<{content: string, pageCount: number, hasImages: boolean, tokenEstimate: number}>}
 */
export const extractDocumentContext = async ({
    fileId,
    userId,
    fileName = 'document',
    serverUrl,
    onProgress = () => {},
    useVision = true,
}) => {
    if (!hasApiKey() && useVision) {
        throw new Error('API key required for vision processing');
    }

    let extractedContent = '';
    let pageCount = 0;
    let hasImages = false;

    try {
        // Stage 1: Download file as ArrayBuffer
        onProgress({ stage: 'download', progress: 0, message: 'Downloading document...' });
        
        const arrayBuffer = await fetchFileAsArrayBuffer(
            fileId,
            userId,
            serverUrl,
            (progress) => onProgress({ stage: 'download', progress, message: `Downloading: ${progress}%` })
        );

        onProgress({ stage: 'download', progress: 100, message: 'Download complete!' });

        // Stage 2: Extract PDF content
        onProgress({ stage: 'parse', progress: 0, message: 'Parsing PDF...' });

        const pdfContent = await extractPdfContent(arrayBuffer, {
            extractImages: useVision,
            maxImageWidth: 1024,
            onProgress: ({ current, total, message }) => {
                onProgress({
                    stage: 'parse',
                    progress: Math.round((current / total) * 100),
                    message,
                });
            },
        });

        pageCount = pdfContent.totalPages;
        const pagesWithImages = pdfContent.pages.filter(p => p.hasImage);
        hasImages = pagesWithImages.length > 0;

        // Stage 3: Process images with vision API (if needed)
        if (useVision && hasImages) {
            onProgress({ stage: 'vision', progress: 0, message: 'Analyzing images with AI...' });

            for (let i = 0; i < pdfContent.pages.length; i++) {
                const page = pdfContent.pages[i];

                if (page.hasImage && page.image) {
                    onProgress({
                        stage: 'vision',
                        progress: Math.round((i / pdfContent.pages.length) * 100),
                        message: `Analyzing page ${page.pageNumber} with vision AI...`,
                    });

                    try {
                        const visionContent = await extractImageContent(
                            page.image,
                            page.pageNumber,
                            fileName
                        );
                        
                        // Replace or supplement text with vision extraction
                        if (visionContent && visionContent.length > page.text.length) {
                            page.text = visionContent;
                            page.visionProcessed = true;
                        } else if (visionContent) {
                            // Append vision content if it adds value
                            page.text += '\n\n[Vision Analysis]\n' + visionContent;
                            page.visionProcessed = true;
                        }
                    } catch (err) {
                        console.warn(`Vision processing failed for page ${page.pageNumber}:`, err);
                        page.visionError = err.message;
                    }
                }
            }

            onProgress({ stage: 'vision', progress: 100, message: 'Vision analysis complete!' });
        }

        // Stage 4: Stitch content together
        onProgress({ stage: 'stitch', progress: 0, message: 'Combining content...' });

        extractedContent = stitchContent(pdfContent.pages, fileName);

        onProgress({ stage: 'complete', progress: 100, message: 'Extraction complete!' });

        return {
            content: extractedContent,
            pageCount,
            hasImages,
            tokenEstimate: estimateTokens(extractedContent),
            pages: pdfContent.pages.map(p => ({
                pageNumber: p.pageNumber,
                textLength: p.text?.length || 0,
                hasImage: p.hasImage,
                visionProcessed: p.visionProcessed || false,
            })),
        };

    } catch (error) {
        console.error('Extraction pipeline error:', error);
        throw error;
    }
};

/**
 * Stitch page content into cohesive Markdown
 * @param {Array} pages - Extracted pages
 * @param {string} fileName - Document name
 * @returns {string}
 */
const stitchContent = (pages, fileName) => {
    let markdown = `# ${fileName}\n\n`;
    
    for (const page of pages) {
        const pageText = cleanText(page.text);
        
        if (pageText) {
            // Add page separator for multi-page docs
            if (pages.length > 1) {
                markdown += `---\n**Page ${page.pageNumber}**\n\n`;
            }
            
            markdown += pageText + '\n\n';
        }
    }
    
    return markdown.trim();
};

/**
 * Extract context from multiple files and combine
 * @param {Array} files - Array of {fileId, fileName} objects
 * @param {string} userId - User ID
 * @param {string} serverUrl - Server URL
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{content: string, files: Array}>}
 */
export const extractMultipleDocuments = async (files, userId, serverUrl, onProgress = () => {}) => {
    const results = [];
    let combinedContent = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        onProgress({
            stage: 'file',
            current: i + 1,
            total: files.length,
            message: `Processing file ${i + 1} of ${files.length}: ${file.fileName}`,
        });

        try {
            const result = await extractDocumentContext({
                fileId: file.fileId,
                userId,
                fileName: file.fileName,
                serverUrl,
                onProgress: (p) => onProgress({
                    ...p,
                    fileIndex: i,
                    fileName: file.fileName,
                }),
            });

            results.push({
                fileName: file.fileName,
                fileId: file.fileId,
                ...result,
                success: true,
            });

            if (combinedContent) {
                combinedContent += '\n\n---\n\n';
            }
            combinedContent += `## ${file.fileName}\n\n${result.content}`;

        } catch (error) {
            results.push({
                fileName: file.fileName,
                fileId: file.fileId,
                success: false,
                error: error.message,
            });
        }
    }

    return {
        content: combinedContent,
        files: results,
        totalTokens: estimateTokens(combinedContent),
    };
};

export default {
    extractDocumentContext,
    extractMultipleDocuments,
    stitchContent,
};
