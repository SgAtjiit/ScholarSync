import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, FileText, CheckCircle, AlertTriangle, Scale, Ban, RefreshCw } from "lucide-react";
import Footer from "../components/layout/Footer";

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden selection:bg-indigo-500/30">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
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
            <main className="pt-28 pb-20 px-6">
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
                                ScholarSync is an educational tool designed to assist students with their coursework. By using our service, you agree to:
                            </p>
                            <ul className="space-y-3 text-zinc-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Use the service only for lawful educational purposes</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Not share your account credentials with others</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Comply with your institution's academic integrity policies</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                    <span>Not attempt to exploit, hack, or disrupt the service</span>
                                </li>
                            </ul>
                        </TermsSection>

                        <TermsSection
                            icon={<AlertTriangle className="text-yellow-400" />}
                            title="Academic Integrity Disclaimer"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                ScholarSync is designed to be a learning aid, not a tool for academic dishonesty. AI-generated solutions, explanations, and quizzes are meant to help you understand concepts and should be used responsibly. <strong className="text-zinc-300">You are solely responsible for ensuring that your use of ScholarSync complies with your institution's academic integrity policies.</strong> We are not liable for any academic consequences resulting from misuse of the service.
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
                                    <span>Submitting AI-generated content as entirely your own work without proper review and modification</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Using the service to complete work for others in exchange for payment</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Attempting to reverse engineer or exploit the AI systems</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                    <span>Using the service for any illegal or harmful purposes</span>
                                </li>
                            </ul>
                        </TermsSection>

                        <TermsSection
                            icon={<RefreshCw className="text-purple-400" />}
                            title="Service Availability"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                We strive to provide uninterrupted access to ScholarSync, but we do not guarantee that the service will be available at all times. We may modify, suspend, or discontinue any part of the service at any time without prior notice. We are not liable for any losses or damages resulting from service interruptions.
                            </p>
                        </TermsSection>

                        <TermsSection
                            icon={<FileText className="text-cyan-400" />}
                            title="Intellectual Property"
                        >
                            <p className="text-zinc-400 leading-relaxed">
                                The ScholarSync name, logo, and all related content are the property of ScholarSync. You retain ownership of your original content and any modifications you make to AI-generated content. By using our service, you grant us a limited license to process your content solely for the purpose of providing the service.
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
            </main>

            <Footer />
        </div>
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
