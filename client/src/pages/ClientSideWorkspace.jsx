/**
 * ClientSideWorkspace
 * 
 * This is an example of how to refactor the Workspace component
 * to use client-side AI processing instead of backend processing.
 * 
 * Key changes from the original:
 * 1. Uses useClientSideAI hook for all AI operations
 * 2. PDF extraction happens in the browser using pdfjs-dist
 * 3. Groq API calls are made directly from the frontend
 * 4. Rate limiting and usage tracking are handled client-side
 * 
 * MIGRATION GUIDE:
 * Replace your existing Workspace.jsx with this component, or
 * integrate the changes gradually:
 * 
 * 1. Add the useClientSideAI hook
 * 2. Replace api.post('/ai/generate') calls with clientAI.generate()
 * 3. Add extraction step before generation
 * 4. Add ProcessingStatus component for visual feedback
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useClientSideAI from "../hooks/useClientSideAI";
import api from "../api/axios";
import GlassCard from "../components/common/GlassCard";
import AIAssistant from "../features/workspace/AIAssistant";
import DocEditor from "../features/workspace/DocEditor";
import Editor from "../features/workspace/Editor";
import Flashcards from "../features/workspace/Flashcards";
import Quiz from "../features/workspace/Quiz";
import PDFViewer from "../features/workspace/PDFViewer";
import ChatWithAssignment from "../features/workspace/ChatWithAssignment";
import QuizOptionsModal from "../components/common/QuizOptionsModal";
import ProcessingStatus from "../components/common/ProcessingStatus";
import ApiUsageDashboard from "../components/dashboard/ApiUsageDashboard";
import { 
    FileText, ExternalLink, Loader2, Sparkles, 
    Link as LinkIcon, FileIcon, MessageSquare, Youtube, 
    Layout, RefreshCw, Zap, BarChart2 
} from "lucide-react";
import toast from 'react-hot-toast';
import Button from "../components/common/Button";
import useSEO from "../hooks/useSEO";

const ClientSideWorkspace = () => {
    const { assignmentId } = useParams();
    const { state } = useLocation();
    const { user } = useAuth();

    useSEO({ 
        title: 'AI Workspace', 
        description: 'AI-powered workspace with client-side processing' 
    });

    // Basic state
    const [assignment, setAssignment] = useState(state?.assignment || null);
    const [loading, setLoading] = useState(true);
    const [activeMode, setActiveMode] = useState('explain');
    const [activeTab, setActiveTab] = useState('ai');
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [pendingQuizRegenerate, setPendingQuizRegenerate] = useState(false);
    const [showUsagePanel, setShowUsagePanel] = useState(false);

    // Client-side AI hook
    const clientAI = useClientSideAI({ userId: user?._id });

    // Material helpers
    const getMaterialTitle = (m) => {
        if (m.driveFile) return m.driveFile.driveFile?.title || m.driveFile.title;
        if (m.youtubeVideo) return m.youtubeVideo.title;
        if (m.link) return m.link.title;
        if (m.form) return m.form.title;
        return 'Assignment Material';
    };

    const getDocumentMaterials = (materials) => {
        return materials?.filter(m => {
            const file = m.driveFile?.driveFile || m.driveFile;
            const mimeType = file?.mimeType || '';
            const title = file?.title || '';
            return mimeType.includes('pdf') ||
                mimeType.includes('document') ||
                title.toLowerCase().endsWith('.pdf') ||
                title.toLowerCase().endsWith('.docx');
        }) || [];
    };

    const allDocMaterials = getDocumentMaterials(assignment?.materials);
    const hasMultipleDocs = allDocMaterials.length > 1;

    // Initialize - just load assignment data, don't extract on backend
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                
                // Just get the assignment data without extraction
                const res = await api.get(`/classroom/assignments/${user._id}?assignmentId=${assignmentId}`);
                const foundAssignment = res.data?.find?.(a => a._id === assignmentId) || res.data;
                
                if (foundAssignment) {
                    setAssignment(foundAssignment);
                    
                    // Set default selected doc
                    const docs = getDocumentMaterials(foundAssignment.materials);
                    if (docs.length > 0) {
                        const firstDocId = docs[0].driveFile?.driveFile?.id || docs[0].driveFile?.id;
                        setSelectedDocId(firstDocId);
                    }
                }

                // Load any previously saved solutions
                try {
                    const solutionsRes = await api.get(`/ai/solutions/${assignmentId}`);
                    if (solutionsRes.data) {
                        // Populate client AI state with saved solutions
                        // (You'd need to extend the hook to support this)
                    }
                } catch {
                    // No saved solutions, that's fine
                }

                setLoading(false);
            } catch (err) {
                console.error("Init error:", err);
                setLoading(false);
                toast.error("Failed to load assignment");
            }
        };
        
        if (user) init();
    }, [assignmentId, user]);

    /**
     * Extract content from the selected document
     * This happens client-side using pdfjs-dist
     */
    const handleExtract = useCallback(async () => {
        if (!selectedDocId) {
            toast.error("No document selected");
            return;
        }

        if (!clientAI.hasApiKey) {
            toast.error("Please set your Groq API Key in Settings first!");
            return;
        }

        const selectedMaterial = allDocMaterials.find(m => {
            const fileId = m.driveFile?.driveFile?.id || m.driveFile?.id;
            return fileId === selectedDocId;
        });

        const fileName = getMaterialTitle(selectedMaterial) || 'document';

        toast.loading("Extracting document content...", { id: 'extract' });

        try {
            const result = await clientAI.extractContent({
                fileId: selectedDocId,
                fileName,
                useVision: true, // Use vision API for images
            });

            toast.success(`Extracted ${result.pageCount} pages (${result.tokenEstimate} tokens est.)`, { id: 'extract' });

            // Optionally save to backend for caching
            await api.post('/ai/save-extracted', {
                assignmentId,
                content: result.content,
                pageCount: result.pageCount,
                hasImages: result.hasImages,
                tokenEstimate: result.tokenEstimate,
            }).catch(() => {}); // Silent fail for cache

        } catch (error) {
            toast.error(error.message, { id: 'extract' });
        }
    }, [selectedDocId, clientAI, allDocMaterials, assignmentId]);

    /**
     * Generate AI content (draft, explain, quiz, flashcards)
     * This happens entirely client-side
     */
    const handleGenerate = useCallback(async (mode, forceRegenerate = false, quizOptions = null) => {
        setActiveMode(mode);

        // Check if content already exists
        if (clientAI.hasContent(mode) && !forceRegenerate) {
            return;
        }

        // API key check
        if (!clientAI.hasApiKey) {
            toast.error("Please set your Groq API Key in Settings first!");
            return;
        }

        // Extract content first if not done
        if (!clientAI.extractedContent) {
            toast.error("Please extract document content first using the Extract button");
            return;
        }

        // Quiz options modal
        if (mode === 'quiz' && !quizOptions) {
            setPendingQuizRegenerate(forceRegenerate);
            setShowQuizModal(true);
            return;
        }

        const toastId = toast.loading(
            forceRegenerate ? "Regenerating with AI..." : "Generating with AI..."
        );

        try {
            const result = await clientAI.generate({
                mode,
                quizOptions: mode === 'quiz' ? quizOptions : undefined,
                assignmentTitle: assignment?.title,
                courseName: assignment?.courseName,
            });

            toast.success(
                `Generated ${mode}! (${result.tokens?.output || 0} tokens)`, 
                { id: toastId }
            );

            // Save to backend for persistence
            await clientAI.saveToBackend({
                assignmentId,
                mode,
                content: result.content,
            }).catch(() => {}); // Silent fail

        } catch (error) {
            toast.error(error.message, { id: toastId });
        }
    }, [clientAI, assignment, assignmentId]);

    const handleQuizGenerate = (options) => {
        setShowQuizModal(false);
        handleGenerate('quiz', pendingQuizRegenerate, options);
    };

    const currentSolution = clientAI.getContent(activeMode);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-zinc-500 gap-3">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-lg font-medium text-zinc-300">Loading assignment...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-8rem)] px-2 sm:px-0">
            {/* Processing Status Overlay */}
            <ProcessingStatus
                isExtracting={clientAI.isExtracting}
                extractionProgress={clientAI.extractionProgress}
                extractionError={clientAI.extractionError}
                isGenerating={clientAI.isGenerating}
                generatingMode={clientAI.generatingMode}
                generationError={clientAI.generationError}
                rateLimiterState={clientAI.rateLimiterState}
            />

            {/* Left Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6">
                <GlassCard className="flex flex-col gap-4" hoverEffect={false}>
                    {/* Assignment Info */}
                    <div>
                        <h1 className="text-lg font-bold text-white mb-2 line-clamp-2">
                            {assignment?.title}
                        </h1>
                        <p className="text-xs text-zinc-500">{assignment?.courseName}</p>
                    </div>

                    {/* Extract Button */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleExtract}
                            disabled={clientAI.isExtracting || !selectedDocId}
                            className="flex-1"
                        >
                            {clientAI.isExtracting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin mr-2" />
                                    Extracting...
                                </>
                            ) : clientAI.extractedContent ? (
                                <>
                                    <RefreshCw size={14} className="mr-2" />
                                    Re-Extract
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} className="mr-2" />
                                    Extract Content
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowUsagePanel(!showUsagePanel)}
                            title="API Usage"
                        >
                            <BarChart2 size={14} />
                        </Button>
                    </div>

                    {/* Extraction Status */}
                    {clientAI.extractedContent && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <Zap size={14} />
                                <span>
                                    {clientAI.extractedContent.pageCount} pages extracted 
                                    ({Math.round(clientAI.extractedContent.tokenEstimate / 1000)}k tokens)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Usage Panel (collapsible) */}
                    {showUsagePanel && (
                        <ApiUsageDashboard compact={false} />
                    )}

                    <div className="h-px bg-zinc-800" />

                    {/* AI Tools */}
                    <AIAssistant
                        activeMode={activeMode}
                        onGenerate={handleGenerate}
                        generating={clientAI.isGenerating}
                        hasSolution={(mode) => clientAI.hasContent(mode)}
                    />
                </GlassCard>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 flex flex-col gap-4">
                {/* Tab Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['ai', 'pdf', 'chat'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {tab === 'ai' && 'AI Output'}
                            {tab === 'pdf' && 'Document'}
                            {tab === 'chat' && 'Chat'}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <GlassCard className="flex-1 min-h-[500px] overflow-hidden">
                    {activeTab === 'ai' && (
                        <div className="h-full overflow-auto p-4">
                            {!currentSolution ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                    <Sparkles size={48} className="mb-4 text-zinc-600" />
                                    <p className="text-lg font-medium">
                                        {clientAI.extractedContent 
                                            ? "Select an AI tool to generate content"
                                            : "Extract document content first"}
                                    </p>
                                    <p className="text-sm text-zinc-600 mt-2">
                                        {clientAI.extractedContent 
                                            ? "Choose Draft, Explain, Quiz, or Flashcards"
                                            : "Click the 'Extract Content' button to analyze the document"}
                                    </p>
                                </div>
                            ) : activeMode === 'quiz' ? (
                                <Quiz 
                                    content={currentSolution} 
                                    onRegenerate={() => handleGenerate('quiz', true)}
                                />
                            ) : activeMode === 'flashcards' ? (
                                <Flashcards content={currentSolution} />
                            ) : activeMode === 'draft' ? (
                                <DocEditor 
                                    initialContent={currentSolution} 
                                    assignmentId={assignmentId}
                                    assignmentTitle={assignment?.title}
                                    courseName={assignment?.courseName}
                                    onRegenerate={() => handleGenerate('draft', true)}
                                />
                            ) : (
                                <Editor 
                                    content={currentSolution} 
                                    mode={activeMode}
                                    onRegenerate={() => handleGenerate(activeMode, true)}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'pdf' && selectedDocId && (
                        <PDFViewer fileId={selectedDocId} userId={user._id} />
                    )}

                    {activeTab === 'chat' && (
                        <ChatWithAssignment 
                            assignmentId={assignmentId}
                            extractedContent={clientAI.extractedContent?.content}
                        />
                    )}
                </GlassCard>
            </div>

            {/* Quiz Options Modal */}
            {showQuizModal && (
                <QuizOptionsModal
                    onClose={() => setShowQuizModal(false)}
                    onGenerate={handleQuizGenerate}
                />
            )}
        </div>
    );
};

export default ClientSideWorkspace;
