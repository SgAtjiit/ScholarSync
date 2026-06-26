import { useState } from 'react';

const PDFViewer = ({ pdfFileId, isManual }) => {
    if (!pdfFileId) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 p-4 text-center">
                <p className="text-sm">No PDF available for this assignment</p>
            </div>
        );
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');
    const isManualFile = isManual || String(pdfFileId).startsWith('manual_file_');
    const iframeSrc = isManualFile 
        ? `${serverUrl}/api/stream/download/${pdfFileId}?isManual=true${token ? `&token=${token}` : ''}`
        : `https://drive.google.com/file/d/${pdfFileId}/preview`;

    return (
        <div className="h-full w-full bg-zinc-900 rounded-lg sm:rounded-xl overflow-hidden border border-white/5 min-h-[300px] sm:min-h-[400px]">
            <iframe
                src={iframeSrc}
                className="w-full h-full"
                allow="autoplay"
                title="PDF Viewer"
            />
        </div>
    );
};

export default PDFViewer;
