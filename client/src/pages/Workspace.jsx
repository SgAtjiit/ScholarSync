import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import GlassCard from "../components/common/GlassCard";
import AIAssistant from "../features/workspace/AIAssistant";
import Editor from "../features/workspace/Editor";
import Flashcards from "../features/workspace/Flashcards";
import Quiz from "../features/workspace/Quiz";
import PDFViewer from "../features/workspace/PDFViewer";
import ChatWithAssignment from "../features/workspace/ChatWithAssignment";
import QuizOptionsModal from "../components/common/QuizOptionsModal";
import WorkspaceGuide from "../components/workspace/WorkspaceGuide";
import { FileText, ExternalLink, Loader2, Sparkles, Link as LinkIcon, FileIcon, MessageSquare, Youtube, Layout, RefreshCw } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('explain');
  const [solutions, setSolutions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [pendingQuizRegenerate, setPendingQuizRegenerate] = useState(false);

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
  const hasMultipleDocs = allDocMaterials.length > 1;
  
  // Set selected doc on first load
  if (!selectedDocId && allDocMaterials.length > 0) {
    setSelectedDocId(allDocMaterials[0].driveFile?.driveFile?.id || allDocMaterials[0].driveFile?.id);
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/classroom/assignments/${assignmentId}/extract`, { userId: user._id });
        setAssignment(res.data.assignment);
        setLoading(false);

        // Show success message
        if (res.data.message === "Extraction complete") {
          toast.success("Ready for AI! Text extraction completed.");
        }

        // Show detailed warnings about files that couldn't be accessed
        if (res.data.warnings && res.data.warnings.length > 0) {
          res.data.warnings.forEach((warning, idx) => {
            // Delay each toast to avoid flooding
            setTimeout(() => {
              const lowerWarning = warning.toLowerCase();
              let icon = '⚠️';
              let message = warning;
              
              // Format message based on error type
              if (lowerWarning.includes('encrypt') || lowerWarning.includes('password')) {
                icon = '🔒';
                message = 'PDF is encrypted/password-protected';
              } else if (lowerWarning.includes('access denied') || lowerWarning.includes('permission')) {
                icon = '🚫';
                message = 'No permission to access file';
              } else if (lowerWarning.includes('external')) {
                icon = '🏢';
                message = 'File from external organization';
              } else if (lowerWarning.includes('not found')) {
                icon = '📄';
                message = 'File not found or deleted';
              }
              
              toast(message, {
                icon,
                duration: 6000,
                style: {
                  border: '1px solid #f97316',
                  background: '#18181b',
                  color: '#fdba74',
                }
              });
            }, idx * 1000);
          });
        }

        const draftRes = await api.get(`/ai/solutions/${assignmentId}?preferredMode=draft`);
        if (draftRes.data) {
          setSolutions(prev => ({ ...prev, [draftRes.data.mode]: draftRes.data }));
          if (draftRes.data.mode === 'draft') setActiveMode('draft');
        }
      } catch (err) {
        console.error("Extraction error:", err);
        setLoading(false);
        const { message } = parseErrorMessage(err);
        toast.error(message);
      }
    };
    if (user) init();
  }, [assignmentId, user]);


  const handleGenerate = async (mode, forceRegenerate = false, quizOptions = null) => {
    setActiveMode(mode);
    
    // If multiple documents exist, show selector
    if (hasMultipleDocs && !selectedDocId) {
      toast.error("Please select a document first from the Document Viewer tab");
      setActiveTab('pdf');
      return;
    }

    if (solutions[mode] && !forceRegenerate) return;

    if (!localStorage.getItem('groq_api_key')) {
      toast.error("You need to set your Groq API Key in Settings first!");
      return;
    }

    // For quiz mode, show the options modal instead of alert
    if (mode === 'quiz' && !quizOptions) {
      setPendingQuizRegenerate(forceRegenerate);
      setShowQuizModal(true);
      return;
    }

    setGenerating(true);
    const toastId = toast.loading(forceRegenerate ? "Regenerating with AI..." : "Generating with AI...");

    try {
      const res = await api.post('/ai/generate', {
        assignmentId, 
        userId: user._id, 
        mode, 
        questionCount: quizOptions?.questionCount || 5,
        difficulty: quizOptions?.difficulty || 'medium',
        questionType: quizOptions?.questionType || 'mixed',
        selectedDocId
      });
      setSolutions(prev => ({ ...prev, [mode]: res.data }));
      toast.success(forceRegenerate ? "Content regenerated!" : "Content generated successfully!", { id: toastId });
    } catch (err) {
      console.error('Generation error:', err);
      const { message } = parseErrorMessage(err);
      toast.error(message, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate(activeMode, true);
  };

  // Callback for quiz modal
  const handleQuizGenerate = (options) => {
    setShowQuizModal(false);
    handleGenerate('quiz', pendingQuizRegenerate, options);
  };

  const currentSolution = solutions[activeMode];

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-zinc-500 gap-3">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-lg font-medium text-zinc-300">Extracting assignment content...</p>
        <p className="text-sm text-zinc-600">Please wait while we analyze the materials</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] px-2 sm:px-0">
      {/* Left Sidebar - Collapsible on mobile */}
      <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 lg:h-full lg:overflow-hidden">
        <GlassCard className="flex-shrink-0 flex flex-col gap-3 sm:gap-4 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar" hoverEffect={false}>
          <div className="flex-shrink-0">
            <h1 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2 line-clamp-2">{assignment?.title}</h1>
            <p className="text-[10px] sm:text-xs text-zinc-500">{assignment?.courseName}</p>
          </div>
          
          {/* Materials - Scrollable */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Original Files</p>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar">
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

          <div className="flex-shrink-0 mt-2 h-px bg-zinc-800 w-full"></div>
          <div className="text-xs text-zinc-500 max-h-32 overflow-y-auto custom-scrollbar flex-shrink-0">
            {assignment?.description || "No text description."}
          </div>

          {/* Document Selector for Multiple PDFs */}
          {hasMultipleDocs && (
            <>
              <div className="flex-shrink-0 mt-4 h-px bg-zinc-800 w-full"></div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  📄 Select Document for AI
                </p>
                <p className="text-[9px] text-zinc-500 italic">
                  Found {allDocMaterials.length} documents. Choose which one to use for generating solutions:
                </p>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {allDocMaterials.map((doc, idx) => {
                    const docId = doc.driveFile?.driveFile?.id || doc.driveFile?.id;
                    const docTitle = doc.driveFile?.driveFile?.title || doc.driveFile?.title || `Document ${idx + 1}`;
                    const isSelected = selectedDocId === docId;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedDocId(docId);
                          setActiveTab('pdf');
                          toast.success(`Selected: ${docTitle}`);
                        }}
                        className={`text-left p-2 rounded-lg text-xs transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border border-indigo-400'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-indigo-500/50'
                        }`}
                      >
                        <span className="font-medium">{isSelected ? '✓ ' : ''}{docTitle}</span>
                        <p className="text-[8px] text-zinc-400 mt-1">
                          {isSelected ? 'Currently selected' : 'Click to select & view'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </GlassCard>
        
        {/* AI Tools - Horizontal scroll on mobile, vertical on desktop */}
        <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar">
          <AIAssistant activeMode={activeMode} onGenerate={handleGenerate} generating={generating} hasSolution={(mode) => !!solutions[mode]} />
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
                  <p className="text-lg font-medium text-zinc-300 mb-2">Ready to generate!</p>
                  <p className="text-sm text-zinc-500 text-center max-w-md mb-6">We've analyzed your assignment materials. Select an AI tool from the left panel to get started.</p>
                  
                  {/* Quick start tips */}
                  <div className="bg-zinc-800/50 rounded-lg p-4 max-w-md space-y-3 border border-zinc-700">
                    <p className="text-xs font-semibold text-zinc-300">📌 Quick Tips:</p>
                    <ul className="text-xs text-zinc-400 space-y-2">
                      <li className="flex gap-2">
                        <span>1️⃣</span>
                        <span>Click <strong className="text-indigo-400">Explain</strong> to understand the assignment concepts</span>
                      </li>
                      <li className="flex gap-2">
                        <span>2️⃣</span>
                        <span>Try <strong className="text-indigo-400">Quiz</strong> to test your understanding</span>
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
                  <p className="mb-2">Generating Solution...</p>
                  <p className="text-xs text-zinc-500">This may take a few seconds</p>
                </div>
              )}
              {currentSolution && !generating && (
                <>
                  {activeMode === 'quiz' && (<div className="h-full overflow-y-auto custom-scrollbar"><Quiz content={currentSolution.content} onRegenerate={handleRegenerate} /></div>)}
                  {activeMode === 'flashcards' && (<div className="h-full overflow-y-auto custom-scrollbar"><Flashcards content={currentSolution.content} onRegenerate={handleRegenerate} /></div>)}
                  {activeMode === 'explain' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                      <div className="flex justify-end mb-4">
                        <Button size="sm" variant="secondary" onClick={handleRegenerate}>
                          <RefreshCw size={14} className="mr-2" /> Regenerate
                        </Button>
                      </div>
                      <div className="prose prose-invert prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: currentSolution.content }} />
                    </div>
                  )}
                  {activeMode === 'draft' && (<Editor initialContent={currentSolution.editedContent || currentSolution.content} solutionId={currentSolution._id} onRegenerate={handleRegenerate} />)}
                </>
              )}
            </>
          )}
          {activeTab === 'pdf' && <PDFViewer pdfFileId={docFileId} />}
          {activeTab === 'chat' && <ChatWithAssignment assignmentId={assignmentId} assignmentTitle={assignment?.title} />}
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