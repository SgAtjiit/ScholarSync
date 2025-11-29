import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { Sparkles, BookOpen, BrainCircuit, Zap, ShieldCheck, ArrowRight, Layers, MessageSquare, PenTool, FolderTree } from "lucide-react";
import Footer from "../components/layout/Footer";

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden selection:bg-indigo-500/30">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        ScholarSync
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/login')} className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">
                            Log in
                        </button>
                        <Button size="sm" onClick={() => navigate('/login')}>
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                {/* Background Gradients */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />

                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Now with Gemini 2.5 Flash Support
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                        Master your coursework with <span className="text-indigo-400">AI Superpowers</span>
                    </h1>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Seamlessly sync your Google Classroom assignments and let our advanced AI help you explain concepts, generate quizzes, and draft solutions in seconds.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-indigo-500/25" onClick={() => navigate('/login')}>
                            Start Learning Now <ArrowRight size={18} className="ml-2" />
                        </Button>
                        <button onClick={() => navigate('/login')} className="px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all border border-white/5">
                            View Demo
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-zinc-900/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Everything you need to excel</h2>
                        <p className="text-zinc-400">Powerful tools designed for the modern student.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<BookOpen className="text-blue-400" />}
                            title="Classroom Sync"
                            desc="Automatically fetch all your assignments, materials, and due dates from Google Classroom."
                        />
                        <FeatureCard
                            icon={<BrainCircuit className="text-purple-400" />}
                            title="AI Explanations"
                            desc="Get instant, easy-to-understand explanations for complex topics directly from your course materials."
                        />
                        <FeatureCard
                            icon={<Zap className="text-yellow-400" />}
                            title="Smart Quizzes"
                            desc="Turn any assignment into a practice quiz to test your knowledge before the exam."
                        />
                        <FeatureCard
                            icon={<Layers className="text-pink-400" />}
                            title="Smart Flashcards"
                            desc="Automatically generate flashcards from your study materials to master concepts quickly."
                        />
                        <FeatureCard
                            icon={<MessageSquare className="text-green-400" />}
                            title="Chat with Assignment"
                            desc="Have an interactive conversation with your assignment documents to clarify doubts instantly."
                        />
                        <FeatureCard
                            icon={<PenTool className="text-orange-400" />}
                            title="Draft Solutions"
                            desc="Get a head start with AI-drafted solutions that you can edit and refine before submitting."
                        />
                        <FeatureCard
                            icon={<FolderTree className="text-cyan-400" />}
                            title="Smart Organization"
                            desc="Keeps your Drive organized by automatically saving solutions to 'ScholarSync/Course/Assignment' folders."
                        />
                    </div>
                </div>
            </section>

            {/* BYOK Section */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-3xl font-bold">Your API Key, Your Rules</h2>
                            <p className="text-zinc-400 leading-relaxed">
                                We believe in privacy and control. Bring your own Gemini API key to unlock unlimited generations. Your key is stored locally on your device and never touches our servers.
                            </p>
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Secure Local Storage</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /> No Usage Limits from us</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Access to Latest Models</li>
                            </ul>
                        </div>
                        {/* <div className="flex-1 w-full">
                            <div className="bg-[#18181b] rounded-xl border border-zinc-800 p-6 shadow-2xl">
                                <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex gap-2">
                                        <span className="text-purple-400">const</span>
                                        <span className="text-blue-400">user</span>
                                        <span className="text-zinc-400">=</span>
                                        <span className="text-yellow-300">await</span>
                                        <span className="text-blue-300">login</span><span className="text-zinc-400">();</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-purple-400">const</span>
                                        <span className="text-blue-400">apiKey</span>
                                        <span className="text-zinc-400">=</span>
                                        <span className="text-green-400">"YOUR_GEMINI_KEY"</span><span className="text-zinc-400">;</span>
                                    </div>
                                    <div className="flex gap-2 pl-4 border-l-2 border-indigo-500/30">
                                        <span className="text-zinc-500">// Your key stays with you</span>
                                    </div>
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all hover:-translate-y-1 group">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

export default Landing;
