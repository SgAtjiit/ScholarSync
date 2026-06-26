import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import {
    Brain, HelpCircle, Sparkles, PenTool, Check, Loader2,
    ChevronLeft, ChevronRight, BookOpen, AlertCircle, FileText, CheckCircle, RotateCcw,
    Bold, Italic, List, ListOrdered, Send, Sliders, Palette, X, Download
} from 'lucide-react';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PDFViewer from './PDFViewer';
import { cleanMarkdownFromHTML, sanitizeHTML } from '../../utils/textCleaner';
import DocEditor from './DocEditor';

// Escape helper for plain text blocks
const escapeHtml = (text = '') => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Format AI message as rich HTML (markdown + paragraphs + code blocks)
const formatAiMessage = (text) => {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();

    const codeBlocks = [];
    cleaned = cleaned.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang = '', code = '') => {
        const idx = codeBlocks.length;
        codeBlocks.push(
            `<pre class="chat-code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
        );
        return `__CHAT_CODE_BLOCK_${idx}__`;
    });

    cleaned = cleanMarkdownFromHTML(cleaned);

    cleaned = cleaned.replace(/__CHAT_CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[Number(i)] || '');

    const hasBlockTags = /<(h1|h2|h3|h4|ul|ol|li|pre|table|blockquote|p|hr)\b/i.test(cleaned);
    if (!hasBlockTags) {
        cleaned = cleaned
            .split(/\n{2,}/)
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => `<p>${part.replace(/\n/g, '<br />')}</p>`)
            .join('');
    }

    return sanitizeHTML(cleaned);
};

// Simple rich editor menu bar
const EditorMenuBar = ({ editor }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap gap-1 p-1 bg-zinc-800 border-b border-zinc-700 items-center overflow-x-auto rounded-t-lg">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                title="Bold"
            >
                <Bold size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                title="Italic"
            >
                <Italic size={14} />
            </button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                title="Bullet List"
            >
                <List size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                title="Ordered List"
            >
                <ListOrdered size={14} />
            </button>
        </div>
    );
};

const SocraticStudyPanel = ({
    clientAI,
    assignmentId,
    assignmentTitle = 'Assignment',
    courseName = 'Course',
    pdfFileId
}) => {
    const { user } = useAuth();
    const {
        extractedContent,
        parseAssignmentQuestions,
        parsedQuestions,
        isParsingQuestions,
        getTutorHint,
        getTutorExplanation,
        verifyTutorSolution,
        getTutorAnswer,
        chat
    } = clientAI;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [drafts, setDrafts] = useState({}); // { [index]: htmlString }
    
    // Socratic tutor dialogue history stored per-question: { [index]: Array<{role, content}> }
    const [tutorHistories, setTutorHistories] = useState({});
    const [loadingAction, setLoadingAction] = useState(null); // 'hint', 'explain', 'verify', 'answer', 'chat'
    const [compiling, setCompiling] = useState(false);
    const [compiledDocId, setCompiledDocId] = useState(null);
    const [compiledDocUrl, setCompiledDocUrl] = useState(null);
    const [hasFailedParse, setHasFailedParse] = useState(false);
    const chatEndRef = useRef(null);

    const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
    const [formatOptions, setFormatOptions] = useState({
        colorTheme: 'charcoal',
        fontFamily: 'Arial',
        bodyFontSize: '14px',
        headingFontSize: '24px',
        marginSize: '20px',
        lineSpacing: '1.6',
        customTitle: ''
    });

    const [chatInput, setChatInput] = useState('');

    // Resizable & Collapsible Layout States
    const [activeSideTab, setActiveSideTab] = useState('tutor'); // 'tutor' or 'pdf'
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [auxWidth, setAuxWidth] = useState(380); // default in px

    // Mouse handler for drag resizing left auxiliary panel
    const startAuxResize = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = auxWidth;

        const doResize = (moveEvent) => {
            const newWidth = Math.max(280, Math.min(600, startWidth + (moveEvent.clientX - startX)));
            setAuxWidth(newWidth);
        };

        const stopResize = () => {
            window.removeEventListener('mousemove', doResize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', doResize);
        window.addEventListener('mouseup', stopResize);
    }, [auxWidth]);

    // TipTap Editor configuration
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            TextStyle,
            FontFamily,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: drafts[0] || '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none flex-1 h-full min-h-[120px] overflow-y-auto px-4 py-3 bg-zinc-950 text-white rounded-b-lg border border-t-0 border-zinc-700 text-sm focus:border-indigo-500 transition-colors',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setDrafts(prev => ({
                ...prev,
                [currentQuestionIndex]: html
            }));
        }
    }, [currentQuestionIndex]);

    // Parse questions on component mount or extracted content update
    useEffect(() => {
        const loadQuestions = async () => {
            if (extractedContent && parsedQuestions.length === 0 && !isParsingQuestions && !hasFailedParse) {
                try {
                    await parseAssignmentQuestions();
                } catch (e) {
                    toast.error('Failed to parse questions from document.');
                    setHasFailedParse(true);
                }
            }
        };
        loadQuestions();
    }, [extractedContent, parsedQuestions.length, parseAssignmentQuestions, isParsingQuestions, hasFailedParse]);

    const handleRetry = async () => {
        setHasFailedParse(false);
        try {
            await parseAssignmentQuestions();
        } catch (e) {
            toast.error('Failed to parse questions from document.');
            setHasFailedParse(true);
        }
    };

    // Save active draft and set editor content when shifting questions
    useEffect(() => {
        if (editor) {
            editor.commands.setContent(drafts[currentQuestionIndex] || '');
        }
    }, [currentQuestionIndex, editor]);

    // Auto-scroll chat window to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [tutorHistories, currentQuestionIndex]);

    const activeQuestion = parsedQuestions[currentQuestionIndex] || null;
    const activeHistory = tutorHistories[currentQuestionIndex] || [
        {
            role: 'assistant',
            content: `<h3>Tutor Assistant</h3><p>Hi! Let's solve this question together. Write your draft/ideas on the right. If you need any tips or explanations, let me know!</p>`
        }
    ];

    const appendMessage = (role, content) => {
        setTutorHistories(prev => {
            const currentHistory = prev[currentQuestionIndex] || [
                {
                    role: 'assistant',
                    content: `<h3>Tutor Assistant</h3><p>Hi! Let's solve this question together. Write your draft/ideas on the right. If you need any tips or explanations, let me know!</p>`
                }
            ];
            return {
                ...prev,
                [currentQuestionIndex]: [...currentHistory, { role, content }]
            };
        });
    };

    const handleGetHint = async () => {
        if (!activeQuestion) return;
        setLoadingAction('hint');
        appendMessage('user', 'Can you give me a conceptual hint?');

        try {
            const currentDraft = editor ? editor.getText() : '';
            const hint = await getTutorHint(activeQuestion.text, currentDraft);
            appendMessage('assistant', formatAiMessage(hint));
        } catch (e) {
            toast.error(e.message || 'Failed to get hint');
            appendMessage('assistant', `<p className="text-red-400">Error: Could not get hint. Please check your configurations.</p>`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleExplain = async () => {
        if (!activeQuestion) return;
        setLoadingAction('explain');
        appendMessage('user', 'Can you explain the core concepts behind this question?');

        try {
            const explanation = await getTutorExplanation(activeQuestion.text);
            appendMessage('assistant', formatAiMessage(explanation));
        } catch (e) {
            toast.error(e.message || 'Failed to get explanation');
            appendMessage('assistant', `<p className="text-red-400">Error: Could not get explanation.</p>`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleVerify = async () => {
        if (!activeQuestion) return;
        
        const currentDraft = editor ? editor.getText() : '';
        if (!currentDraft || currentDraft.trim().length < 5) {
            toast.error('Please write a draft first');
            return;
        }

        setLoadingAction('verify');
        appendMessage('user', 'Could you verify my current solution?');

        try {
            const verification = await verifyTutorSolution(activeQuestion.text, currentDraft);
            appendMessage('assistant', formatAiMessage(verification));
        } catch (e) {
            toast.error(e.message || 'Failed to verify solution');
            appendMessage('assistant', `<p className="text-red-400">Error: Verification failed.</p>`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGetAnswer = async () => {
        if (!activeQuestion) return;
        setLoadingAction('answer');
        appendMessage('user', 'Please provide the correct answer.');

        try {
            const answer = await getTutorAnswer(activeQuestion.text);
            const formattedAnswer = formatAiMessage(answer);
            appendMessage('assistant', `<p class="text-green-400 font-semibold mb-2">Here is the correct answer. I have also injected it into your editor workspace on the right so you can review and edit it.</p>${formattedAnswer}`);
            
            // Injects correct answer into the editor
            if (editor) {
                editor.commands.setContent(formattedAnswer);
            }
        } catch (e) {
            toast.error(e.message || 'Failed to get answer');
            appendMessage('assistant', `<p className="text-red-400">Error: Could not get answer.</p>`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !!loadingAction) return;

        const userMsg = chatInput;
        setChatInput('');
        appendMessage('user', userMsg);
        setLoadingAction('chat');

        try {
            // Prepare history for chat context (keeping it concise)
            const chatHistoryContext = activeHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content.replace(/<[^>]+>/g, ' ').trim()
            })).slice(-10); // Keep last 10 messages for context

            const response = await chat(userMsg, chatHistoryContext);
            const formattedResponse = formatAiMessage(response);
            appendMessage('assistant', formattedResponse);
        } catch (e) {
            toast.error(e.message || 'Failed to send message');
            appendMessage('assistant', `<p className="text-red-400">Error: Could not get response from tutor.</p>`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCompile = async () => {
        setCompiling(true);
        const toastId = toast.loading(user?.hasClassroomConnected 
            ? 'Compiling all drafts & creating Google Doc...' 
            : 'Compiling all drafts & creating PDF...'
        );

        try {
            // Aggregate all student drafted responses in HTML format using classes for themes
            let compiledContent = `
                <div>
                    <h1>${formatOptions.customTitle || assignmentTitle}</h1>
                    <p class="meta-info">Generated via Socratic Tutor on ScholarSync</p>
                    <p class="meta-info">Course: ${courseName}</p>
                    <hr class="question-divider" />
            `;

            parsedQuestions.forEach((q, idx) => {
                const draft = drafts[idx] || '<p class="no-solution">No solution drafted.</p>';
                if (idx > 0) {
                    compiledContent += `<hr class="question-divider" />`;
                }
                compiledContent += `
                    <div class="question-container">
                        <p class="question-box">
                            <strong>${q.id} - </strong>${q.text.replace(/\n/g, '<br />')}
                        </p>
                        <div class="answer-box">
                            <strong>Ans - </strong>${draft}
                        </div>
                    </div>
                `;
            });

            compiledContent += `</div>`;

            // Call Classroom API to create document
            const res = await api.post('/classroom/create-draft-doc', {
                assignmentId,
                userId: user._id,
                content: compiledContent,
                title: formatOptions.customTitle || `${assignmentTitle}_Socratic_Solution`,
                courseName,
                colorTheme: formatOptions.colorTheme,
                fontFamily: formatOptions.fontFamily,
                bodyFontSize: formatOptions.bodyFontSize,
                headingFontSize: formatOptions.headingFontSize,
                marginSize: formatOptions.marginSize,
                lineSpacing: formatOptions.lineSpacing,
                customTitle: formatOptions.customTitle
            });

            setCompiledDocId(res.data.docId);
            setCompiledDocUrl(res.data.editLink);

            toast.success(user?.hasClassroomConnected 
                ? 'Unified Google Doc compiled successfully!' 
                : 'Unified PDF compiled successfully!', 
                { id: toastId }
            );
        } catch (e) {
            console.error('Compilation error:', e);
            toast.error(e.response?.data?.error || (user?.hasClassroomConnected ? 'Failed to compile unified document' : 'Failed to compile unified PDF'), { id: toastId });
        } finally {
            setCompiling(false);
        }
    };

    if (isParsingQuestions) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] text-zinc-500 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-zinc-300 font-semibold">Analyzing document structure...</p>
                <p className="text-xs text-zinc-500">Extracting individual questions for Socratic study</p>
            </div>
        );
    }

    if (parsedQuestions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-zinc-400 text-center gap-4">
                <AlertCircle className="w-12 h-12 text-zinc-600" />
                <h3 className="text-lg font-bold text-white">No questions identified</h3>
                <p className="max-w-md text-sm text-zinc-500">
                    We couldn't divide this document into separate questions automatically. Ensure you have run "Extract & Analyze" on your material first.
                </p>
                <Button onClick={handleRetry} size="sm">
                    Retry Analysis
                </Button>
            </div>
        );
    }

    const isLastQuestion = currentQuestionIndex === parsedQuestions.length - 1;

    return (
        <div className="flex flex-row h-full w-full overflow-hidden gap-1 p-2 bg-[#0c0c0e]/20 relative">
            {/* COLUMN 1: Swappable Auxiliary Panel (Left) - Visible when !isCollapsed */}
            {!isCollapsed && (
                <div 
                    className="flex flex-col bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden h-full min-h-0 shrink-0 select-none lg:select-text"
                    style={{ width: `${auxWidth}px` }}
                >
                    {/* Panel Header Toggles & Close Chevron */}
                    <div className="p-3 border-b border-white/5 bg-zinc-900/50 shrink-0 flex items-center justify-between gap-3 select-none">
                        <div className="flex bg-zinc-950/80 p-1 rounded-lg border border-white/5 items-center gap-1 flex-1">
                            <button 
                                onClick={() => setActiveSideTab('tutor')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                    activeSideTab === 'tutor'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                                }`}
                            >
                                <Brain size={13} />
                                <span>Tutor Assistant</span>
                            </button>
                            <button 
                                onClick={() => setActiveSideTab('pdf')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                    activeSideTab === 'pdf'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                                }`}
                            >
                                <FileText size={13} />
                                <span>Assignment</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Collapse Panel"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>

                    {/* Panel Content based on Active Tab */}
                    {activeSideTab === 'tutor' ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Tutor Actions Panel */}
                            <div className="p-4 border-b border-white/5 bg-zinc-900/30 shrink-0 flex gap-2 flex-wrap">
                                <button
                                    onClick={handleGetHint}
                                    disabled={!!loadingAction}
                                    className="px-3 py-1.5 rounded-full bg-zinc-800/85 hover:bg-zinc-700/95 hover:text-indigo-300 text-indigo-400 font-medium text-xs border border-white/5 transition-all flex items-center shadow-sm select-none"
                                >
                                    <HelpCircle size={12} className="mr-1.5" /> Hint
                                </button>
                                <button
                                    onClick={handleExplain}
                                    disabled={!!loadingAction}
                                    className="px-3 py-1.5 rounded-full bg-zinc-800/85 hover:bg-zinc-700/95 hover:text-indigo-300 text-indigo-400 font-medium text-xs border border-white/5 transition-all flex items-center shadow-sm select-none"
                                >
                                    <Brain size={12} className="mr-1.5" /> Explain
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={!!loadingAction || !editor?.getText()}
                                    className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed select-none"
                                >
                                    <Sparkles size={12} className="mr-1.5" /> Verify Solution
                                </button>
                                <button
                                    onClick={handleGetAnswer}
                                    disabled={!!loadingAction}
                                    className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all flex items-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed select-none"
                                >
                                    <CheckCircle size={12} className="mr-1.5" /> Give Answer
                                </button>
                            </div>
                            
                            {/* Dialogue History Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 bg-zinc-950/10 flex flex-col">
                                {activeHistory.length <= 1 && !loadingAction ? (
                                    /* Empty state placeholder */
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-16 h-16 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/10 flex items-center justify-center mb-6 animate-pulse">
                                            <Brain size={32} />
                                        </div>
                                        <p className="text-sm font-semibold text-zinc-300 mb-2">
                                            Use Hint, Explain, or Verify Solution to get started.
                                        </p>
                                        <p className="text-xs text-zinc-500 max-w-[240px]">
                                            I'm here to help you understand and solve the problem step by step.
                                        </p>
                                    </div>
                                ) : (
                                    /* Dialogue List */
                                    <div className="space-y-4 flex-1">
                                        {activeHistory.map((msg, index) => (
                                            <div
                                                key={index}
                                                className={`flex gap-3 max-w-[90%] items-start ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                                                    msg.role === 'user' ? 'bg-zinc-700 border border-zinc-650 text-white' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                                }`}>
                                                    {msg.role === 'user' ? 'ME' : <Brain size={16} />}
                                                </div>
                                                <div className={msg.role === 'user' 
                                                    ? "p-3.5 rounded-2xl rounded-tr-none text-sm leading-relaxed bg-zinc-800/80 hover:bg-zinc-850 text-zinc-100 border border-white/5 shadow-md transition-all duration-150"
                                                    : "p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed bg-indigo-950/20 hover:bg-indigo-950/30 text-zinc-200 border border-indigo-500/25 shadow-lg shadow-indigo-950/20 relative overflow-hidden transition-all duration-150 hover:border-indigo-500/40 flex-1 prose prose-sm prose-invert max-w-none prose-headings:text-indigo-400 prose-headings:font-bold prose-headings:text-sm prose-p:leading-relaxed prose-li:my-1 prose-strong:text-white"
                                                }>
                                                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {loadingAction && (
                                    <div className="flex gap-3 max-w-[80%] mt-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                            <Loader2 size={16} className="animate-spin" />
                                        </div>
                                        <div className="bg-zinc-900/40 border border-white/5 p-3.5 rounded-xl rounded-tl-none text-sm text-zinc-500 flex items-center gap-2">
                                            <span className="animate-pulse">
                                                {loadingAction === 'hint' && 'Composing conceptual hint...'}
                                                {loadingAction === 'explain' && 'Compiling concepts & analogies...'}
                                                {loadingAction === 'verify' && 'Reviewing your solution draft...'}
                                                {loadingAction === 'answer' && 'Generating correct solution answer...'}
                                                {loadingAction === 'chat' && 'Thinking...'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input Area at the bottom */}
                            <div className="p-3 border-t border-white/5 bg-zinc-900/50 shrink-0">
                                <form 
                                    onSubmit={handleChatSubmit} 
                                    className="flex items-center gap-2 bg-zinc-950/80 rounded-lg p-1 border border-white/5 focus-within:border-indigo-500/50 transition-colors"
                                >
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask tutor about this assignment..."
                                        disabled={!!loadingAction}
                                        className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim() || !!loadingAction}
                                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={12} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 bg-zinc-950/20">
                            <PDFViewer pdfFileId={pdfFileId} />
                        </div>
                    )}
                </div>
            )}

            {/* Resizer Divider */}
            {!isCollapsed && (
                <div
                    onMouseDown={startAuxResize}
                    className="hidden lg:block w-1.5 hover:w-2 bg-transparent hover:bg-indigo-500/20 active:bg-indigo-500/40 cursor-col-resize h-full shrink-0 transition-all duration-150 select-none z-10"
                    title="Drag to resize Auxiliary Panel"
                />
            )}

            {/* COLUMN 2: Question & Editor (Right/Flexible) - Always Visible */}
            <div className="flex-1 flex flex-col bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden h-full min-h-0 relative">
                {/* Floating Expand Trigger when collapsed */}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-16 bg-zinc-950/90 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-r-lg border border-l-0 border-white/10 shadow-xl transition-all duration-200 flex items-center justify-center"
                        title="Expand Panel"
                    >
                        <ChevronRight size={14} />
                    </button>
                )}

                {compiledDocId ? (
                    <DocEditor 
                        initialContent={null}
                        assignmentId={assignmentId} 
                        assignmentTitle={assignmentTitle}
                        courseName={courseName}
                        onRegenerate={() => {
                            setCompiledDocId(null);
                            setCompiledDocUrl(null);
                        }}
                        initialDocId={compiledDocId}
                        initialDocUrl={compiledDocUrl}
                        regenerateLabel="Reset Compilation"
                        isPdfMode={!user?.hasClassroomConnected}
                    />
                ) : (
                    <>
                        {/* Question Info Header */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/60 border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-600/20 rounded text-indigo-400">
                                    <BookOpen size={16} />
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active Task</span>
                                    <h3 className="text-sm font-bold text-white leading-none mt-0.5">
                                        {activeQuestion.id} <span className="text-zinc-500 font-normal">of {parsedQuestions.length}</span>
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {compiledDocUrl ? (
                                    <div className="flex items-center gap-1">
                                        {user?.hasClassroomConnected ? (
                                            <Button
                                                as="a"
                                                href={compiledDocUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="xs"
                                                variant="primary"
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center py-1 px-2.5 rounded shadow-sm"
                                            >
                                                <FileText size={12} className="mr-1" /> Edit Doc
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => window.open(compiledDocUrl, '_blank')}
                                                size="xs"
                                                variant="primary"
                                                className="bg-green-600 hover:bg-green-500 text-white font-medium text-[11px] flex items-center py-1 px-2.5 rounded shadow-sm"
                                            >
                                                <Download size={12} className="mr-1" /> Download PDF
                                            </Button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setCompiledDocId(null);
                                                setCompiledDocUrl(null);
                                            }}
                                            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                                            title="Reset Compilation"
                                        >
                                            <RotateCcw size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setIsFormatModalOpen(true)}
                                            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg border border-white/5 transition-all"
                                            title="Personalize Document Formatting"
                                            type="button"
                                            disabled={compiling || parsedQuestions.length === 0}
                                        >
                                            <Sliders size={13} />
                                        </button>
                                        <Button
                                            onClick={() => setIsFormatModalOpen(true)}
                                            disabled={compiling || parsedQuestions.length === 0}
                                            loading={compiling}
                                            size="xs"
                                            variant="primary"
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] py-1.5 px-2.5 rounded shadow-sm"
                                        >
                                            <Sparkles size={12} className="mr-1" /> {user?.hasClassroomConnected ? 'Compile Doc' : 'Compile PDF'}
                                        </Button>
                                    </div>
                                )}

                                <div className="w-px h-5 bg-zinc-800" />

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-xs text-zinc-400 font-medium select-none">
                                        {currentQuestionIndex + 1}/{parsedQuestions.length}
                                    </span>
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(parsedQuestions.length - 1, prev + 1))}
                                        disabled={isLastQuestion}
                                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Question Details Box */}
                        <div className="px-4 py-3 bg-indigo-600/5 border-b border-white/5 text-zinc-300 text-xs overflow-y-auto max-h-[160px] shrink-0 font-normal whitespace-pre-line leading-relaxed custom-scrollbar">
                            <span className="font-semibold text-indigo-400 mr-1.5">Question:</span>
                            {activeQuestion.text}
                        </div>

                        {/* Student Solution Workspace */}
                        <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <PenTool size={12} className="text-indigo-400" />
                                        Draft Your Response
                                    </label>
                                    <span className="text-[10px] text-zinc-500">HTML Supported</span>
                                </div>

                                {/* Rich text editor panel */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <EditorMenuBar editor={editor} />
                                    <EditorContent editor={editor} className="flex-1 flex flex-col min-h-0 overflow-hidden" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            {/* Formatting Options Modal */}
            {isFormatModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/5 bg-zinc-950/40 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Palette size={16} className="text-indigo-400" />
                                Personalize Document Layout
                            </h3>
                            <button 
                                onClick={() => setIsFormatModalOpen(false)}
                                className="text-zinc-400 hover:text-white text-xs"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {/* Document Title */}
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Document Title</label>
                                <input 
                                    type="text" 
                                    value={formatOptions.customTitle}
                                    onChange={(e) => setFormatOptions(prev => ({ ...prev, customTitle: e.target.value }))}
                                    placeholder={`${assignmentTitle}_Solution`}
                                    className="w-full bg-zinc-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>

                            {/* Color Theme */}
                            <div>
                                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Color Theme</label>
                                <div className="flex gap-2.5">
                                    {['indigo', 'emerald', 'ruby', 'amber', 'slate', 'charcoal'].map(color => {
                                        const colorClasses = {
                                            indigo: 'bg-indigo-600 border-indigo-500',
                                            emerald: 'bg-emerald-600 border-emerald-500',
                                            ruby: 'bg-rose-600 border-rose-500',
                                            amber: 'bg-amber-600 border-amber-500',
                                            slate: 'bg-zinc-500 border-zinc-400',
                                            charcoal: 'bg-zinc-950 border-zinc-800'
                                        };
                                        return (
                                            <button
                                                key={color}
                                                onClick={() => setFormatOptions(prev => ({ ...prev, colorTheme: color }))}
                                                className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${colorClasses[color]} ${formatOptions.colorTheme === color ? 'scale-110 border-white ring-2 ring-indigo-500/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                title={color.toUpperCase()}
                                                type="button"
                                            >
                                                {formatOptions.colorTheme === color && <Check size={12} className="text-white font-bold" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Font Family & Margin */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Font Family</label>
                                    <select
                                        value={formatOptions.fontFamily}
                                        onChange={(e) => setFormatOptions(prev => ({ ...prev, fontFamily: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="Arial">Arial (Sans)</option>
                                        <option value="Georgia">Georgia (Serif)</option>
                                        <option value="Courier New">Courier (Mono)</option>
                                        <option value="Times New Roman">Times (Serif)</option>
                                        <option value="Verdana">Verdana (Sans)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Margins</label>
                                    <select
                                        value={formatOptions.marginSize}
                                        onChange={(e) => setFormatOptions(prev => ({ ...prev, marginSize: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="10px">Narrow (10px)</option>
                                        <option value="20px">Normal (20px)</option>
                                        <option value="30px">Wide (30px)</option>
                                        <option value="45px">Extra Wide (45px)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Font Sizes & Spacing */}
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Heading Size</label>
                                    <select
                                        value={formatOptions.headingFontSize}
                                        onChange={(e) => setFormatOptions(prev => ({ ...prev, headingFontSize: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="20px">20px</option>
                                        <option value="24px">24px</option>
                                        <option value="28px">28px</option>
                                        <option value="32px">32px</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Body Size</label>
                                    <select
                                        value={formatOptions.bodyFontSize}
                                        onChange={(e) => setFormatOptions(prev => ({ ...prev, bodyFontSize: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="12px">12px</option>
                                        <option value="14px">14px</option>
                                        <option value="16px">16px</option>
                                        <option value="18px">18px</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Line Spacing</label>
                                    <select
                                        value={formatOptions.lineSpacing}
                                        onChange={(e) => setFormatOptions(prev => ({ ...prev, lineSpacing: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="1.15">Single (1.15)</option>
                                        <option value="1.6">1.5 Lines (1.6)</option>
                                        <option value="2.0">Double (2.0)</option>
                                    </select>
                                </div>
                            </div>


                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/5 bg-zinc-950/40 flex justify-end gap-2.5">
                            <Button 
                                onClick={() => setIsFormatModalOpen(false)}
                                size="sm"
                                variant="secondary"
                                className="px-4 py-1.5 text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => {
                                    setIsFormatModalOpen(false);
                                    handleCompile();
                                }}
                                size="sm"
                                variant="primary"
                                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs"
                            >
                                Apply & Compile
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default SocraticStudyPanel;
