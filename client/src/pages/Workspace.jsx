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
import { FileText, ExternalLink, Loader2, Sparkles, Link as LinkIcon, FileIcon, MessageSquare, Youtube, Layout, RefreshCw } from "lucide-react";
import toast from 'react-hot-toast';
import Button from "../components/common/Button";

// Helper to parse error and extract rate limit info
const parseErrorMessage = (err) => {
  const errorText = err.response?.data?.error || err.message || '';
  
  // Check for rate limit error
  if (err.response?.status === 429 || errorText.includes('rate_limit') || errorText.includes('Rate limit')) {
    // Extract wait time if available
    const retryMatch = errorText.match(/try again in (\d+m?\d*\.?\d*s?)/i);
    const waitTime = retryMatch ? retryMatch[1] : '5 minutes';
    return { isRateLimit: true, message: `API rate limit exceeded. Please wait ${waitTime} and try again.` };
  }
  
  // Check for auth error
  if (err.response?.status === 401) {
    return { isRateLimit: false, message: 'Authentication failed. Please check your API Key.' };
  }
  
  // Generic error
  return { isRateLimit: false, message: 'An error occurred. Please try again.' };
};

const Workspace = () => {
  const { assignmentId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();

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

        // Show warnings about files that couldn't be accessed
        if (res.data.warnings && res.data.warnings.length > 0) {
          toast(`Some files couldn't be accessed: ${res.data.warnings.length} file(s)`, {
            icon: '⚠️',
            duration: 5000
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      <div className="md:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
        <GlassCard className="flex-shrink-0 flex flex-col gap-4" hoverEffect={false}>
          <div>
            <h1 className="text-lg font-bold text-white mb-2 line-clamp-2">{assignment?.title}</h1>
            <p className="text-xs text-zinc-500">{assignment?.courseName}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Original Files</p>
            {assignment?.materials?.length > 0 ? (
              assignment.materials.map((m, i) => {
                const MatIcon = getMaterialIcon(m);
                return (
                  <a
                    key={i}
                    href={getMaterialLink(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="p-2 bg-zinc-900 rounded-lg text-indigo-400 group-hover:text-white transition-colors">
                      <MatIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{getMaterialTitle(m)}</p>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        Open Drive Link <ExternalLink size={8} />
                      </p>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="text-xs text-zinc-500 italic p-2">No attachments found.</div>
            )}

            {/* View on Classroom Link moved here, after the list */}
            {assignment?.alternateLink && (
              <a
                href={assignment.alternateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors border border-indigo-500/20"
              >
                <LinkIcon size={12} />
                View on Google Classroom
              </a>
            )}
          </div>

          <div className="mt-2 h-px bg-zinc-800 w-full"></div>
          <div className="text-xs text-zinc-500 max-h-32 overflow-y-auto custom-scrollbar">
            {assignment?.description || "No text description."}
          </div>

          {/* Document Selector for Multiple PDFs */}
          {hasMultipleDocs && (
            <>
              <div className="mt-4 h-px bg-zinc-800 w-full"></div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  📄 Select Document for AI
                </p>
                <p className="text-[9px] text-zinc-500 italic">
                  Found {allDocMaterials.length} documents. Choose which one to use for generating solutions:
                </p>
                <div className="flex flex-col gap-2">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AIAssistant activeMode={activeMode} onGenerate={handleGenerate} generating={generating} hasSolution={(mode) => !!solutions[mode]} />
        </div>
      </div>

      <div className="md:col-span-8 h-full flex flex-col">
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <span className="flex items-center gap-2"><Sparkles size={16} />AI Response</span>
          </button>
          {docFileId && (
            <button onClick={() => setActiveTab('pdf')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              <span className="flex items-center gap-2"><FileIcon size={16} />Document Viewer</span>
            </button>
          )}
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <span className="flex items-center gap-2"><MessageSquare size={16} />Chat with Assignment</span>
          </button>
        </div>

        <div className="flex-1 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          {activeTab === 'ai' && (
            <>
              {!currentSolution && !generating && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full">
                  <Sparkles className="w-16 h-16 mb-4 text-zinc-800" />
                  <p className="text-lg font-medium text-zinc-400">Select an AI tool to begin.</p>
                  <p className="text-sm">We have analyzed the materials.</p>
                </div>
              )}
              {generating && (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 animate-pulse h-full">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p>Generating Solution...</p>
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