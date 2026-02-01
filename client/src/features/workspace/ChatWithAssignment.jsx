import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Sparkles, StopCircle, Trash2, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Helper to parse error and extract rate limit info
const parseErrorMessage = (errorText) => {
    if (!errorText) errorText = '';
    const lowerText = errorText.toLowerCase();
    
    // Check for rate limit error
    if (lowerText.includes('rate_limit') || lowerText.includes('rate limit') || errorText.includes('429')) {
        const retryMatch = errorText.match(/try again in (\d+m?\d*\.?\d*s?)/i) || errorText.match(/wait (\d+m?\d*\.?\d*s?)/i);
        const waitTime = retryMatch ? retryMatch[1] : '5 minutes';
        return {
            isRateLimit: true,
            toastMessage: `API rate limit exceeded. Wait ${waitTime}.`,
            chatMessage: `⏳ API rate limit exceeded. Please wait ${waitTime} and try again.`
        };
    }
    
    // Check for auth error
    if (errorText.includes('401') || lowerText.includes('api key') || lowerText.includes('unauthorized') || lowerText.includes('invalid_api_key')) {
        return {
            isRateLimit: false,
            toastMessage: 'Invalid API Key. Please check your settings.',
            chatMessage: '⚠️ API Key is missing or invalid. Go to Profile → Settings to update your Groq API Key.'
        };
    }
    
    // Check for content not extracted
    if (lowerText.includes('not extracted') || lowerText.includes('no content')) {
        return {
            isRateLimit: false,
            toastMessage: 'Assignment content not ready.',
            chatMessage: '📄 Assignment content not extracted yet. Please wait for extraction to complete or try reloading the page.'
        };
    }
    
    // Check for assignment not found
    if (lowerText.includes('not found') || lowerText.includes('404')) {
        return {
            isRateLimit: false,
            toastMessage: 'Assignment not found.',
            chatMessage: '❌ Assignment not found. It may have been deleted or moved.'
        };
    }
    
    // Check for network errors
    if (lowerText.includes('network') || lowerText.includes('fetch') || lowerText.includes('failed to fetch') || lowerText.includes('networkerror')) {
        return {
            isRateLimit: false,
            toastMessage: 'Network error. Check your connection.',
            chatMessage: '🌐 Network error. Please check your internet connection and try again.'
        };
    }
    
    // Check for server errors
    if (errorText.includes('500') || lowerText.includes('internal server')) {
        return {
            isRateLimit: false,
            toastMessage: 'Server error. Try again later.',
            chatMessage: '🔧 Server error occurred. Please try again in a few moments.'
        };
    }
    
    // Generic error with original message if it's meaningful
    const meaningfulError = errorText && errorText.length < 150 && !errorText.includes('undefined');
    return {
        isRateLimit: false,
        toastMessage: meaningfulError ? errorText : 'An error occurred. Please try again.',
        chatMessage: meaningfulError 
            ? `❌ Error: ${errorText}` 
            : 'Sorry, I encountered an error. Please check your API key in Settings and try again.'
    };
};

