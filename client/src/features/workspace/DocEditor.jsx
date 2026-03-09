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
    Download, Loader2, FileCheck, Eye, EyeOff, RotateCcw
} from 'lucide-react';

const DocEditor = ({ 
    initialContent, 
    assignmentId, 
    assignmentTitle = "Assignment",
    courseName = "Course",
    onRegenerate 
}) => {
    const { user } = useAuth();
    const [docId, setDocId] = useState(null);
    const [docUrl, setDocUrl] = useState(null);
    const [creating, setCreating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [submitFormat, setSubmitFormat] = useState('doc'); // 'doc' or 'pdf'
    const [previewKey, setPreviewKey] = useState(0); // For forcing iframe refresh
    const [refreshing, setRefreshing] = useState(false);
    const [syncedContent, setSyncedContent] = useState(null); // Content fetched from Google Docs
    const [useIframe, setUseIframe] = useState(true); // Toggle between iframe and synced HTML

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
        if (initialContent && !docId && !creating) {
            createGoogleDoc();
        }
    }, [initialContent, docId, creating, createGoogleDoc]);

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

    // No content yet
    if (!initialContent) {
        return (
            <div className="flex flex-col h-full bg-zinc-900/30 items-center justify-center gap-4 min-h-[400px]">
                <FileText className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400">Generate a draft solution first</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900/30">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 sm:p-4 border-b border-white/5 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">
                        Draft Solution
                    </h2>
                    {docId && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FileCheck size={10} /> Doc Ready
                        </span>
                    )}
                </div>

                <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
                    {/* Regenerate */}
                    {onRegenerate && (
                        <Button
                            onClick={handleRegenerate}
                            size="sm"
                            variant="secondary"
                            className="text-[10px] sm:text-xs px-2 sm:px-3"
                        >
                            <RefreshCw size={12} className="sm:w-[14px] sm:h-[14px] mr-1" />
                            <span className="hidden xs:inline">Regenerate</span>
                            <span className="xs:hidden">Regen</span>
                        </Button>
                    )}

                    {/* Toggle Preview */}
                    <Button
                        onClick={() => setShowPreview(!showPreview)}
                        size="sm"
                        variant="secondary"
                        className="text-[10px] sm:text-xs px-2 sm:px-3"
                    >
                        {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span className="hidden sm:inline ml-1">{showPreview ? 'Hide' : 'Show'}</span>
                    </Button>

                    {/* Refresh Preview */}
                    {docId && showPreview && (
                        <Button
                            onClick={handleRefreshPreview}
                            disabled={refreshing}
                            size="sm"
                            variant="secondary"
                            className="text-[10px] sm:text-xs px-2 sm:px-3 bg-purple-600 hover:bg-purple-500 text-white"
                            title="Sync latest changes from Google Docs"
                        >
                            <RotateCcw size={12} className={refreshing ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline ml-1">Sync</span>
                        </Button>
                    )}

                    {/* View mode toggle (if synced content exists) */}
                    {docId && syncedContent && showPreview && (
                        <Button
                            onClick={toggleViewMode}
                            size="sm"
                            variant="secondary"
                            className="text-[10px] sm:text-xs px-2 sm:px-3"
                            title={useIframe ? 'Show synced view' : 'Show iframe preview'}
                        >
                            {useIframe ? 'Synced' : 'Preview'}
                        </Button>
                    )}

                    {/* Edit in Google Docs */}
                    {docId && (
                        <Button
                            onClick={handleEditInDocs}
                            size="sm"
                            variant="secondary"
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs px-2 sm:px-3"
                        >
                            <ExternalLink size={12} className="sm:w-[14px] sm:h-[14px] mr-1" />
                            <span className="hidden sm:inline">Edit in Docs</span>
                            <span className="sm:hidden">Edit</span>
                        </Button>
                    )}

                    {/* Format selector */}
                    <select 
                        value={submitFormat}
                        onChange={(e) => setSubmitFormat(e.target.value)}
                        className="bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs rounded p-1.5 sm:p-2 border border-zinc-700 outline-none"
                    >
                        <option value="doc">As Doc</option>
                        <option value="pdf">As PDF</option>
                    </select>

                    {/* Submit */}
                    <Button
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={!docId}
                        size="sm"
                        variant="primary"
                        className="bg-green-600 hover:bg-green-500 text-white text-[10px] sm:text-xs px-2 sm:px-3"
                    >
                        <UploadCloud size={12} className="sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Submit to Classroom</span>
                        <span className="sm:hidden">Submit</span>
                    </Button>
                </div>
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
