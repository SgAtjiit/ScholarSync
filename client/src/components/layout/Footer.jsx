import { Github, Twitter, Linkedin, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="w-full border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
                    <div className="col-span-1 sm:col-span-2">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                ScholarSync
                            </span>
                        </h3>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xs">
                            Your AI-powered academic companion. Seamlessly integrate Google Classroom with advanced AI tools to master your coursework.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link to="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link></li>
                            <li><Link to="/profile" className="hover:text-indigo-400 transition-colors">Profile</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link to="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                    <p className="text-zinc-500 text-[10px] sm:text-xs text-center sm:text-left">
                        © {new Date().getFullYear()} ScholarSync. Made with <Heart size={12} className="inline text-red-400" /> by <span className="text-indigo-400 font-medium">Shrish Gupta</span>.
                    </p>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"><Github size={16} className="sm:w-[18px] sm:h-[18px]" /></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-400 transition-colors p-1 hover:bg-blue-400/5 rounded-lg"><Twitter size={16} className="sm:w-[18px] sm:h-[18px]" /></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-600/5 rounded-lg"><Linkedin size={16} className="sm:w-[18px] sm:h-[18px]" /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
