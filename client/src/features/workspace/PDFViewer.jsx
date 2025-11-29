import { useState } from 'react';

const PDFViewer = ({ pdfFileId }) => {
    if (!pdfFileId) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500">
                <p>No PDF available for this assignment</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-zinc-900 rounded-xl overflow-hidden border border-white/5">
            <iframe
                src={`https://drive.google.com/file/d/${pdfFileId}/preview`}
                className="w-full h-full"
                allow="autoplay"
                title="PDF Viewer"
            />
        </div>
    );
};

export default PDFViewer;
