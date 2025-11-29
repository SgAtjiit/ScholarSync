import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function test() {
    console.log('--- REQUIRE ---');
    try {
        const pdfLib = require('pdf-parse');
        console.log('Type:', typeof pdfLib);
        console.log('Keys:', Object.keys(pdfLib));
        if (pdfLib.default) {
            console.log('pdfLib.default Type:', typeof pdfLib.default);
            console.log('pdfLib.default Keys:', Object.keys(pdfLib.default));
        }
    } catch (e) {
        console.error('Require failed:', e);
    }

    console.log('\n--- IMPORT ---');
    try {
        const pdfLibImport = await import('pdf-parse');
        console.log('Type:', typeof pdfLibImport);
        console.log('Keys:', Object.keys(pdfLibImport));
        if (pdfLibImport.default) {
            console.log('pdfLibImport.default Type:', typeof pdfLibImport.default);
            console.log('pdfLibImport.default Keys:', Object.keys(pdfLibImport.default));
        }
    } catch (e) {
        console.error('Import failed:', e);
    }
}

test();
