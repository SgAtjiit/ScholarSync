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
                        Powered by LLaMA 3.3 70B via Groq
                    </div>

                    <h1 id="hero-heading" className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 leading-tight">
                        AI Classroom Manager - Master your coursework with <span className="text-indigo-400">AI Superpowers</span>
                    </h1>

                    <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed px-2">
                        ScholarSync is your intelligent AI classroom manager that seamlessly syncs with Google Classroom. Get AI-powered explanations, generate smart quizzes and flashcards, and draft assignment solutions in seconds.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                        <Button size="lg" className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base shadow-lg shadow-indigo-500/25 w-full sm:w-auto" onClick={() => navigate('/login')}>
                            Start Learning Now <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px] ml-2" aria-hidden="true" />
                        </Button>
                        <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm sm:text-base font-medium transition-all border border-white/5">
                            View Demo
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-12 sm:py-24 bg-zinc-900/30 border-y border-white/5" aria-labelledby="features-heading">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-8 sm:mb-16">
                        <h2 id="features-heading" className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">AI Classroom Manager Features</h2>
                        <p className="text-sm sm:text-base text-zinc-400">Powerful AI tools designed for the modern student to ace their assignments.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                        <FeatureCard
                            icon={<BookOpen className="text-blue-400" />}
                            title="Google Classroom Sync"
                            desc="Automatically fetch all your assignments, materials, and due dates from Google Classroom with one click."
                        />
                        <FeatureCard
                            icon={<BrainCircuit className="text-purple-400" />}
                            title="AI Explanations"
                            desc="Get instant, easy-to-understand AI explanations for complex topics directly from your course materials."
                        />
                        <FeatureCard
                            icon={<Zap className="text-yellow-400" />}
                            title="Smart Quiz Generator"
                            desc="Turn any assignment into a practice quiz to test your knowledge before the exam with AI-generated questions."
                        />
                        <FeatureCard
                            icon={<Layers className="text-pink-400" />}
                            title="AI Flashcard Generator"
                            desc="Automatically generate flashcards from your study materials to master concepts quickly and efficiently."
                        />
                        <FeatureCard
                            icon={<MessageSquare className="text-green-400" />}
                            title="Chat with Documents"
                            desc="Have an interactive AI conversation with your assignment documents and PDFs to clarify doubts instantly."
                        />
                        <FeatureCard
                            icon={<PenTool className="text-orange-400" />}
                            title="AI Solution Drafts"
                            desc="Get a head start with AI-drafted assignment solutions that you can edit and refine before submitting."
                        />
                        <FeatureCard
                            icon={<FolderTree className="text-cyan-400" />}
                            title="Google Drive Integration"
                            desc="Keeps your Google Drive organized by automatically saving solutions to 'ScholarSync/Course/Assignment' folders."
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
                            <h2 id="byok-heading" className="text-xl sm:text-3xl font-bold">Bring Your Own API Key - Privacy First</h2>
                            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                                We believe in privacy and control for our AI classroom manager. Bring your own Groq API key to unlock unlimited AI generations. Your key is stored locally on your device and sent per-request - never stored on our servers.
                            </p>
                            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-zinc-300">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" /> Secure Local Storage - 100% Private</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" /> No Usage Limits from ScholarSync</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" /> Access to Latest AI Models</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Content Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6 bg-zinc-900/20" aria-labelledby="seo-heading">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h2 id="seo-heading" className="text-xl sm:text-2xl font-bold text-zinc-300">
                        The Best AI Classroom Manager for Students
                    </h2>
                    <div className="text-sm text-zinc-500 space-y-4 text-left max-w-3xl mx-auto">
                        <p>
                            <strong className="text-zinc-400">ScholarSync</strong> is the ultimate AI classroom manager designed specifically for students using Google Classroom. 
                            Our intelligent assignment helper uses advanced AI to help you understand complex topics, generate practice quizzes and flashcards, 
                            and draft solutions for your assignments.
                        </p>
                        <p>
                            Whether you're looking for an <strong className="text-zinc-400">AI assignment helper</strong>, a <strong className="text-zinc-400">smart classroom manager</strong>, 
                            or a tool to <strong className="text-zinc-400">chat with your PDFs</strong>, ScholarSync has you covered. Our seamless Google Classroom integration 
                            means all your courses, assignments, and materials are automatically synced and organized.
                        </p>
                        <p>
                            Key features include: AI-powered explanations, smart quiz generator, flashcard creator, document chat, 
                            solution drafting, and automatic Google Drive organization. Start using the best <strong className="text-zinc-400">AI classroom manager</strong> today!
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <article className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all hover:-translate-y-1 group">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-zinc-800 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-zinc-700 transition-colors" aria-hidden="true">
            {icon}
        </div>
        <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">{title}</h3>
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{desc}</p>
    </article>
);

export default Landing;
