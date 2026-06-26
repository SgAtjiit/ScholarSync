




/**
 * DocEditor - Google Docs Based Editor
 * 
 * Replaces TipTap editor with native Google Docs integration.
 * Benefits:
 * - Native support for tables, images, rich formatting
 * - Real-time collaboration
 * - No PDF generation issues (Google handles it)
 * - Less client-side code to maintain
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Button from "../../components/common/Button";
import toast from 'react-hot-toast';
import {
    FileText, ExternalLink, UploadCloud, RefreshCw,
    Download, Loader2, FileCheck, Eye, EyeOff, RotateCcw, Mail, MessageCircle, Copy, Share2
} from 'lucide-react';

const DocEditor = ({
    initialContent,
    assignmentId,
    assignmentTitle = "Assignment",
    courseName = "Course",
    onRegenerate,
    initialDocId = null,
    initialDocUrl = null,
    regenerateLabel = "Regenerate",
    isPdfMode = false
}) => {
    const { user } = useAuth();
    const [docId, setDocId] = useState(initialDocId);
    const [docUrl, setDocUrl] = useState(initialDocUrl);

    useEffect(() => {
        setDocId(initialDocId);
    }, [initialDocId]);

    useEffect(() => {
        setDocUrl(initialDocUrl);
    }, [initialDocUrl]);
    const [creating, setCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [submitFormat, setSubmitFormat] = useState('doc'); // 'doc' or 'pdf'
    const [previewKey, setPreviewKey] = useState(0); // For forcing iframe refresh
    const [refreshing, setRefreshing] = useState(false);
    const [syncedContent, setSyncedContent] = useState(null); // Content fetched from Google Docs
    const [useIframe, setUseIframe] = useState(true); // Toggle between iframe and synced HTML
    const [isShareOpen, setIsShareOpen] = useState(false); // Dropdown state

    const getShareableUrls = useCallback(() => {
        if (!docId) return null;

        const docLink = `https://docs.google.com/document/d/${docId}/edit`;
        const pdfLink = `https://docs.google.com/document/d/${docId}/export?format=pdf`;

        return {
            doc: docLink,
            pdf: pdfLink,
            selected: submitFormat === 'pdf' ? pdfLink : docLink,
        };
    }, [docId, submitFormat]);

    const openExternalLink = (url, target = '_blank') => {
        // Try the anchor tag approach first as it is the most reliable for downloads
        // and protocol handlers (like mailto/whatsapp), preventing duplicate actions.
        try {
            const a = document.createElement('a');
            a.href = url;
            a.target = target;
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return true;
        } catch {
            // Fall back to window.open if the DOM manipulation fails
            try {
                const opened = window.open(url, target, 'noopener,noreferrer');
                if (opened) return true;
            } catch {
                // both failed
            }
            return false;
        }
    };

    const handleDownload = () => {
        const urls = getShareableUrls();
        if (!urls) {
            toast.error('Document not ready for download yet');
            return;
        }

        const ok = openExternalLink(urls.selected, '_blank');
        if (!ok) {
            toast.error('Could not open download link. Try Copy Link.');
        }
    };

    const handleShareWhatsApp = () => {
        const urls = getShareableUrls();
        if (!urls) {
            toast.error('Document not ready for sharing yet');
            return;
        }

        const link = urls.selected;
        const label = submitFormat === 'pdf' ? 'PDF' : 'Doc';
        const msg = `Hi, sharing my assignment solution (${label}) for ${assignmentTitle}: ${link}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

        const ok = openExternalLink(whatsappUrl, '_blank');
        if (!ok) {
            toast.error('Could not open WhatsApp. Link copied instead.');
            navigator.clipboard?.writeText(link).catch(() => { });
        }
    };

    const handleShareEmail = () => {
        const urls = getShareableUrls();
        if (!urls) {
            toast.error('Document not ready for sharing yet');
            return;
        }

        const link = urls.selected;
        const label = submitFormat === 'pdf' ? 'PDF' : 'Doc';
        const subject = `Assignment Solution - ${assignmentTitle}`;
        const body = [
            'Hi,',
            '',
            `Please find my assignment solution (${label}) below:`,
            link,
            '',
            'Thanks.'
        ].join('\n');

        const params = new URLSearchParams({ subject, body });
        const mailtoUrl = `mailto:?${params.toString()}`;
        const ok = openExternalLink(mailtoUrl, '_self');

        if (!ok) {
            toast.error('Could not open email app. Link copied instead.');
            navigator.clipboard?.writeText(link).catch(() => { });
        }
    };

    const handleCopyShareLink = async () => {
        const urls = getShareableUrls();
        if (!urls) {
            toast.error('Document not ready for sharing yet');
            return;
        }

        try {
            await navigator.clipboard.writeText(urls.selected);
            toast.success('Share link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    /**
     * Create Google Doc from the draft content
     */
    const createGoogleDoc = useCallback(async () => {
        if (!initialContent) {
            toast.error("No content to create document from");
            return;
        }

        setCreating(true);
        const toastId = toast.loading('Creating Google Doc...');

        try {
            const res = await api.post('/classroom/create-draft-doc', {
                assignmentId,
                userId: user._id,
                content: initialContent,
                title: `${assignmentTitle}_Solution`,
                courseName
            });

            setDocId(res.data.docId);
            setDocUrl(res.data.editLink);

            toast.success('Google Doc created! You can now edit it.', { id: toastId });

        } catch (err) {
            console.error('Create doc error:', err);
            toast.error(err.response?.data?.error || 'Failed to create document', { id: toastId });
        } finally {
            setCreating(false);
        }
    }, [initialContent, assignmentId, user._id, assignmentTitle, courseName]);

    // Auto-create doc when content is available
    useEffect(() => {
        if (isPdfMode) return;
        if (initialContent && !docId && !creating) {
            createGoogleDoc();
        }
    }, [initialContent, docId, creating, createGoogleDoc, isPdfMode]);

    /**
     * Open doc in new tab for editing
     */
    const handleEditInDocs = () => {
        if (docUrl) {
            window.open(docUrl, '_blank');
        }
    };

    /**
     * Submit solution to Drive
     */
    const handleSubmit = async () => {
        if (!docId) {
            toast.error("No document to submit");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading(
            submitFormat === 'pdf'
                ? 'Converting to PDF and uploading...'
                : 'Uploading document to Drive...'
        );

        try {
            const res = await api.post('/classroom/submit-doc', {
                docId,
                assignmentId,
                userId: user._id,
                format: submitFormat, // 'doc' or 'pdf'
                courseName,
                assignmentTitle
            });

            toast.success(
                `Saved to Drive: ${res.data.folderPath}`,
                { id: toastId, duration: 3000 }
            );

            // Open Classroom for manual attachment
            if (res.data.classroomLink) {
                toast(`Opening Google Classroom to attach your file...`, {
                    icon: '📎',
                    duration: 3000
                });
                setTimeout(() => {
                    window.open(res.data.classroomLink, '_blank');
                }, 1500);
            }
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.error || 'Submission failed', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Regenerate and replace doc
     */
    const handleRegenerate = async () => {
        // Clear current doc reference
        setDocId(null);
        setDocUrl(null);
        // Trigger parent regeneration
        if (onRegenerate) {
            onRegenerate();
        }
    };

    /**
     * Refresh the preview to fetch latest changes from Google Doc
     */
    const handleRefreshPreview = async () => {
        if (!docId) return;

        setRefreshing(true);
        const toastId = toast.loading('Syncing changes from Google Docs...');

        try {
            // Fetch the latest content from Google Docs
            const res = await api.post('/classroom/sync-from-docs', {
                docId,
                userId: user._id
            });

            if (res.data.content) {
                setSyncedContent(res.data.content);
                setUseIframe(false); // Switch to showing synced HTML
                toast.success('Preview updated with latest changes!', { id: toastId });
            } else {
                toast.error('No content received', { id: toastId });
            }
        } catch (err) {
            console.error('Sync error:', err);
            toast.error(err.response?.data?.error || 'Failed to sync changes', { id: toastId });
            // Fallback: try refreshing iframe
            setPreviewKey(prev => prev + 1);
        } finally {
            setRefreshing(false);
        }
    };

    /**
     * Toggle between iframe preview and synced HTML view
     */
    const toggleViewMode = () => {
        setUseIframe(!useIframe);
    };

    // Loading state - creating initial doc
    if (creating) {
        return (
            <div className="flex flex-col h-full bg-zinc-900/30 items-center justify-center gap-4 min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-zinc-400">Creating Google Doc...</p>
                <p className="text-xs text-zinc-500">This will open in preview mode</p>
            </div>
        );
    }

    // No content and no doc created yet
    if (!initialContent && !docId) {
        return (
            <div className="flex flex-col h-full bg-zinc-900/30 items-center justify-center gap-4 min-h-[400px]">
                <FileText className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400">Generate a draft solution first</p>
            </div>
        );
    }

    if (isPdfMode) {
        return (
            <div className="flex flex-col h-full bg-zinc-900/30 animate-fade-in">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-white/5 bg-zinc-900/50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <h2 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">
                                Draft Solution
                            </h2>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FileCheck size={10} /> PDF Ready
                            </span>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                            {onRegenerate && (
                                <Button onClick={handleRegenerate} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3">
                                    <RefreshCw size={12} className="sm:w-3.5 sm:h-3.5 mr-1" />
                                    <span>{regenerateLabel}</span>
                                </Button>
                            )}

                            <Button
                                onClick={() => window.open(docUrl, '_blank')}
                                size="sm"
                                variant="primary"
                                className="bg-green-600 hover:bg-green-500 text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5"
                            >
                                <Download size={12} />
                                <span>Download PDF</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* PDF Embed / Preview */}
                <div className="flex-1 overflow-hidden">
                    <iframe
                        src={`${docUrl}#toolbar=0`}
                        className="w-full h-full min-h-[500px] border-0 bg-[#121214]"
                        title="PDF Solution Preview"
                    />
                </div>

                {/* Helper text */}
                <div className="p-2 border-t border-white/5 bg-zinc-900/50">
                    <p className="text-[10px] sm:text-xs text-zinc-500 text-center">
                        ✨ PDF generated and stored in Supabase. Click 'Download PDF' to download or print!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900/30">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-white/5 bg-zinc-900/50">
                {/* Row 1: Header and Editor Actions */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <h2 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">
                            Draft Solution
                        </h2>
                        {docId && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FileCheck size={10} /> Doc Ready
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                        {onRegenerate && (
                            <Button onClick={handleRegenerate} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3">
                                <RefreshCw size={12} className="sm:w-3.5 sm:h-3.5 mr-1" />
                                <span className="hidden xs:inline">{regenerateLabel}</span>
                                <span className="xs:hidden">Regen</span>
                            </Button>
                        )}

                        <Button onClick={() => setShowPreview(!showPreview)} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3">
                            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                            <span className="hidden sm:inline ml-1">{showPreview ? 'Hide' : 'Show'}</span>
                        </Button>

                        {docId && showPreview && (
                            <Button onClick={handleRefreshPreview} disabled={refreshing} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3 bg-purple-600 hover:bg-purple-500 text-white" title="Sync latest changes from Google Docs">
                                <RotateCcw size={12} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline ml-1">Sync</span>
                            </Button>
                        )}

                        {docId && syncedContent && showPreview && (
                            <Button onClick={toggleViewMode} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3" title={useIframe ? 'Show synced view' : 'Show iframe preview'}>
                                {useIframe ? 'Synced' : 'Preview'}
                            </Button>
                        )}

                        {docId && (
                            <Button onClick={handleEditInDocs} size="sm" variant="secondary" className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs px-2 sm:px-3">
                                <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5 mr-1" />
                                <span className="hidden sm:inline">Edit in Docs</span>
                                <span className="sm:hidden">Edit</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Row 2: Export, Share, and Submit Actions */}
                {docId && (
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pt-3 border-t border-white/10">
                        <div className="flex gap-2 items-center flex-wrap">
                            <select
                                value={submitFormat}
                                onChange={(e) => setSubmitFormat(e.target.value)}
                                className="bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs rounded p-1 sm:p-1.5 border border-zinc-700 outline-none"
                            >
                                <option value="doc">As Doc</option>
                                <option value="pdf">As PDF</option>
                            </select>

                            <Button onClick={handleDownload} size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3">
                                <Download size={12} className="sm:w-3.5 sm:h-3.5 mr-1" />
                                <span>Download</span>
                            </Button>

                            {/* Share Dropdown */}
                            <div className="relative">
                                <Button
                                    onClick={() => setIsShareOpen(!isShareOpen)}
                                    size="sm"
                                    variant="secondary"
                                    className="text-[10px] sm:text-xs px-2 sm:px-3"
                                >
                                    <Share2 size={12} className="sm:w-3.5 sm:h-3.5 mr-1" />
                                    <span>Share</span>
                                </Button>

                                {isShareOpen && (
                                    <>
                                        {/* Invisible overlay to catch clicks outside the dropdown */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsShareOpen(false)}
                                        ></div>

                                        <div className="absolute top-full mt-1 left-0 lg:left-auto lg:right-0 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl py-1 z-50 min-w-[150px]">
                                            <button
                                                onClick={() => { handleShareWhatsApp(); setIsShareOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-[11px] sm:text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center transition-colors"
                                            >
                                                <MessageCircle size={14} className="mr-2 text-emerald-400" /> Share on WhatsApp
                                            </button>
                                            <button
                                                onClick={() => { handleShareEmail(); setIsShareOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-[11px] sm:text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center transition-colors"
                                            >
                                                <Mail size={14} className="mr-2 text-blue-400" /> Share via Email
                                            </button>
                                            <div className="border-t border-zinc-700 my-1"></div>
                                            <button
                                                onClick={() => { handleCopyShareLink(); setIsShareOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-[11px] sm:text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center transition-colors"
                                            >
                                                <Copy size={14} className="mr-2 text-zinc-400" /> Copy Link
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <Button onClick={handleSubmit} loading={submitting} disabled={!docId} size="sm" variant="primary" className="bg-green-600 hover:bg-green-500 text-white text-[10px] sm:text-xs px-2 sm:px-3 w-full lg:w-auto mt-2 lg:mt-0">
                            <UploadCloud size={12} className="sm:w-4 sm:h-4 mr-1" />
                            <span>Submit to Classroom</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Google Doc Preview/Embed */}
            <div className="flex-1 overflow-hidden">
                {showPreview && docId ? (
                    // Show synced HTML content if available and not using iframe
                    !useIframe && syncedContent ? (
                        <div className="overflow-y-auto h-full min-h-[500px] bg-white">
                            <style>{`
                                .synced-doc-content {
                                    font-family: Arial, sans-serif;
                                    line-height: 1.6;
                                    color: #1f2937;
                                    padding: 24px;
                                    max-width: 800px;
                                    margin: 0 auto;
                                }
                                .synced-doc-content h1, .synced-doc-content h2, .synced-doc-content h3 {
                                    color: #111827;
                                    margin-top: 1.5em;
                                    margin-bottom: 0.5em;
                                }
                                .synced-doc-content h1 { font-size: 24px; }
                                .synced-doc-content h2 { font-size: 20px; }
                                .synced-doc-content h3 { font-size: 16px; }
                                .synced-doc-content p { margin: 1em 0; }
                                .synced-doc-content table {
                                    border-collapse: collapse;
                                    width: 100%;
                                    margin: 1em 0;
                                }
                                .synced-doc-content th, .synced-doc-content td {
                                    border: 1px solid #d1d5db;
                                    padding: 10px;
                                    text-align: left;
                                }
                                .synced-doc-content th {
                                    background: #f3f4f6;
                                    font-weight: 600;
                                }
                                .synced-doc-content img {
                                    max-width: 100%;
                                    height: auto;
                                    margin: 1em 0;
                                    border-radius: 4px;
                                }
                                .synced-doc-content ul, .synced-doc-content ol {
                                    margin: 1em 0;
                                    padding-left: 2em;
                                }
                                .synced-doc-content li { margin: 0.5em 0; }
                                .synced-doc-content a { color: #4f46e5; text-decoration: underline; }
                                .synced-doc-content code {
                                    background: #f3f4f6;
                                    padding: 2px 6px;
                                    border-radius: 3px;
                                    font-family: monospace;
                                }
                            `}</style>
                            <div
                                className="synced-doc-content"
                                dangerouslySetInnerHTML={{ __html: syncedContent }}
                            />
                        </div>
                    ) : (
                        <iframe
                            key={previewKey}
                            src={`https://docs.google.com/document/d/${docId}/preview?cachebust=${previewKey}`}
                            className="w-full h-full min-h-[500px] border-0"
                            title="Document Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    )
                ) : showPreview && !docId ? (
                    // Fallback: Show HTML content while doc is being created
                    <div
                        className="prose prose-invert max-w-none p-4 overflow-y-auto h-full min-h-[500px]"
                        dangerouslySetInnerHTML={{ __html: initialContent }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full min-h-[500px] text-zinc-500">
                        <p>Preview hidden. Click "Edit in Docs" to make changes.</p>
                    </div>
                )}
            </div>

            {/* Helper text */}
            <div className="p-2 border-t border-white/5 bg-zinc-900/50">
                <p className="text-[10px] sm:text-xs text-zinc-500 text-center">
                    {docId
                        ? "✨ Click 'Edit in Docs' to add tables, images, and rich formatting. Changes save automatically!"
                        : "Creating your document..."}
                </p>
            </div>
        </div>
    );
};

export default DocEditor;