const ChatWithAssignment = ({ assignmentId, assignmentTitle }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [streamingMessage, setStreamingMessage] = useState('');
    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    // Load chat history on mount
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!assignmentId || !user?._id) {
                setLoadingHistory(false);
                return;
            }
            
            try {
                const res = await api.get(`/ai/chat-history/${assignmentId}?userId=${user._id}`);
                if (res.data?.messages?.length > 0) {
                    setMessages(res.data.messages);
                } else {
                    // Add welcome message if no history
                    setMessages([{
                        role: 'ai',
                        content: `Hi! I'm your AI assistant for "${assignmentTitle || 'this assignment'}". I have access to the full extracted content including all questions, figures, and diagrams. Ask me anything about the assignment!`
                    }]);
                }
            } catch (error) {
                console.error('Failed to load chat history:', error);
                // Add welcome message on error
                setMessages([{
                    role: 'ai',
                    content: `Hi! I'm your AI assistant for "${assignmentTitle || 'this assignment'}". I have access to the full extracted content including all questions, figures, and diagrams. Ask me anything about the assignment!`
                }]);
            } finally {
                setLoadingHistory(false);
            }
        };
        
        loadChatHistory();
    }, [assignmentId, user?._id, assignmentTitle]);

    // Save message to history
    const saveMessageToHistory = async (message) => {
        if (!assignmentId || !user?._id) return;
        
        try {
            await api.post('/ai/chat-history', {
                assignmentId,
                userId: user._id,
                assignmentTitle,
                message
            });
        } catch (error) {
            console.error('Failed to save message:', error);
        }
    };

    // Clear chat history
    const clearHistory = async () => {
        if (!confirm('Clear all chat history for this assignment?')) return;
        
        try {
            await api.delete(`/ai/chat-history/${assignmentId}?userId=${user._id}`);
            setMessages([{
                role: 'ai',
                content: `Hi! I'm your AI assistant for "${assignmentTitle || 'this assignment'}". Chat history cleared. Ask me anything!`
            }]);
            toast.success('Chat history cleared');
        } catch (error) {
            console.error('Failed to clear history:', error);
            toast.error('Failed to clear history');
        }
    };

    const stopStreaming = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (streamingMessage) {
            setMessages(prev => [...prev, { role: 'ai', content: streamingMessage }]);
            setStreamingMessage('');
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const apiKey = localStorage.getItem('groq_api_key');
        if (!apiKey) {
            toast.error("Groq API Key is missing!");
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '⚠️ Please set your Groq API Key in settings to chat.'
            }]);
            return;
        }

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        // Save user message to history
        saveMessageToHistory(userMessage);
        
        setInput('');
        setLoading(true);
        setStreamingMessage('');

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/ai/chat-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-groq-api-key': apiKey
                },
                body: JSON.stringify({
                    assignmentId,
                    question: input,
                    userId: user._id
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullMessage = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                // Parse error for rate limit info
                                const parsed = parseErrorMessage(data.error);
                                toast.error(parsed.toastMessage);
                                throw new Error(parsed.chatMessage);
                            }
                            
                            if (data.content) {
                                fullMessage += data.content;
                                setStreamingMessage(fullMessage);
                            }
                            
                            if (data.done) {
                                // Streaming complete
                                const aiMessage = { role: 'ai', content: fullMessage };
                                setMessages(prev => [...prev, aiMessage]);
                                setStreamingMessage('');
                                // Save AI response to history
                                saveMessageToHistory(aiMessage);
                            }
                        } catch (e) {
                            if (e.message) throw e; // Re-throw actual errors
                            // Skip invalid JSON
                        }
                    }
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled, message already added
                return;
            }
            
            console.error('Chat error:', error);
            
            // Parse error for user-friendly messages
            const errorMessage = error.message || error.toString() || 'Unknown error';
            const parsed = parseErrorMessage(errorMessage);
            
            // Show appropriate toast
            toast.error(parsed.toastMessage);

            setMessages(prev => [...prev, { role: 'ai', content: parsed.chatMessage }]);
            setStreamingMessage('');
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Suggested questions
    const suggestedQuestions = [
        "Summarize all the questions in this assignment",
        "Explain the key concepts I need to know",
        "What formulas do I need for this assignment?",
        "Help me understand question 1"
    ];

    const handleSuggestedClick = (question) => {
        setInput(question);
    };

    // Show loading state for history
    if (loadingHistory) {
        return (
            <div className="flex flex-col h-full bg-zinc-900/40 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-sm text-zinc-400 mt-2">Loading chat history...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900/40">
            {/* Header with clear button */}
            {messages.length > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <History size={14} />
                        <span>{messages.length} messages</span>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={12} />
                        Clear history
                    </button>
                </div>
            )}
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-100 border border-white/5'
                                }`}
                        >
                            {msg.role === 'ai' && (
                                <div className="flex items-center gap-2 mb-1 sm:mb-2 text-indigo-400 text-[10px] sm:text-xs font-medium">
                                    <Sparkles size={10} className="sm:w-3 sm:h-3" /> AI
                                </div>
                            )}
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {/* Streaming message */}
                {streamingMessage && (
                    <div className="flex justify-start">
                        <div className="max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 bg-zinc-800 text-zinc-100 border border-white/5">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-indigo-400 text-[10px] sm:text-xs font-medium">
                                <Sparkles size={10} className="sm:w-3 sm:h-3 animate-pulse" /> AI
                            </div>
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{streamingMessage}<span className="animate-pulse">▊</span></p>
                        </div>
                    </div>
                )}

                {loading && !streamingMessage && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 rounded-2xl px-4 py-3 border border-white/5 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span className="text-sm text-zinc-400">Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions (show only when few messages) */}
            {messages.length <= 2 && !loading && (
                <div className="px-3 sm:px-4 pb-2">
                    <p className="text-[10px] sm:text-xs text-zinc-500 mb-2">Try asking:</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {suggestedQuestions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestedClick(q)}
                                className="text-[10px] sm:text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-white/5 p-2 sm:p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask anything..."
                        disabled={loading}
                        className="flex-1 bg-zinc-800 text-white text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none disabled:opacity-50 placeholder-zinc-500"
                    />
                    {loading ? (
                        <button
                            onClick={stopStreaming}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-colors flex items-center gap-2"
                        >
                            <StopCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWithAssignment;
