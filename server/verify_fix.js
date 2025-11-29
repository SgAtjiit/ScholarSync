import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function test() {
    try {
        const { PDFParse } = require('pdf-parse');
        console.log('PDFParse type:', typeof PDFParse);

        if (typeof PDFParse !== 'function') { // Class constructor is a function
            console.error('PDFParse is not a constructor/function');
            return;
        }

        // Create a dummy PDF buffer (this might fail if it validates PDF structure strictly)
        // Ideally I would use a real PDF, but for now let's see if it instantiates.
        // Or I can try to read a file if I had one.
        // I will just try to instantiate it.

        const dummyBuffer = Buffer.from('%PDF-1.7\n%\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000015 00000 n\n0000000060 00000 n\n0000000111 00000 n\n0000000212 00000 n\n0000000282 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n376\n%%EOF');

        const parser = new PDFParse({ data: dummyBuffer });
        console.log('Parser instantiated');

        const result = await parser.getText();
        console.log('Text extracted:', result.text);

    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
