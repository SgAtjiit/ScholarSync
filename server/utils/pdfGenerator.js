import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { convert } from 'html-to-text';

export const createPDF = (text, fileName) => {
    return new Promise((resolve, reject) => {
        // Create a temporary file path in /tmp (writable on Vercel)
        const filePath = path.join(os.tmpdir(), `${fileName}.pdf`);

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Add Title
        doc.moveDown();

        // Detect if content is HTML or Markdown
        let cleanText;
        if (text.includes('<') && text.includes('>')) {
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
            // Simple cleanup of Markdown symbols
            cleanText = text
                .replace(/\*\*/g, '') // Remove bold markers
                .replace(/##/g, '')   // Remove heading markers
                .replace(/```/g, ''); // Remove code block markers
        }

        doc.fontSize(12).text(cleanText, {
            align: 'left',
            lineGap: 5
        });

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', (err) => reject(err));
    });
};