import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import useClientSideAI from "../hooks/useClientSideAI";
import GlassCard from "../components/common/GlassCard";
import AIAssistant from "../features/workspace/AIAssistant";
import DocEditor from "../features/workspace/DocEditor";
import Flashcards from "../features/workspace/Flashcards";
import Quiz from "../features/workspace/Quiz";
import PDFViewer from "../features/workspace/PDFViewer";
import SocraticStudyPanel from "../features/workspace/SocraticStudyPanel";
import QuizOptionsModal from "../components/common/QuizOptionsModal";
import WorkspaceGuide from "../components/workspace/WorkspaceGuide";
import ProcessingStatus from "../components/common/ProcessingStatus";
import { FileText, ExternalLink, Loader2, Sparkles, Link as LinkIcon, FileIcon, Youtube, Layout, RefreshCw, Zap, Download, BarChart2, ChevronLeft, ChevronRight, Brain, Plus } from "lucide-react";
import toast from 'react-hot-toast';
import Button from "../components/common/Button";
import useSEO from "../hooks/useSEO";

// Helper to parse error and extract rate limit info
const parseErrorMessage = (err) => {
  const errorText = err.response?.data?.error || err.message || '';
  const lowerText = errorText.toLowerCase();
  const statusCode = err.response?.status;
  
  if (statusCode === 429 || lowerText.includes('rate_limit') || lowerText.includes('rate limit')) {
    const retryMatch = errorText.match(/try again in (\d+m?\d*\.?\d*s?)/i);
    const waitTime = retryMatch ? retryMatch[1] : '5 minutes';
    return { isRateLimit: true, message: `API rate limit exceeded. Please wait ${waitTime} and try again.` };
  }
  
  if (statusCode === 401 || lowerText.includes('api key') || lowerText.includes('unauthorized')) {
    return { isRateLimit: false, message: 'API Key invalid or missing. Please update in Settings.' };
  }
  
  if (lowerText.includes('encrypt') || lowerText.includes('password') || lowerText.includes('protected')) {
    return { isRateLimit: false, message: '🔒 PDF is encrypted/password-protected. Cannot extract content.' };
  }
  
  if (lowerText.includes('access denied') || lowerText.includes('permission') || statusCode === 403) {
    return { isRateLimit: false, message: '🚫 Access denied to file. You may not have permission to view this file.' };
  }
  
  if (lowerText.includes('external organization') || lowerText.includes('external')) {
    return { isRateLimit: false, message: '🏢 File is from external organization. Cannot access.' };
  }
  
  if (lowerText.includes('not found') || lowerText.includes('deleted') || statusCode === 404) {
    return { isRateLimit: false, message: '📄 File not found. It may have been deleted or moved.' };
  }
  
  if (lowerText.includes('no content') || lowerText.includes('could not be extracted')) {
    return { isRateLimit: false, message: '📭 No content could be extracted. The PDF may be image-only or corrupted.' };
  }
  
  if (lowerText.includes('ai processing') || lowerText.includes('groq')) {
    return { isRateLimit: false, message: '🤖 AI processing failed. Please try again or check your API key.' };
  }
  
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const clientAI = useClientSideAI({ userId: user?._id });

  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      toast.error("Only PDF files are supported");
      return;
    }
    
    handleFileUpload(pdfFiles);
  };

  const handleFileUpload = async (filesOrEvent) => {
    let files;
    let eventTarget = null;
    if (filesOrEvent && filesOrEvent.target) {
      files = filesOrEvent.target.files;
      eventTarget = filesOrEvent.target;
    } else {
      files = filesOrEvent;
    }

    if (!files || files.length === 0) return;

    setUploading(true);
    const toastId = toast.loading("Processing and uploading files...");

    try {
      const payloadFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Base64 encoding
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });

        payloadFiles.push({
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data
        });
      }

      const res = await api.post(`/classroom/assignments/${assignmentId}/upload`, {
        files: payloadFiles
      });

      toast.success("Files uploaded successfully!", { id: toastId });
      
      if (res.data?.assignment) {
        setAssignment(res.data.assignment);
        
        const docs = getDocumentMaterials(res.data.assignment.materials);
        if (docs.length > 0) {
          const newDocIds = docs.map(d => d.driveFile?.driveFile?.id || d.driveFile?.id).filter(Boolean);
          setSelectedDocIds(newDocIds);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to upload files", { id: toastId });
    } finally {
      setUploading(false);
      if (eventTarget) {
        eventTarget.value = '';
      }
    }
  };

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
  const allDocMaterials = getDocumentMaterials(assignment?.materials);
  
  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const selectAllDocs = () => {
    const allIds = allDocMaterials.map(m => m.driveFile?.driveFile?.id || m.driveFile?.id);
    setSelectedDocIds(allIds);
  };

  const deselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/classroom/assignments/${user._id}`);
        const foundAssignment = res.data?.find?.(a => a._id === assignmentId);
        
        if (foundAssignment) {
          setAssignment(foundAssignment);
          const docs = getDocumentMaterials(foundAssignment.materials);
          if (docs.length > 0 && selectedDocIds.length === 0) {
            const firstDocId = docs[0].driveFile?.driveFile?.id || docs[0].driveFile?.id;
            setSelectedDocIds([firstDocId]);
          }
        } else {
          const directRes = await api.get(`/ai/solution/${assignmentId}`, {
            params: { userId: user._id }
          });
          if (directRes.data?.assignment) {
            setAssignment(directRes.data.assignment);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
        if (state?.assignment) {
          setAssignment(state.assignment);
        } else {
          toast.error("Failed to load assignment");
        }
      }
    };
    if (user) init();
  }, [assignmentId, user]);

  useEffect(() => {
    if (selectedDocIds.length === 0 && allDocMaterials.length > 0) {
      const firstDocId = allDocMaterials[0].driveFile?.driveFile?.id || allDocMaterials[0].driveFile?.id;
      setSelectedDocIds([firstDocId]);
    }
  }, [allDocMaterials, selectedDocIds.length]);

  const handleExtract = useCallback(async (forceRefresh = false) => {
    if (selectedDocIds.length === 0) {
      toast.error("No documents selected");
      return;
    }

    if (!clientAI.hasApiKey) {
      toast.error("Please configure your API Provider and keys in settings first!");
      return;
    }

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
          appendMode: i > 0,
          isManualFile: !!selectedMaterial?.isManualFile
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

  const handleGenerate = useCallback(async (mode, forceRegenerate = false, quizOptions = null) => {
    setActiveMode(mode);
    
    if (mode === 'tutor') {
      if (!clientAI.extractedContent) {
        toast.error("Please extract document content first using the Extract button");
        return;
      }
      if (clientAI.parsedQuestions.length === 0 && !clientAI.isParsingQuestions) {
        toast.promise(clientAI.parseAssignmentQuestions(), {
          loading: 'Extracting questions from document...',
          success: 'Questions extracted! Ready to study.',
          error: 'Failed to extract questions.'
        });
      }
      return;
    }

    if (clientAI.hasContent(mode) && !forceRegenerate) return;

    if (!clientAI.hasApiKey) {
      toast.error("Please configure your API Provider and keys in settings first!");
      return;
    }

    if (!clientAI.extractedContent) {
      toast.error("Please extract document content first using the Extract button");
      return;
    }

    if (mode === 'quiz' && !quizOptions) {
      setPendingQuizRegenerate(forceRegenerate);
      setShowQuizModal(true);
      return;
    }

    const toastId = toast.loading(forceRegenerate ? "Regenerating with AI..." : "Generating with AI...");

    try {
      const result = await clientAI.generate({
        mode,
        assignmentId,
        quizOptions: mode === 'quiz' ? quizOptions : undefined,
        assignmentTitle: assignment?.title,
        courseName: assignment?.courseName,
        forceRefresh: forceRegenerate,
      });

      if (result.cached) {
        toast.success(`Loaded ${mode} from cache!`, { id: toastId });
      } else {
        toast.success(`Generated ${mode}! (${result.tokens?.output || 0} tokens used)`, { id: toastId });
      }
    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  }, [clientAI, assignment, assignmentId]);

  const handleRegenerate = () => {
    handleGenerate(activeMode, true);
  };

  const handleQuizGenerate = (options) => {
    setShowQuizModal(false);
    handleGenerate('quiz', pendingQuizRegenerate, options);
  };

  const currentSolution = clientAI.getContent(activeMode);
  const generating = clientAI.isGenerating;

  const selectedDocMaterial = allDocMaterials.find(m => {
    const fileId = m.driveFile?.driveFile?.id || m.driveFile?.id;
    return fileId === (selectedDocIds[0] || docFileId);
  });
  const isSelectedDocManual = !!(selectedDocMaterial?.isManualFile || selectedDocMaterial?.driveFile?.isManualFile);

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
    // FIX 1: Main container height properly constrained, avoiding nested flex stretching issues.
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 px-2 sm:px-4 pb-4 h-[calc(100vh-5rem)] overflow-hidden relative">
      
      <ProcessingStatus
        isExtracting={clientAI.isExtracting}
        extractionProgress={clientAI.extractionProgress}
        extractionError={clientAI.extractionError}
        isGenerating={clientAI.isGenerating}
        generatingMode={clientAI.generatingMode}
        generationError={clientAI.generationError}
        rateLimiterState={clientAI.rateLimiterState}
      />

      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-4 top-3.5 z-40 w-9 h-9 bg-zinc-950/90 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-full border border-white/10 shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
          title="Expand Sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* FIX 2: Left Sidebar made scrollable with h-full and min-h-0 */}
      {!isSidebarCollapsed && (
        <div className="lg:w-[360px] xl:w-[420px] shrink-0 flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4">
            
            <GlassCard className="flex flex-col gap-4 shrink-0" hoverEffect={false}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">{assignment?.courseName}</p>
                  <h1 className="text-xl font-bold text-white mt-1 line-clamp-3">{assignment?.title}</h1>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg border border-white/5 transition-all shrink-0 mt-1"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <p className="text-sm text-zinc-400 mt-1">{assignment?.description || "No description provided."}</p>

              {assignment?.materials?.length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                  <h2 className="text-sm font-semibold text-zinc-300 mb-3">Attached Materials</h2>
                  {/* FIX 3: Internal Scroll for Materials list (matching your wireframe) */}
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                    {assignment.materials.map((m, i) => {
                      const MatIcon = getMaterialIcon(m);
                      return (
                        <a
                          key={i}
                          href={getMaterialLink(m)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/70 border border-transparent hover:border-indigo-500/50 transition-all group shrink-0"
                        >
                          <div className="p-2 bg-zinc-900 rounded-md text-indigo-400 group-hover:text-white transition-colors">
                            <MatIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{getMaterialTitle(m)}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                              Open in new tab <ExternalLink size={12} />
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {assignment?.alternateLink && (
                <Button 
                  as="a" 
                  href={assignment.alternateLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="secondary" 
                  className="w-full mt-2 shrink-0"
                >
                  <ExternalLink size={14} className="mr-2" /> View on Google Classroom
                </Button>
              )}
            </GlassCard>

          {(allDocMaterials.length > 0 || assignment?.isManual) && (
            <GlassCard hoverEffect={false} className="shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-300">
                  Select Documents for AI
                </h2>
                {allDocMaterials.length > 1 && (
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="ghost" onClick={selectAllDocs} disabled={clientAI.isExtracting}>All</Button>
                    <Button size="xs" variant="ghost" onClick={deselectAllDocs} disabled={clientAI.isExtracting}>None</Button>
                  </div>
                )}
              </div>
              
              {allDocMaterials.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                  {allDocMaterials.map((doc, idx) => {
                    const docId = doc.driveFile?.driveFile?.id || doc.driveFile?.id;
                    const docTitle = doc.driveFile?.driveFile?.title || doc.driveFile?.title || `Document ${idx + 1}`;
                    const isSelected = selectedDocIds.includes(docId);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all cursor-pointer border shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600/20 text-white border-indigo-500/50'
                            : 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50 hover:border-indigo-500/30'
                        } ${clientAI.isExtracting || clientAI.isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDocSelection(docId)}
                          disabled={clientAI.isExtracting || clientAI.isGenerating}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                        />
                        <span className="font-medium truncate flex-1">{docTitle}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 mb-2">No documents uploaded yet.</p>
              )}

              {/* Upload Manual Files Section */}
              {assignment?.isManual && (
                <div className="border-t border-zinc-800/60 pt-4 mt-3">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Upload Local Document (PDF)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('manual-file-upload').click()}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-500/10 text-white animate-pulse'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/60 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <input
                      type="file"
                      id="manual-file-upload"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-xs font-medium text-zinc-300">Uploading documents...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-zinc-900 rounded-full border border-white/5 text-indigo-400">
                          <Plus size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Drag & Drop or Click to Upload PDF</p>
                          <p className="text-[10px] text-zinc-500 mt-1">PDF files up to 50MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDocIds.length === 0 && allDocMaterials.length > 0 && (
                <p className="text-xs text-amber-400 mt-3">
                  ⚠️ Select at least one document to enable AI tools.
                </p>
              )}
            </GlassCard>
          )}

          <GlassCard hoverEffect={false} className="shrink-0">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">AI Toolkit</h2>
            
            <Button
              onClick={() => handleExtract(!!clientAI.extractedContent)}
              disabled={clientAI.isExtracting || selectedDocIds.length === 0}
              className="w-full text-base py-3"
              variant="primary"
              size="lg"
            >
              {clientAI.isExtracting ? (
                <><Loader2 size={20} className="animate-spin mr-2" />Extracting...</>
              ) : clientAI.extractedContent ? (
                <><RefreshCw size={18} className="mr-2" />Re-Extract Content</>
              ) : (
                <><Zap size={18} className="mr-2" />Extract & Analyze</>
              )}
            </Button>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              {selectedDocIds.length > 0 
                ? `${selectedDocIds.length} document${selectedDocIds.length > 1 ? 's' : ''} selected.`
                : "Select a document to begin."
              }
            </p>

            {clientAI.extractedContent && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-xs">
                <div className="flex items-center gap-2 font-semibold text-green-400">
                  <Zap size={14} />
                  <span>Content Ready for AI</span>
                </div>
                <div className="text-green-400/80 mt-1.5 pl-6 text-[11px]">
                  {clientAI.extractedContent.pageCount} pages analyzed
                  {clientAI.extractedContent.documents?.length > 1 && ` from ${clientAI.extractedContent.documents.length} docs`}.
                </div>
              </div>
            )}

            <div className="border-t border-zinc-800 mt-4 pt-4">
              <AIAssistant 
                activeMode={activeMode} 
                onGenerate={handleGenerate} 
                generating={clientAI.isGenerating} 
                hasSolution={(mode) => clientAI.hasContent(mode)}
                disabled={!clientAI.extractedContent}
              />
            </div>
          </GlassCard>
        </div>
      )}

      {/* FIX 5: Main Content Area properly formatted to scroll right side independently */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden min-h-0">
          
          <div className={`flex items-center gap-2 p-3 border-b border-white/10 bg-zinc-900/50 shrink-0 transition-all duration-200 ${isSidebarCollapsed ? 'pl-16' : ''}`}>

            <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2 ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Sparkles size={16} /> AI Response
            </button>
            {docFileId && (
              <button onClick={() => setActiveTab('pdf')} className={`px-4 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2 ${activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                <FileIcon size={16} /> Assignment
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'ai' && (
              <div className="h-full">
                {activeMode === 'tutor' ? (
                  <SocraticStudyPanel 
                    clientAI={clientAI}
                    assignmentId={assignmentId}
                    assignmentTitle={assignment?.title}
                    courseName={assignment?.courseName}
                    pdfFileId={selectedDocIds[0] || docFileId}
                  />
                ) : (
                  <>
                    {!currentSolution && !generating && (
                      <div className="flex flex-col items-center justify-center text-center h-full p-8">
                        <div className="p-6 bg-zinc-800/50 rounded-full mb-6">
                          <Sparkles className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {clientAI.extractedContent ? "Ready for your command" : "Start by Extracting Content"}
                        </h2>
                        <p className="text-zinc-400 max-w-md">
                          {clientAI.extractedContent 
                            ? "Select an AI tool from the left panel, like 'Explain' or 'Create Quiz', to generate a response."
                            : "Use the 'Extract & Analyze' button on the left to process your selected documents first."
                          }
                        </p>
                      </div>
                    )}
                    {generating && (
                      <div className="flex flex-col items-center justify-center text-indigo-400 h-full p-8">
                        <Loader2 className="w-12 h-12 animate-spin mb-6" />
                        <p className="text-xl font-semibold mb-2">Generating {clientAI.generatingMode}...</p>
                        <p className="text-sm text-zinc-500">Your browser is doing the hard work!</p>
                      </div>
                    )}
                    {currentSolution && !generating && (
                      <div className="h-full flex flex-col">
                        {activeMode === 'quiz' && (<Quiz content={currentSolution} onRegenerate={handleRegenerate} />)}
                        {activeMode === 'flashcards' && (<Flashcards content={currentSolution} onRegenerate={handleRegenerate} />)}
                        {activeMode === 'explain' && (
                          <div className="p-4 sm:p-6 md:p-8">
                            <div className="flex justify-end mb-4">
                              <Button size="sm" variant="secondary" onClick={handleRegenerate}>
                                <RefreshCw size={14} className="mr-2" /> Regenerate
                              </Button>
                            </div>
                            <div className="prose prose-invert prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: currentSolution }} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {activeTab === 'pdf' && <PDFViewer pdfFileId={selectedDocIds[0] || docFileId} isManual={isSelectedDocManual} />}
          </div>
        </div>
      </div>

      <QuizOptionsModal 
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onGenerate={handleQuizGenerate}
        isGenerating={clientAI.isGenerating}
      />
    </div>
  );
};

export default Workspace;
