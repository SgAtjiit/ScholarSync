/**
 * Text Cleaning Utility for Server-Side AI
 */

export const cleanMarkdownFromHTML = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    let cleaned = text;

    const escapeHtml = (value = '') => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Convert fenced markdown code blocks into styled HTML blocks.
    cleaned = cleaned.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, language = '', code = '') => {
        const lang = (language || 'text').toLowerCase();
        const safeCode = escapeHtml(code.trim());
        return `<pre class="code-block"><code class="language-${lang}">${safeCode}</code></pre>`;
    });

    // Normalize plain pre/code pairs so styles apply consistently.
    cleaned = cleaned
        .replace(/<pre(?![^>]*class=)([^>]*)>\s*<code(?![^>]*class=)([^>]*)>/gi, '<pre class="code-block"$1><code class="language-text"$2>')
        .replace(/<pre(?![^>]*class=)([^>]*)>\s*<code([^>]*)class=["']([^"']+)["']([^>]*)>/gi, '<pre class="code-block"$1><code$2 class="$3"$4>')
        .replace(/<pre([^>]*)class=["']([^"']*)["']([^>]*)>\s*<code(?![^>]*class=)([^>]*)>/gi, '<pre$1 class="$2"$3><code class="language-text"$4>');

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

    return cleaned.trim();
};

export const cleanHTML = (text) => {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text.trim();
    // Only strip outer code block wrappers (e.g. ```html ... ```)
    cleaned = cleaned.replace(/^```(?:html|xml)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
    cleaned = cleaned.replace(/^```(?:html|xml)?\s*\n([\s\S]*?)$/i, '$1').trim();

    // Clean markdown artifacts that leaked into HTML
    cleaned = cleanMarkdownFromHTML(cleaned);

    // Normalize terminal blocks for consistent Google Docs rendering
    cleaned = cleaned
        .replace(/<div class="terminal-title">\s*Sample Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<div class="terminal-title">\s*Expected Output\s*<\/div>/gi, '<div class="terminal-title">Program Run</div>')
        .replace(/<pre>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/gi, '<pre>$1</pre>')
        .replace(/<pre><\/pre>/gi, '<pre>Program executed successfully.</pre>');

    return cleaned.trim();
};

export const cleanExtractedContent = (text) => {
    if (!text) return '';
    return text
        // Remove OCR/encoding artifacts
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/[ÃÂ§Ã¼Ã¶ÃŸÃ¤Ã±Ã©Ã¨Ã¢ÃªÃ®Ã´Ã»]/g, '')
        .replace(/;Ç[0-9A-Za-z]+/g, '')
        .replace(/[†‡•·°±×÷]+/g, ' ')
        .replace(/[\u0080-\u00FF]+/g, match => {
            // Keep valid extended ASCII if it makes sense
            if (/[àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ]/.test(match)) {
                return match;
            }
            return ' ';
        })
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};

export const cleanAndParseJSON = (text) => {
    if (typeof text !== 'string') return text;
    try {
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(cleaned);
    } catch (e) { throw new Error("JSON Parsing Error: " + e.message); }
};
