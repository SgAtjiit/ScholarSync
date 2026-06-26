import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { BookOpen, BrainCircuit, Zap, ShieldCheck, ArrowRight, Layers, MessageSquare, PenTool, FolderTree } from "lucide-react";
import Footer from "../components/layout/Footer";
import useSEO from "../hooks/useSEO";

const Landing = () => {
    const navigate = useNavigate();

    // Set page title and meta for SEO
    useSEO({
        title: null, // Use default title for homepage
        description: 'ScholarSync is the ultimate AI classroom manager for Google Classroom. Get AI explanations, quizzes, flashcards, and draft solutions for your assignments.'
    });

    return (
        <main className="min-h-screen bg-[#09090b] text-white overflow-x-hidden selection:bg-indigo-500/30">

            {/* Navbar */}
            <header>
                <nav className="fixed top-0 w-full z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-white/5" aria-label="Main navigation">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
                        <a href="/" className="flex items-center gap-2 font-bold text-base sm:text-xl tracking-tight" aria-label="ScholarSync Home">
                            <img src="/logo.png" alt="ScholarSync Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg" />
                            <span>ScholarSync</span>
                        </a>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => navigate('/login')} className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors font-medium">
                                Log in
                            </button>
                            <Button size="sm" onClick={() => navigate('/login')} className="text-xs sm:text-sm px-3 sm:px-4">
                                Get Started
                            </Button>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6" aria-labelledby="hero-heading">
                {/* Background Gradients */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[120px] -z-10" aria-hidden="true" />
                <div className="absolute bottom-0 right-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-600/10 rounded-full blur-[60px] sm:blur-[100px] -z-10" aria-hidden="true" />

                <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-8">
                    <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] sm:text-xs font-medium animate-fade-in">
                        <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2" aria-hidden="true">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 sm:h-2 w-1.5 sm:w-2 bg-indigo-500"></span>
                        </span>
                        Google Classroom × Google Drive × Custom Uploads × BYOK
                    </div>

                    <h1 id="hero-heading" className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 leading-tight">
                        AI-Powered Assignment Learning in <span className="text-indigo-400">One Calm Workspace</span>
                    </h1>

                    <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed px-2">
                        ScholarSync integrates your coursework, reads PDFs & diagrams using vision AI, and guides you with an interactive Socratic tutor. <strong>Classroom connection is completely optional</strong>—study classroom materials or upload your own files to work entirely independently.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                        <Button size="lg" className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base shadow-lg shadow-indigo-500/25 w-full sm:w-auto" onClick={() => navigate('/login')}>
                            Start Learning Now <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px] ml-2" aria-hidden="true" />
                        </Button>

                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-12 sm:py-24 bg-zinc-900/30 border-y border-white/5" aria-labelledby="features-heading">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-8 sm:mb-16">
                        <h2 id="features-heading" className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">AI Classroom & Learning Features</h2>
                        <p className="text-sm sm:text-base text-zinc-400">Advanced AI capabilities designed to help you understand your coursework, not just complete it.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        <FeatureCard
                            icon={<BookOpen className="text-blue-400" />}
                            title="Optional Classroom Sync"
                            desc="Sync courses, coursework, and submission status with Google Classroom. Disconnect at any time to wipe synced data."
                        />
                        <FeatureCard
                            icon={<Layers className="text-pink-400" />}
                            title="Direct Custom Uploads"
                            desc="Upload local PDF assignments directly to manual folders stored securely in Supabase storage for independent study."
                        />
                        <FeatureCard
                            icon={<BrainCircuit className="text-purple-400" />}
                            title="Vision AI Document Extraction"
                            desc="Rasterizes PDFs page-by-page. Reads both text and diagrams (circuits, graphs, figures) using advanced vision-capable LLMs."
                        />
                        <FeatureCard
                            icon={<MessageSquare className="text-emerald-400" />}
                            title="Interactive Socratic Tutor"
                            desc="Learn step-by-step. Get conceptual hints, worked analogies, and draft verification in a rich TipTap editor workspace."
                        />
                        <FeatureCard
                            icon={<Zap className="text-yellow-400" />}
                            title="Smart Quiz Generator"
                            desc="Customize question count, difficulty, and type. Test your knowledge with a structured, scored interactive quiz interface."
                        />
                        <FeatureCard
                            icon={<Layers className="text-pink-400" />}
                            title="AI Flashcard Generator"
                            desc="Instantly generate 10-15 front/back conceptual flipcards with an interactive flip-card review interface."
                        />
                        <FeatureCard
                            icon={<PenTool className="text-orange-400" />}
                            title="Google Docs Sync & Submission"
                            desc="Sync solutions back-and-forth with real Google Docs. Compiles solutions directly to organized Course/Assignment folders."
                        />
                        <FeatureCard
                            icon={<FolderTree className="text-cyan-400" />}
                            title="API Usage & Cost Analytics"
                            desc="Real-time usage dashboard tracking token count, estimated costs, and rate limiter status right in your browser."
                        />
                    </div>
                </div>
            </section>

            {/* BYOK Section */}
            <section className="py-12 sm:py-24 px-4 sm:px-6" aria-labelledby="byok-heading">
                <div className="max-w-5xl mx-auto bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-indigo-500/10 rounded-full blur-2xl sm:blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden="true" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                        <div className="flex-1 space-y-4 sm:space-y-6">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-2 sm:mb-4" aria-hidden="true">
                                <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <h2 id="byok-heading" className="text-xl sm:text-3xl font-bold">Bring Your Own Key — Client-Side Encryption</h2>
                            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                                ScholarSync uses a **Bring-Your-Own-Key (BYOK)** model. Provide your own API key for **Groq, OpenAI, Google Gemini, Anthropic, OpenRouter**, or connect a **local Ollama instance** key-free.
                            </p>
                            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                                Keys are **AES-256-GCM encrypted in the browser** using PBKDF2 derived from a student-chosen PIN. Plainsource credentials only live in session memory and fly directly to model endpoints—**never saved or visible to ScholarSync servers.**
                            </p>
                            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-zinc-300">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" /> AES-256-GCM + PBKDF2 Web Crypto Key Vault</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" /> Direct client-side inference to save costs & preserve privacy</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" /> Full support for 6 providers and custom model endpoints</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Content Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6 bg-zinc-900/20" aria-labelledby="seo-heading">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 id="seo-heading" className="text-xl sm:text-2xl font-bold text-zinc-300">
                        The Ultimate AI Assignment Study Workspace
                    </h2>
                    <div className="text-sm text-zinc-500 space-y-4 text-left max-w-3xl mx-auto">
                        <p>
                            <strong className="text-zinc-400">ScholarSync</strong> is a premium AI study manager and assignment assistant that integrates Google Classroom, Google Drive, custom local file uploads, and your own LLM keys.
                            With advanced client-side execution, you get vision-powered document parsing, quiz generators, flashcard compilers, and a Socratic teaching assistant in a secure, unified workspace.
                        </p>
                        <p>
                            Designed for privacy-minded students, the app supports complete classroom data-teardown, client-side AES key encryption, memory-safe file streams, and interactive document editing.
                            Use local offline LLMs with Ollama or major providers like Groq, Anthropic, Gemini, OpenAI, and OpenRouter.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <article className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all hover:-translate-y-1 group flex flex-col justify-between">
        <div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-zinc-800 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-zinc-700 transition-colors" aria-hidden="true">
                {icon}
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-white">{title}</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{desc}</p>
        </div>
    </article>
);

export default Landing;
