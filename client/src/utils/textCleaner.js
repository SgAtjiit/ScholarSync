/**
 * Text Cleaning Utility
 * Removes markdown artifacts, encoding issues, and formatting inconsistencies
 * from AI-generated content.
 */

/**
 * Clean markdown artifacts from HTML content
 * Handles cases where AI includes markdown syntax despite HTML instructions
 * @param {string} text - HTML content that may contain markdown artifacts
 * @returns {string} Clean HTML
 */
export const cleanMarkdownFromHTML = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    let cleaned = text;

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
        // Extract content from code block and wrap in <pre><code>
        const content = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
        return `<pre><code>${content.trim()}</code></pre>`;
    });

    // Remove inline code backticks if not inside <code> tags
    cleaned = cleaned.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert **bold** to <strong>
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em> (but only single asterisks)
    cleaned = cleaned.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Convert __bold__ to <strong>
    cleaned = cleaned.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Convert _italic_ to <em> (but only single underscores)
    cleaned = cleaned.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

    // Remove standalone asterisks (bullet points in wrong context)
    cleaned = cleaned.replace(/^\s*\*\s+/gm, '• ');

    // Clean up any remaining stray asterisks not part of words
    cleaned = cleaned.replace(/\s\*\s/g, ' ');
    cleaned = cleaned.replace(/^\*\s/gm, '• ');

    // Convert markdown headers if present
    cleaned = cleaned.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    cleaned = cleaned.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    cleaned = cleaned.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Convert markdown links [text](url)
    cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert markdown horizontal rules
    cleaned = cleaned.replace(/^---+$/gm, '<hr>');
    cleaned = cleaned.replace(/^\*\*\*+$/gm, '<hr>');

    // Clean HTML entities that may have been double-encoded
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');

    return cleaned.trim();
};

/**
 * Clean text for display (removes all markdown/HTML)
 * @param {string} text - Raw text
 * @returns {string} Plain text
 */
export const cleanToPlainText = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    let cleaned = text;

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // Remove markdown headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');

    // Remove markdown links
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove bullet points
    cleaned = cleaned.replace(/^[\*\-•]\s+/gm, '');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();

    return cleaned;
};

/**
 * Clean JSON content for display (flashcards, quizzes)
 * Cleans text fields within JSON objects
 * @param {Object|Array} data - JSON data with text fields
 * @returns {Object|Array} Cleaned data
 */
export const cleanJSONContent = (data) => {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => cleanJSONContent(item));
    }

    if (typeof data === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                // Clean text content within JSON
                cleaned[key] = cleanTextContent(value);
            } else if (typeof value === 'object') {
                cleaned[key] = cleanJSONContent(value);
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    return data;
};

/**
 * Clean text content (removes encoding artifacts and normalizes)
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
export const cleanTextContent = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    let cleaned = text;

    // Remove encoding artifacts
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    cleaned = cleaned.replace(/;Ç[0-9A-Za-z]+/g, '');
    cleaned = cleaned.replace(/[†‡·]/g, ' ');

    // Remove markdown bold/italic if present
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/(?<!_)_([^_]+)_(?!_)/g, '$1');

    // Keep bullet point marker but clean stray asterisks
    cleaned = cleaned.replace(/^\s*\*\s+/gm, '• ');
    cleaned = cleaned.replace(/\s\*\s/g, ' ');

    // Clean extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    return cleaned.trim();
};

/**
 * Sanitize HTML for safe rendering
 * Removes potentially dangerous elements while preserving formatting
 * @param {string} html - HTML content
 * @returns {string} Sanitized HTML
 */
export const sanitizeHTML = (html) => {
    if (!html || typeof html !== 'string') return html || '';

    let cleaned = html;

    // Remove script tags
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Remove event handlers
    cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, '');
    cleaned = cleaned.replace(/\s+on\w+='[^']*'/gi, '');

    // Remove javascript: URLs
    cleaned = cleaned.replace(/href="javascript:[^"]*"/gi, 'href="#"');
    cleaned = cleaned.replace(/src="javascript:[^"]*"/gi, '');

    // Remove iframe and object tags
    cleaned = cleaned.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    cleaned = cleaned.replace(/<object[\s\S]*?<\/object>/gi, '');

    return cleaned;
};

/**
 * Full content cleaning pipeline
 * @param {string} content - Raw content
 * @param {string} type - Content type: 'html', 'json', 'text'
 * @returns {string|Object} Cleaned content
 */
export const cleanContent = (content, type = 'html') => {
    if (!content) return content;

    switch (type) {
        case 'html':
            return sanitizeHTML(cleanMarkdownFromHTML(content));
        case 'json':
            return cleanJSONContent(
                typeof content === 'string' ? JSON.parse(content) : content
            );
        case 'text':
            return cleanTextContent(content);
        default:
            return content;
    }
};

export default {
    cleanMarkdownFromHTML,
    cleanToPlainText,
    cleanJSONContent,
    cleanTextContent,
    sanitizeHTML,
    cleanContent,
};
