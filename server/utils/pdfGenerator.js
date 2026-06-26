import PDFDocument from 'pdfkit';
import { convert } from 'html-to-text';

/**
 * Generates a PDF in memory and returns a Buffer.
 * No file writing involved - Vercel Safe.
 */
export const createPDF = (text) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            // Collect data chunks in memory
            doc.on('data', buffers.push.bind(buffers));
            
            // On finish, combine chunks into a single Buffer
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Add Title (Optional spacing)
            doc.moveDown();

            // Detect if content is HTML or Markdown
            let cleanText;
            if (text && (text.includes('<') && text.includes('>'))) {
                // Convert HTML to plain text
                cleanText = convert(text, {
                    wordwrap: 130,
                    selectors: [
                        { selector: 'h1', options: { uppercase: false } },
                        { selector: 'h2', options: { uppercase: false } },
                        { selector: 'h3', options: { uppercase: false } }
                    ]
                });
            } else {
                // Simple cleanup of Markdown symbols if text exists
                cleanText = (text || "")
                    .replace(/\*\*/g, '') // Remove bold markers
                    .replace(/##/g, '')   // Remove heading markers
                    .replace(/```/g, ''); // Remove code block markers
            }

            doc.fontSize(12).text(cleanText, {
                align: 'left',
                lineGap: 5
            });

            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};