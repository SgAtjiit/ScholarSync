/**
 * Client-Side PDF Processing Utilities
 * Uses pdfjs-dist to parse PDFs entirely in the browser.
 * This eliminates backend memory usage and OOM crashes.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker using local import (more reliable than CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Fetch a file from the streaming proxy and convert to ArrayBuffer
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID for authentication
 * @param {string} serverUrl - Backend server URL (from env)
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<ArrayBuffer>}
 */
export const fetchFileAsArrayBuffer = async (fileId, userId, serverUrl, onProgress) => {
    const response = await fetch(
        `${serverUrl}/api/stream/download/${fileId}?userId=${userId}`,
        { credentials: 'include' }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to download file: ${response.status}`);
    }

    // Get content length for progress tracking
    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the stream
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Report progress
        if (onProgress && total) {
            onProgress(Math.round((receivedLength / total) * 100));
        }
    }

    // Concatenate all chunks into single ArrayBuffer
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
    }

    return allChunks.buffer;
};

/**
 * Load a PDF document from an ArrayBuffer
 * @param {ArrayBuffer} arrayBuffer - PDF file data
 * @returns {Promise<PDFDocumentProxy>}
 */
export const loadPdfDocument = async (arrayBuffer) => {
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        // Enable optional content groups for better image extraction
        enableXfa: true,
    });

    return await loadingTask.promise;
};

/**
 * Extract text content from a single PDF page
 * @param {PDFPageProxy} page - PDF page object
 * @returns {Promise<string>}
 */
export const extractPageText = async (page) => {
    const textContent = await page.getTextContent();
    
    // Join text items with proper spacing
    let lastY = null;
    let text = '';
    
    for (const item of textContent.items) {
        if (item.str) {
            // Add newline if Y position changed significantly
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                text += '\n';
            } else if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) {
                text += ' ';
            }
            text += item.str;
            lastY = item.transform[5];
        }
    }
    
    return text.trim();
};

/**
 * Render a PDF page to canvas and extract as Base64 image
 * @param {PDFPageProxy} page - PDF page object
 * @param {number} maxWidth - Maximum width for downscaling (default: 1024)
 * @returns {Promise<{base64: string, width: number, height: number}>}
 */
export const renderPageToImage = async (page, maxWidth = 1024) => {
    const viewport = page.getViewport({ scale: 1 });
    
    // Calculate scale to fit within maxWidth
    let scale = 1;
    if (viewport.width > maxWidth) {
        scale = maxWidth / viewport.width;
    }
    
    const scaledViewport = page.getViewport({ scale });
    
    // Create off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);
    
    const context = canvas.getContext('2d');
    
    // Render the page
    await page.render({
        canvasContext: context,
        viewport: scaledViewport,
    }).promise;
    
    // Convert to Base64
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    
    return {
        base64,
        width: canvas.width,
        height: canvas.height,
    };
};

/**
 * Detect if a page has significant image content
 * (Useful to decide whether to use vision API)
 * @param {PDFPageProxy} page - PDF page object
 * @returns {Promise<boolean>}
 */
export const pageHasImages = async (page) => {
    try {
        const opList = await page.getOperatorList();
        
        // Check for image operators
        const imageOps = [
            pdfjsLib.OPS.paintImageXObject,
            pdfjsLib.OPS.paintImageXObjectRepeat,
            pdfjsLib.OPS.paintJpegXObject,
        ];
        
        return opList.fnArray.some(op => imageOps.includes(op));
    } catch {
        return false;
    }
};

// Maximum pages allowed for processing
const MAX_PAGES = 50;

/**
 * Complete PDF extraction pipeline
 * Extracts text from all pages and renders images for vision processing
 * @param {ArrayBuffer} arrayBuffer - PDF file data
 * @param {Object} options - Extraction options
 * @param {Function} options.onProgress - Progress callback ({stage, current, total, message})
 * @param {boolean} options.extractImages - Whether to extract images (default: true)
 * @param {number} options.maxImageWidth - Max image width (default: 1024)
 * @returns {Promise<{pages: Array, totalPages: number}>}
 */
export const extractPdfContent = async (arrayBuffer, options = {}) => {
    const {
        onProgress = () => {},
        extractImages = true,
        maxImageWidth = 1024,
    } = options;

    onProgress({ stage: 'loading', current: 0, total: 100, message: 'Loading PDF...' });
    
    const pdf = await loadPdfDocument(arrayBuffer);
    const numPages = pdf.numPages;

    // Check page limit
    if (numPages > MAX_PAGES) {
        throw new Error(`Document has ${numPages} pages, which exceeds the ${MAX_PAGES}-page limit. Please use a shorter document or split it into parts.`);
    }

    const pages = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        onProgress({
            stage: 'extracting',
            current: pageNum,
            total: numPages,
            message: `Extracting page ${pageNum} of ${numPages}...`,
        });

        const page = await pdf.getPage(pageNum);
        
        // Extract text
        const text = await extractPageText(page);
        
        // Check for images and render if needed
        let image = null;
        if (extractImages) {
            const hasImages = await pageHasImages(page);
            
            // Also render page as image if text is minimal (might be scanned)
            const needsVision = hasImages || text.length < 100;
            
            if (needsVision) {
                const rendered = await renderPageToImage(page, maxImageWidth);
                image = rendered.base64;
            }
        }

        pages.push({
            pageNumber: pageNum,
            text,
            hasImage: !!image,
            image, // Base64 string or null
        });
    }

    onProgress({ stage: 'complete', current: numPages, total: numPages, message: 'Extraction complete!' });

    return {
        pages,
        totalPages: numPages,
    };
};

/**
 * Estimate token count from text (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number}
 */
export const estimateTokens = (text) => {
    if (!text) return 0;
    // Rough estimate: ~4 chars per token for English text
    return Math.ceil(text.length / 4);
};

export default {
    fetchFileAsArrayBuffer,
    loadPdfDocument,
    extractPageText,
    renderPageToImage,
    pageHasImages,
    extractPdfContent,
    estimateTokens,
};
