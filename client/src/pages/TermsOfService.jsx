import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Scale, Ban, RefreshCw, Lock } from "lucide-react";
import Footer from "../components/layout/Footer";
import useSEO from "../hooks/useSEO";

const TermsOfService = () => {
    const navigate = useNavigate();
    useSEO({ 
        title: 'Terms of Service', 
        description: 'ScholarSync Terms of Service - Read our terms and conditions for using the AI classroom manager.' 
    });

    return (
        <main className="min-h-screen bg-[#09090b] text-white overflow-x-hidden selection:bg-indigo-500/30">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="ScholarSync Logo" className="w-8 h-8 rounded-lg" />
                        ScholarSync
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                </div>
            </nav>

            {/* Content */}
            <section className="pt-28 pb-20 px-6">
                {/* Background Gradients */}
                <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] -z-10" />

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-6">
                            <FileText size={32} className="text-purple-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-zinc-400">Last updated: December 8, 2025</p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8">
                        <TermsSection
                            icon={<CheckCircle className="text-green-400" />}
                            title="Acceptance of Terms"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                By accessing and using ScholarSync, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and your continued use of the service constitutes acceptance of any changes.
                            </p>
                        </TermsSection>

                        <TermsSection
                            icon={<Scale className="text-blue-400" />}
                            title="Use of Service"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-4">
                                ScholarSync is an educational tool designed to assist students with their coursework and learning. By using our service, you agree to:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Use the service only for lawful educational purposes and in compliance with school rules.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Maintain responsibility for any files manually uploaded to our storage (Supabase) or compiled to Google Drive.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Comply with your institution's academic integrity policies.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Provide valid and secure API keys when utilizing the Bring-Your-Own-Key (BYOK) features.</span>
                                </li>
                            </ul>
                        </TermsSection>

                        <TermsSection
                            icon={<AlertTriangle className="text-yellow-400" />}
                            title="Academic Integrity & Socratic Assistant"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-3">
                                ScholarSync is designed as a socratic study aid, not a tool for plagiarism or cheating. Features like the **AI Socratic Tutor** are explicitly structured to guide you step-by-step using conceptual hints, templates, and worked analogies rather than spoon-feeding direct homework answers.
                            </p>
                            <p className="text-zinc-400 leading-relaxed">
                                AI-generated explanations, quizzes, and flashcards are meant to deepen your understanding. <strong className="text-zinc-300">You are solely responsible for ensuring that your use of ScholarSync aligns with your school's or institution's honor code and academic integrity rules.</strong> We are not liable for any disciplinary or academic consequences resulting from misuse of this software.
                            </p>
                        </TermsSection>

                        <TermsSection
                            icon={<Lock className="text-indigo-400" />}
                            title="Bring-Your-Own-Key (BYOK) Responsibility"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-3">
                                ScholarSync operates on a Bring-Your-Own-Key (BYOK) model. Users supply their own API keys from Groq, OpenAI, Google, Anthropic, or OpenRouter, or run a local Ollama endpoint.
                            </p>
                            <p className="text-zinc-400 leading-relaxed">
                                You agree that you are solely responsible for any costs, usage limits, rate limits, or account suspensions associated with the third-party API keys you provide. ScholarSync is not responsible for provider charges or key misuse.
                            </p>
                        </TermsSection>

                        <TermsSection
                            icon={<Ban className="text-red-400" />}
                            title="Prohibited Activities"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-4">
                                The following activities are strictly prohibited:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Submitting raw, unreviewed AI outputs directly as your original academic work.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Exploiting the vision document extraction system or trying to circumvent prompt restrictions (e.g. attempting to extract hidden answer keys).</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Reverse engineering, scraping, or launching denial-of-service attempts against ScholarSync endpoints.</span>
                                </li>
                            </ul>
                        </TermsSection>

                        <TermsSection
                            icon={<RefreshCw className="text-purple-400" />}
                            title="Service Availability"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                We strive to provide consistent access to ScholarSync, but we do not guarantee uninterrupted availability. As a client-side execution platform, service is subject to your network connection and third-party API availability. We may modify or discontinue any part of the service without notice.
                            </p>
                        </TermsSection>

                        <TermsSection
                            icon={<FileText className="text-cyan-400" />}
                            title="Intellectual Property"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                The ScholarSync name, logo, and client codebase are properties of the project owners. You retain ownership of your original uploaded assignments, your manual study materials, and any finalized documents you compile and sync back to your personal Google Drive or Google Docs accounts.
                            </p>
                        </TermsSection>

                        {/* Contact Section */}
                        <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                            <h2 className="text-xl font-bold mb-3">Questions?</h2>
                            <p className="text-zinc-400 leading-relaxed">
                                If you have any questions about these Terms of Service, please contact us at{" "}
                                <a href="mailto:support@scholarsync.app" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                    support@scholarsync.app
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

const TermsSection = ({ icon, title, children }) => (
    <div className="p-6 md:p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                {icon}
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {children}
    </div>
);

export default TermsOfService;
