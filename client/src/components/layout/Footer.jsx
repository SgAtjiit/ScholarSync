import { Github, Twitter, Linkedin, Heart } from "lucide-react";

const Footer = () => {
    return (
        <footer className="w-full border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                ScholarSync
                            </span>
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                            Your AI-powered academic companion. Seamlessly integrate Google Classroom with advanced AI tools to master your coursework.
                        </p>
                    </div>

                    <div>
                        {/* <h4 className="text-white font-semibold mb-4">Product</h4> */}
                        <ul className="space-y-2 text-sm text-zinc-400">
                            {/* <li><a href="#" className="hover:text-indigo-400 transition-colors"></a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors"></a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors"></a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors"></a></li> */}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Cookie Policy</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-500 text-xs">
                        © {new Date().getFullYear()} ScholarSync. Made by <span className="text-indigo-400 font-medium">Shrish Gupta</span>.
                    </p>

                    <div className="flex items-center gap-6">
                        <a href="#" className="text-zinc-400 hover:text-white transition-colors"><Github size={18} /></a>
                        <a href="#" className="text-zinc-400 hover:text-blue-400 transition-colors"><Twitter size={18} /></a>
                        <a href="#" className="text-zinc-400 hover:text-blue-600 transition-colors"><Linkedin size={18} /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
