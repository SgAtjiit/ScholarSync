import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { 
  Eye, EyeOff, Key, User, Mail, Edit3, ExternalLink, 
  Copy, AlertCircle, Zap, RefreshCw, CheckCircle2, 
  TerminalSquare, BookOpen, ShieldCheck, Cpu
} from "lucide-react";
import toast from 'react-hot-toast';
import useSEO from "../hooks/useSEO";
import ApiUsageCharts from "../components/dashboard/ApiUsageCharts";

const Profile = () => {
  useSEO({ 
    title: 'Profile Settings', 
    description: 'Manage your ScholarSync profile, API keys, and custom prompts.' 
  });

  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key") || "";
    setApiKey(storedKey);
    const storedPrompt = localStorage.getItem("custom_prompt") || "";
    setCustomPrompt(storedPrompt);

    if (!storedKey) {
      toast("Groq API Key not set! AI features won't work.", {
        icon: '⚠️',
        style: {
          border: '1px solid #f97316',
          padding: '16px',
          color: '#fdba74',
          background: '#18181b',
        },
      });
    }
  }, []);

  const handleApiKeySave = () => {
    if (!apiKey.trim()) {
      toast.error("API Key cannot be empty!");
      return;
    }
    localStorage.setItem("groq_api_key", apiKey);
    toast.success("Groq API Key updated successfully!");
  };

  const handlePromptSave = () => {
    localStorage.setItem("custom_prompt", customPrompt);
    setEditingPrompt(false);
    toast.success("Custom prompt saved!");
  };

  // Avatar: Use Google photoURL if available, else fallback to initials
  const avatarUrl = user?.photoURL;
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-20">
      
      {/* --- 1. Premium Profile Header --- */}
      <div className="relative overflow-hidden rounded-3xl bg-[#121214] border border-white/5 shadow-2xl">
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Container */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-md opacity-50"></div>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#1a1a1e] object-cover bg-zinc-800 z-10"
              />
            ) : (
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-3xl font-bold border-2 border-[#1a1a1e] shadow-xl z-10">
                {initials}
              </div>
            )}
          </div>
          
          {/* User Details */}
          <div className="flex-1 text-center sm:text-left pt-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              {user?.name || "User"}
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm backdrop-blur-md">
              <Mail size={14} className="text-zinc-400" />
              <span>{user?.email || "No email provided"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. Main Configuration Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: Settings (Col span 7) */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          
          {/* API Configuration Card */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <Key className="text-indigo-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">API Configuration</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">Manage your Groq API access securely</p>
                </div>
              </div>
              
              {/* Status Badge */}
              {apiKey ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold whitespace-nowrap">
                  <ShieldCheck size={14} /> Connected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold whitespace-nowrap">
                  <AlertCircle size={14} /> Missing Key
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">Groq API Key</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      className="bg-[#09090b] text-zinc-100 px-4 py-3 pr-12 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm shadow-inner"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="gsk_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button onClick={handleApiKeySave} className="w-full sm:w-auto px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20">
                    Save Key
                  </Button>
                </div>
              </div>

              {/* Refined Instructions */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 sm:p-5 flex gap-4">
                <Cpu className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-indigo-200">How to get your free API key:</p>
                  <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside marker:text-indigo-500/50">
                    <li>Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 font-medium">console.groq.com <ExternalLink size={10} /></a></li>
                    <li>Sign in and click "Create New API Key"</li>
                    <li>Paste the key above. It is stored locally and never sent to our servers.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* System Prompt Card */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                  <TerminalSquare className="text-orange-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">System Prompt</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">Customize how the AI responds to you</p>
                </div>
              </div>
              {!editingPrompt && (
                <Button size="sm" variant="secondary" onClick={() => setEditingPrompt(true)} className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
                  <Edit3 size={14} className="mr-2" /> Edit
                </Button>
              )}
            </div>

            {editingPrompt ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <textarea
                  className="bg-[#09090b] text-zinc-300 px-4 py-4 rounded-xl w-full border border-white/10 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-sm resize-none font-mono leading-relaxed shadow-inner"
                  rows={5}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Act as a strict professor. Always explain mathematical steps in detail..."
                />
                <div className="flex justify-end gap-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)} className="hover:bg-white/5 rounded-xl">Cancel</Button>
                  <Button size="sm" onClick={handlePromptSave} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20">
                    Save Prompt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-[#09090b] border border-white/5 rounded-xl p-5 min-h-[100px] text-sm text-zinc-300 font-mono shadow-inner">
                {customPrompt ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{customPrompt}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-4">
                    <TerminalSquare size={24} className="opacity-50" />
                    <p className="italic">No custom rules set. The AI will use default academic behavior.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Guides (Col span 5) */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          
          {/* Quick Guides Card */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                <BookOpen className="text-cyan-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Quick Guides</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Master your workspace</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Sync Guide */}
              <div className="group">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2.5 mb-4 uppercase tracking-wider">
                  <RefreshCw size={16} className="text-purple-400" />
                  Classroom Sync
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#09090b] border border-white/10 text-zinc-400 flex items-center justify-center font-bold text-xs shadow-inner">1</span>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-0.5">Go to your <strong>Dashboard</strong> to view linked courses.</p>
                  </div>
                  <div className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#09090b] border border-white/10 text-zinc-400 flex items-center justify-center font-bold text-xs shadow-inner">2</span>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-0.5">Select a course, then click on any assignment to open the AI workspace.</p>
                  </div>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Workspace Navigation */}
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2.5 mb-4 uppercase tracking-wider">
                  <Zap size={16} className="text-cyan-400" />
                  Workspace Tools
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 shadow-inner hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">💬</div>
                      <span className="text-sm font-semibold text-zinc-200">Chat Tab</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">Q&A</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 shadow-inner hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">📄</div>
                      <span className="text-sm font-semibold text-zinc-200">Doc Tab</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">Source Files</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 shadow-inner hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">✨</div>
                      <span className="text-sm font-semibold text-zinc-200">AI Toolkit</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">Generator</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* --- 3. API Usage Analytics (Moved to Bottom) --- */}
      <div className="rounded-3xl bg-[#121214] border border-white/5 shadow-xl overflow-hidden p-1 sm:p-2">
        <ApiUsageCharts />
      </div>

    </div>
  );
};

export default Profile;