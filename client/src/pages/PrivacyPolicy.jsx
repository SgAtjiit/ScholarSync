import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Database, Lock, Mail, RefreshCw } from "lucide-react";
import Footer from "../components/layout/Footer";
import useSEO from "../hooks/useSEO";

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    useSEO({ 
        title: 'Privacy Policy', 
        description: 'ScholarSync Privacy Policy - Learn how we protect your data and respect your privacy.' 
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
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] -z-10" />

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-2xl mb-6">
                            <Shield size={32} className="text-indigo-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-4">
                            Privacy Policy
                        </h1>
                        <p className="text-zinc-400">Last updated: December 8, 2025</p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8">
                        <PolicySection
                            icon={<Eye className="text-blue-400" />}
                            title="Information We Collect"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-4">
                                When you use ScholarSync, we collect the following information:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google Account Information:</strong> Your name, email address, and profile picture when you sign in with Google.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google Classroom Data:</strong> Assignment titles, descriptions, due dates, course information, and attachments that you choose to sync.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">API Keys:</strong> If you provide your own Groq API key, it is stored locally in your browser and never transmitted to our servers.</span>
                                </li>
                            </ul>
                        </PolicySection>

                        <PolicySection
                            icon={<Database className="text-purple-400" />}
                            title="How We Use Your Information"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-4">
                                We use the collected information to:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                    <span>Provide and maintain the ScholarSync service</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                    <span>Sync your Google Classroom assignments and materials</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                    <span>Generate AI-powered explanations, quizzes, and solutions</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                    <span>Save generated content to your Google Drive</span>
                                </li>
                            </ul>
                        </PolicySection>

                        <PolicySection
                            icon={<Lock className="text-green-400" />}
                            title="Data Security"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                We implement industry-standard security measures to protect your personal information. Your Google OAuth tokens are securely stored and encrypted. We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your Groq API key, if provided, is stored only in your browser's local storage and is never sent to our servers.
                            </p>
                        </PolicySection>

                        <PolicySection
                            icon={<RefreshCw className="text-orange-400" />}
                            title="Third-Party Services"
                        >
                            <p className="text-zinc-400 leading-relaxed mb-4">
                                ScholarSync integrates with the following third-party services:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google OAuth:</strong> For secure authentication</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google Classroom API:</strong> To fetch your assignments and course materials</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google Drive API:</strong> To save generated solutions to your Drive</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                                    <span><strong className="text-zinc-300">Google Gemini API:</strong> To power AI features</span>
                                </li>
                            </ul>
                        </PolicySection>

                        <PolicySection
                            icon={<Mail className="text-cyan-400" />}
                            title="Contact Us"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                If you have any questions about this Privacy Policy, please contact us at{" "}
                                <a href="mailto:support@scholarsync.app" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                    support@scholarsync.app
                                </a>
                            </p>
                        </PolicySection>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

const PolicySection = ({ icon, title, children }) => (
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

export default PrivacyPolicy;
