import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast'; // ✨ ADDED

const ChatWithPDF = ({ pdfFileId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        // 1. NEW CHECK
        if (!localStorage.getItem('groq_api_key')) {
            toast.error("Groq API Key is missing!"); // ✨ ADDED: Toast
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '⚠️ Please set your Groq API Key in settings to chat.'
            }]);
            return;
        }

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/ai/chat-pdf', {
                pdfFileId,
                question: input,
                userId: user._id
            });

            const aiMessage = { role: 'ai', content: res.data.answer };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);

            // 2. NEW ERROR HANDLING WITH TOASTS
            let errorMessage = 'Sorry, I encountered an error.';

            if (error.response && error.response.status === 401) {
                errorMessage = '⚠️ API Key missing or invalid. Please update it in Settings.';
                toast.error("Invalid API Key"); // ✨ ADDED
            } else {
                toast.error("Failed to get response"); // ✨ ADDED
            }

            setMessages(prev => [...prev, { role: 'ai', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!pdfFileId) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500">
                <p>No PDF available to chat with</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-900/40">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-zinc-500 mt-20">
                        <p className="text-lg font-medium mb-2">Chat with PDF</p>
                        <p className="text-sm">Ask me anything about this document!</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-100 border border-white/5'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 rounded-2xl px-4 py-3 border border-white/5">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/5 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question about the PDF..."
                        disabled={loading}
                        className="flex-1 bg-zinc-800 text-white px-4 py-3 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWithPDF;