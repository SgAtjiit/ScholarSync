import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import useClientSideAI from "../hooks/useClientSideAI";
import GlassCard from "../components/common/GlassCard";
import AIAssistant from "../features/workspace/AIAssistant";
import Editor from "../features/workspace/Editor";
import Flashcards from "../features/workspace/Flashcards";
import Quiz from "../features/workspace/Quiz";
import PDFViewer from "../features/workspace/PDFViewer";
import ChatWithAssignment from "../features/workspace/ChatWithAssignment";
import QuizOptionsModal from "../components/common/QuizOptionsModal";
import WorkspaceGuide from "../components/workspace/WorkspaceGuide";
import ProcessingStatus from "../components/common/ProcessingStatus";
import { FileText, ExternalLink, Loader2, Sparkles, Link as LinkIcon, FileIcon, MessageSquare, Youtube, Layout, RefreshCw, Zap, Download, BarChart2 } from "lucide-react";
import toast from 'react-hot-toast';
import Button from "../components/common/Button";
import useSEO from "../hooks/useSEO";

// Helper to parse error and extract rate limit info
const parseErrorMessage = (err) => {
  const errorText = err.response?.data?.error || err.message || '';
  const lowerText = errorText.toLowerCase();
  const statusCode = err.response?.status;
  
  // Check for rate limit error
  if (statusCode === 429 || lowerText.includes('rate_limit') || lowerText.includes('rate limit')) {
    const retryMatch = errorText.match(/try again in (\d+m?\d*\.?\d*s?)/i);
    const waitTime = retryMatch ? retryMatch[1] : '5 minutes';
    return { isRateLimit: true, message: `API rate limit exceeded. Please wait ${waitTime} and try again.` };
  }
  
  // Check for auth error
  if (statusCode === 401 || lowerText.includes('api key') || lowerText.includes('unauthorized')) {
    return { isRateLimit: false, message: 'API Key invalid or missing. Please update in Settings.' };
  }
  
  // Check for PDF encryption/access errors
  if (lowerText.includes('encrypt') || lowerText.includes('password') || lowerText.includes('protected')) {
    return { isRateLimit: false, message: '🔒 PDF is encrypted/password-protected. Cannot extract content.' };
  }
  
  // Check for access denied errors  
  if (lowerText.includes('access denied') || lowerText.includes('permission') || statusCode === 403) {
    return { isRateLimit: false, message: '🚫 Access denied to file. You may not have permission to view this file.' };
  }
  
  // Check for external organization files
  if (lowerText.includes('external organization') || lowerText.includes('external')) {
    return { isRateLimit: false, message: '🏢 File is from external organization. Cannot access.' };
  }
  
  // Check for file not found
  if (lowerText.includes('not found') || lowerText.includes('deleted') || statusCode === 404) {
    return { isRateLimit: false, message: '📄 File not found. It may have been deleted or moved.' };
  }
  
  // Check for no content extracted
  if (lowerText.includes('no content') || lowerText.includes('could not be extracted')) {
    return { isRateLimit: false, message: '📭 No content could be extracted. The PDF may be image-only or corrupted.' };
  }
  
  // Check for AI processing failure
  if (lowerText.includes('ai processing') || lowerText.includes('groq')) {
    return { isRateLimit: false, message: '🤖 AI processing failed. Please try again or check your API key.' };
  }
  
  // Generic error
  return { isRateLimit: false, message: errorText || 'An error occurred. Please try again.' };
};

const Workspace = () => {
  const { assignmentId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();

  useSEO({ 
    title: 'AI Workspace', 
    description: 'AI-powered workspace to explain, quiz, flashcard, and solve your Google Classroom assignments.' 
  });

  const [assignment, setAssignment] = useState(state?.assignment || null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('explain');
  const [activeTab, setActiveTab] = useState('ai');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [pendingQuizRegenerate, setPendingQuizRegenerate] = useState(false);

  // Client-side AI hook - THIS IS THE KEY CHANGE
  const clientAI = useClientSideAI({ userId: user?._id });

  const getMaterialLink = (m) => {
    if (m.driveFile) return m.driveFile.driveFile?.alternateLink || m.driveFile.alternateLink;
    if (m.youtubeVideo) return m.youtubeVideo.alternateLink;
    if (m.link) return m.link.url;
    if (m.form) return m.form.formUrl;
    return '#';
  };

  const getMaterialTitle = (m) => {
    if (m.driveFile) return m.driveFile.driveFile?.title || m.driveFile.title;
    if (m.youtubeVideo) return m.youtubeVideo.title;
    if (m.link) return m.link.title;
    if (m.form) return m.form.title;
    return 'Assignment Material';
  };

  const getMaterialIcon = (m) => {
    if (m.youtubeVideo) return Youtube;
    if (m.form) return Layout;
    if (m.link) return LinkIcon;
    return FileText;
  };

  // Get all document materials (PDFs, DOCX, etc.)
  const getDocumentMaterials = (materials) => {
    return materials?.filter(m => {
      const file = m.driveFile?.driveFile || m.driveFile;
      const mimeType = file?.mimeType || '';
      const title = file?.title || '';
      return mimeType.includes('pdf') ||
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        title.toLowerCase().endsWith('.pdf') ||
        title.toLowerCase().endsWith('.docx') ||
        title.toLowerCase().endsWith('.doc');
    }) || [];
  };

  const docMaterial = assignment?.materials?.find(m => {
    const file = m.driveFile?.driveFile || m.driveFile;
    const mimeType = file?.mimeType || '';
    const title = file?.title || '';
    return mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      title.toLowerCase().endsWith('.pdf') ||
      title.toLowerCase().endsWith('.docx') ||
      title.toLowerCase().endsWith('.doc');
  });
  const docFileId = docMaterial?.driveFile?.driveFile?.id || docMaterial?.driveFile?.id || null;
  
  // Get all document materials
  const allDocMaterials = getDocumentMaterials(assignment?.materials);
  
  // Set selected docs on first load (select first by default)
  if (selectedDocIds.length === 0 && allDocMaterials.length > 0) {
    const firstDocId = allDocMaterials[0].driveFile?.driveFile?.id || allDocMaterials[0].driveFile?.id;
    setSelectedDocIds([firstDocId]);
  }

  // Toggle document selection
  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  // Select all documents
  const selectAllDocs = () => {
    const allIds = allDocMaterials.map(m => m.driveFile?.driveFile?.id || m.driveFile?.id);
    setSelectedDocIds(allIds);
  };

  // Deselect all documents
  const deselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  // Load assignment data only - NO backend extraction
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Just get assignment data without extraction
        const res = await api.get(`/classroom/assignments/${user._id}`);
        const foundAssignment = res.data?.find?.(a => a._id === assignmentId);
        
        if (foundAssignment) {
          setAssignment(foundAssignment);
          
          // Set default selected docs
          const docs = getDocumentMaterials(foundAssignment.materials);
          if (docs.length > 0 && selectedDocIds.length === 0) {
            const firstDocId = docs[0].driveFile?.driveFile?.id || docs[0].driveFile?.id;
            setSelectedDocIds([firstDocId]);
          }
        } else {
          // Fallback: try direct fetch
          const directRes = await api.get(`/ai/solution/${assignmentId}`);
          if (directRes.data?.assignment) {
            setAssignment(directRes.data.assignment);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
        // If we have state assignment, use that
        if (state?.assignment) {
          setAssignment(state.assignment);
        } else {
          toast.error("Failed to load assignment");
        }
      }
    };
    if (user) init();
  }, [assignmentId, user]);

  // Auto-load from cache when selectedDocIds changes (only if single doc selected)
  useEffect(() => {
    if (selectedDocIds.length === 1 && user?._id && !clientAI.isExtracting && !clientAI.extractedContent) {
      // Try to load from cache automatically for single doc
      clientAI.loadFromCache({ fileId: selectedDocIds[0], assignmentId })
        .then(result => {
          if (result.loaded) {
            toast.success('Loaded cached content', { id: 'cache-load', duration: 2000 });
          }
        });
    }
  }, [selectedDocIds, user?._id, assignmentId]);

  // Extract content from selected documents - CLIENT-SIDE with caching
  const handleExtract = useCallback(async (forceRefresh = false) => {
    if (selectedDocIds.length === 0) {
      toast.error("No documents selected");
      return;
    }

    if (!clientAI.hasApiKey) {
      toast.error("Please set your Groq API Key in Settings first!");
      return;
    }

    // Clear previous content when starting new extraction
    clientAI.clearContent();

    const totalDocs = selectedDocIds.length;
    let allContent = [];
    let totalPages = 0;
    let totalTokens = 0;

    toast.loading(`Extracting ${totalDocs} document${totalDocs > 1 ? 's' : ''}...`, { id: 'extract' });

    try {
      for (let i = 0; i < selectedDocIds.length; i++) {
        const docId = selectedDocIds[i];
        const selectedMaterial = allDocMaterials.find(m => {
          const fileId = m.driveFile?.driveFile?.id || m.driveFile?.id;
          return fileId === docId;
        });

        const fileName = getMaterialTitle(selectedMaterial) || `document_${i + 1}`;

        toast.loading(`Extracting (${i + 1}/${totalDocs}): ${fileName}...`, { id: 'extract' });

        const result = await clientAI.extractContent({
          fileId: docId,
          fileName,
          assignmentId,
          useVision: true,
          forceRefresh,
          appendMode: i > 0, // Append to existing content for subsequent docs
        });

        totalPages += result.pageCount || 0;
        totalTokens += result.tokenEstimate || 0;
        allContent.push({ fileName, pageCount: result.pageCount });
      }

      toast.success(
        totalDocs > 1 
          ? `Extracted ${totalDocs} documents (${totalPages} pages, ~${Math.round(totalTokens / 1000)}k tokens)` 
          : `Extracted ${totalPages} pages (~${Math.round(totalTokens / 1000)}k tokens)`,
        { id: 'extract' }
      );

    } catch (error) {
      toast.error(error.message, { id: 'extract' });
    }
  }, [selectedDocIds, clientAI, allDocMaterials, assignmentId]);

  // Generate AI content - CLIENT-SIDE
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
        forceRefresh: forceRegenerate,
      });

      if (result.cached) {
        toast.success(`Loaded ${mode} from cache!`, { id: toastId });
      } else {
        toast.success(
          `Generated ${mode}! (${result.tokens?.output || 0} tokens used)`, 
          { id: toastId }
        );
      }

    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  }, [clientAI, assignment, assignmentId]);

  const handleRegenerate = () => {
    handleGenerate(activeMode, true);
  };

  // Callback for quiz modal
  const handleQuizGenerate = (options) => {
    setShowQuizModal(false);
    handleGenerate('quiz', pendingQuizRegenerate, options);
  };

  // Get current solution from client-side state
  const currentSolution = clientAI.getContent(activeMode);
  const generating = clientAI.isGenerating;

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-zinc-500 gap-3">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-lg font-medium text-zinc-300">Loading assignment...</p>
        <p className="text-sm text-zinc-600">Please wait while we fetch the details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] px-2 sm:px-0">
      {/* Processing Status Overlay - CLIENT-SIDE FEEDBACK */}
      <ProcessingStatus
        isExtracting={clientAI.isExtracting}
        extractionProgress={clientAI.extractionProgress}
        extractionError={clientAI.extractionError}
        isGenerating={clientAI.isGenerating}
        generatingMode={clientAI.generatingMode}
        generationError={clientAI.generationError}
        rateLimiterState={clientAI.rateLimiterState}
      />

      {/* Left Sidebar - Scrollable */}
      <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 lg:h-full lg:overflow-hidden">
        <GlassCard className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-y-auto custom-scrollbar" hoverEffect={false}>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2 line-clamp-2">{assignment?.title}</h1>
            <p className="text-[10px] sm:text-xs text-zinc-500">{assignment?.courseName}</p>
          </div>

          {/* Extract Button - NEW CLIENT-SIDE EXTRACTION with caching */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExtract(!!clientAI.extractedContent)}
              disabled={clientAI.isExtracting || clientAI.isLoadingCache || selectedDocIds.length === 0}
              className="flex-1"
              size="sm"
            >
              {clientAI.isExtracting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Extracting...
                </>
              ) : clientAI.isLoadingCache ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Loading cache...
                </>
              ) : clientAI.extractedContent ? (
                <>
                  <RefreshCw size={14} className="mr-2" />
                  Re-Extract
                </>
              ) : (
                <>
                  <Download size={14} className="mr-2" />
                  {selectedDocIds.length > 1 ? `Extract ${selectedDocIds.length} Docs` : 'Extract Content'}
                </>
              )}
            </Button>
          </div>

          {/* Extraction Status */}
          {clientAI.extractedContent && (
            <div className="p-2 sm:p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex flex-col gap-1 text-green-400 text-xs">
                <div className="flex items-center gap-2">
                  <Zap size={12} />
                  <span>
                    {clientAI.extractedContent.pageCount} pages 
                    {clientAI.extractedContent.documents?.length > 1 && ` from ${clientAI.extractedContent.documents.length} docs`}
                    {clientAI.isCached && ' (cached)'} 
                    ({Math.round(clientAI.extractedContent.tokenEstimate / 1000)}k tokens)
                  </span>
                </div>
                {clientAI.extractedContent.documents?.length > 1 && (
                  <div className="text-[9px] text-green-500/70 ml-5">
                    {clientAI.extractedContent.documents.map(d => d.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Materials */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Original Files</p>
            <div className="flex flex-col gap-2">
              {assignment?.materials?.length > 0 ? (
                assignment.materials.map((m, i) => {
                  const MatIcon = getMaterialIcon(m);
                  return (
                    <a
                      key={i}
                      href={getMaterialLink(m)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-indigo-500/50 transition-all group"
                    >
                      <div className="p-1.5 sm:p-2 bg-zinc-900 rounded-lg text-indigo-400 group-hover:text-white transition-colors flex-shrink-0">
                        <MatIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-zinc-200 truncate">{getMaterialTitle(m)}</p>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 flex items-center gap-1">
                          Open <ExternalLink size={8} />
                        </p>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="text-xs text-zinc-500 italic p-2">No attachments found.</div>
              )}

              {assignment?.alternateLink && (
                <a
                  href={assignment.alternateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] sm:text-xs font-medium transition-colors border border-indigo-500/20"
                >
                  <LinkIcon size={12} />
                  View on Classroom
                </a>
              )}
            </div>
          </div>

          <div className="mt-2 h-px bg-zinc-800 w-full"></div>
          <div className="text-xs text-zinc-500">
            {assignment?.description || "No text description."}
          </div>

          {/* Document Selector for Multiple PDFs */}
          {allDocMaterials.length > 0 && (
            <>
              <div className="mt-4 h-px bg-zinc-800 w-full"></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    📄 Select Documents for AI
                  </p>
                  {allDocMaterials.length > 1 && (
                    <div className="flex gap-1">
                      <button
                        onClick={selectAllDocs}
                        disabled={clientAI.isExtracting}
                        className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={deselectAllDocs}
                        disabled={clientAI.isExtracting}
                        className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 italic">
                  {allDocMaterials.length > 1 
                    ? `Select one or more documents (${selectedDocIds.length} selected):`
                    : 'Document to process:'}
                </p>
                <div className="flex flex-col gap-2">
                  {allDocMaterials.map((doc, idx) => {
                    const docId = doc.driveFile?.driveFile?.id || doc.driveFile?.id;
                    const docTitle = doc.driveFile?.driveFile?.title || doc.driveFile?.title || `Document ${idx + 1}`;
                    const isSelected = selectedDocIds.includes(docId);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-2 rounded-lg text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 text-white border border-indigo-500/50'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-indigo-500/30'
                        } ${clientAI.isExtracting || clientAI.isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDocSelection(docId)}
                          disabled={clientAI.isExtracting || clientAI.isGenerating}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{docTitle}</span>
                          <p className="text-[8px] text-zinc-400 mt-0.5">
                            Click to {isSelected ? 'deselect' : 'select'}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-[8px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded shrink-0">
                            ✓
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {selectedDocIds.length === 0 && (
                  <p className="text-[9px] text-amber-400 mt-1">
                    ⚠️ Select at least one document to extract
                  </p>
                )}
              </div>
            </>
          )}
        </GlassCard>
        
        {/* AI Tools - Horizontal scroll on mobile, vertical on desktop */}
        <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar">
          <AIAssistant 
            activeMode={activeMode} 
            onGenerate={handleGenerate} 
            generating={clientAI.isGenerating} 
            hasSolution={(mode) => clientAI.hasContent(mode)} 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-8 flex-1 lg:h-full flex flex-col min-h-[60vh] lg:min-h-0">
        {/* Workspace Guide - Always visible at top */}
        <div className="mb-3 sm:mb-4">
          <WorkspaceGuide />
        </div>

        {/* Tab Buttons - Scrollable */}
        <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-hide">
          <button onClick={() => setActiveTab('ai')} className={`px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <span className="flex items-center gap-1.5 sm:gap-2"><Sparkles size={14} /><span className="hidden xs:inline">AI</span> Response</span>
          </button>
          {docFileId && (
            <button onClick={() => setActiveTab('pdf')} className={`px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              <span className="flex items-center gap-1.5 sm:gap-2"><FileIcon size={14} /><span className="hidden sm:inline">Document</span> Viewer</span>
            </button>
          )}
          <button onClick={() => setActiveTab('chat')} className={`px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <span className="flex items-center gap-1.5 sm:gap-2"><MessageSquare size={14} />Chat</span>
          </button>
        </div>

        <div className="flex-1 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl min-h-[50vh] lg:min-h-0">
          {activeTab === 'ai' && (
            <>
              {!currentSolution && !generating && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full p-6">
                  <Sparkles className="w-16 h-16 mb-4 text-zinc-700" />
                  <p className="text-lg font-medium text-zinc-300 mb-2">
                    {clientAI.extractedContent ? "Ready to generate!" : "Extract content first"}
                  </p>
                  <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
                    {clientAI.extractedContent 
                      ? "Select an AI tool from the left panel to get started."
                      : "Click the 'Extract Content' button to analyze the document in your browser."
                    }
                  </p>
                  
                  {/* Quick start tips */}
                  <div className="bg-zinc-800/50 rounded-lg p-4 max-w-md space-y-3 border border-zinc-700">
                    <p className="text-xs font-semibold text-zinc-300">📌 Quick Tips:</p>
                    <ul className="text-xs text-zinc-400 space-y-2">
                      <li className="flex gap-2">
                        <span>1️⃣</span>
                        <span><strong className="text-indigo-400">Extract</strong> the document content first (runs in browser)</span>
                      </li>
                      <li className="flex gap-2">
                        <span>2️⃣</span>
                        <span>Click <strong className="text-indigo-400">Explain</strong> to understand concepts</span>
                      </li>
                      <li className="flex gap-2">
                        <span>3️⃣</span>
                        <span>Use <strong className="text-indigo-400">Chat</strong> tab for specific questions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              {generating && (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 animate-pulse h-full">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="mb-2">Generating {clientAI.generatingMode}...</p>
                  <p className="text-xs text-zinc-500">Processing directly in your browser</p>
                </div>
              )}
              {currentSolution && !generating && (
                <>
                  {activeMode === 'quiz' && (<div className="h-full overflow-y-auto custom-scrollbar"><Quiz content={currentSolution} onRegenerate={handleRegenerate} /></div>)}
                  {activeMode === 'flashcards' && (<div className="h-full overflow-y-auto custom-scrollbar"><Flashcards content={currentSolution} onRegenerate={handleRegenerate} /></div>)}
                  {activeMode === 'explain' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                      <div className="flex justify-end mb-4">
                        <Button size="sm" variant="secondary" onClick={handleRegenerate}>
                          <RefreshCw size={14} className="mr-2" /> Regenerate
                        </Button>
                      </div>
                      <div className="prose prose-invert prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: currentSolution }} />
                    </div>
                  )}
                  {activeMode === 'draft' && (<Editor initialContent={currentSolution} assignmentId={assignmentId} onRegenerate={handleRegenerate} />)}
                </>
              )}
            </>
          )}
          {activeTab === 'pdf' && <PDFViewer pdfFileId={selectedDocIds[0] || docFileId} />}
          {activeTab === 'chat' && (
            <ChatWithAssignment 
              assignmentId={assignmentId} 
              assignmentTitle={assignment?.title}
              extractedContent={clientAI.extractedContent?.content}
            />
          )}
        </div>
      </div>

      {/* Quiz Options Modal */}
      <QuizOptionsModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onGenerate={handleQuizGenerate}
        isGenerating={generating}
      />
    </div>
  );
};

export default Workspace;