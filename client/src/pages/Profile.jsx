import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { Eye, EyeOff, Key, User, Mail, Edit3, ExternalLink, Copy, AlertCircle, Zap, RefreshCw } from "lucide-react";
import toast from 'react-hot-toast';
import useSEO from "../hooks/useSEO";

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://console.groq.com/keys');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  // Avatar: Use Google photoURL if available, else fallback to initials
  const avatarUrl = user?.photoURL;
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="max-w-4xl mx-auto mt-6 px-2 sm:px-4 md:px-8 w-full pb-12">
      <div className="bg-[#18181b] rounded-2xl shadow-xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-8 border-b border-zinc-800">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-20 h-20 rounded-full border-4 border-indigo-500 shadow-lg object-cover bg-zinc-800 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-indigo-700 text-white text-2xl font-bold border-4 border-indigo-500 shadow-lg flex-shrink-0">
                {initials}
              </div>
            )}
            
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{user?.name || "User"}</h1>
              <p className="text-zinc-400">{user?.email || "No email"}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* API Key Section - Now More Prominent */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg">
                <Key className="text-indigo-400" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Groq API Key</h2>
                <p className="text-xs text-zinc-500">Required for AI features</p>
              </div>
            </div>

            {/* Status */}
            <div className={`p-3 rounded-lg border flex gap-3 items-start ${
              apiKey 
                ? 'bg-green-600/10 border-green-600/30' 
                : 'bg-amber-600/10 border-amber-600/30'
            }`}>
              <AlertCircle size={18} className={`flex-shrink-0 mt-0.5 ${
                apiKey ? 'text-green-500' : 'text-amber-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${apiKey ? 'text-green-100' : 'text-amber-100'}`}>
                  {apiKey ? '✓ API Key is configured' : '⚠️ API Key not configured'}
                </p>
                <p className={`text-xs mt-1 ${apiKey ? 'text-green-100/70' : 'text-amber-100/70'}`}>
                  {apiKey 
                    ? 'Your AI features are enabled.' 
                    : 'Without an API key, you cannot use AI features like generating solutions, quizzes, and flashcards.'}
                </p>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Enter your API Key:</label>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="bg-zinc-900 text-white px-4 py-2.5 pr-10 rounded-lg w-full border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-400"
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button size="sm" className="w-full sm:w-auto" onClick={handleApiKeySave}>
                  Save Key
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3 border border-zinc-700">
              <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Zap size={16} /> How to get your API key?
              </p>
              <ol className="space-y-2 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <span>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1">console.groq.com/keys <ExternalLink size={14} /></a></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <span>Sign in with Google or email (free account)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <span>Click "Create New API Key" and copy it</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                  <span>Paste the key above and save</span>
                </li>
              </ol>
              <p className="text-xs text-zinc-500 italic pt-2">💡 Groq offers free API credits for new users!</p>
            </div>

            <div className="text-xs text-zinc-600 bg-zinc-900/50 p-3 rounded-lg">
              🔒 Your API key is stored locally in your browser and never sent to our servers.
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Classroom Sync Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <RefreshCw className="text-purple-400" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Google Classroom</h2>
                <p className="text-xs text-zinc-500">Sync your assignments</p>
              </div>
            </div>

            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 space-y-3">
              <p className="text-sm text-purple-100">
                <strong>How to sync assignments:</strong>
              </p>
              <ol className="space-y-2 text-sm text-purple-100">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 font-bold text-purple-300">1.</span>
                  <span>Go to <strong>Dashboard</strong> from the main menu</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 font-bold text-purple-300">2.</span>
                  <span>Click on a course to view assignments</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 font-bold text-purple-300">3.</span>
                  <span>Select an assignment to open the workspace</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 font-bold text-purple-300">4.</span>
                  <span>Use AI tools to generate solutions, quizzes, flashcards, etc.</span>
                </li>
              </ol>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Workspace Tips Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-600/20 rounded-lg">
                <Zap className="text-cyan-400" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Workspace Tips</h2>
                <p className="text-xs text-zinc-500">Get the most out of ScholarSync</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-300">
              <div className="bg-cyan-600/10 border border-cyan-600/30 rounded-lg p-4 space-y-2">
                <p className="text-cyan-100 font-semibold">📚 After opening an assignment:</p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span>💬</span>
                    <span><strong>Chat Tab:</strong> Ask questions about the assignment - AI has the full content</span>
                  </li>
                  <li className="flex gap-2">
                    <span>📄</span>
                    <span><strong>Document Tab:</strong> View PDFs/Documents with full content extracted</span>
                  </li>
                  <li className="flex gap-2">
                    <span>✨</span>
                    <span><strong>Left Panel:</strong> Generate solutions, quizzes, flashcards, study notes</span>
                  </li>
                  <li className="flex gap-2">
                    <span>📋</span>
                    <span><strong>Multiple Docs:</strong> Select which document to use for AI generation</span>
                  </li>
                </ul>
              </div>

              <div className="bg-cyan-600/10 border border-cyan-600/30 rounded-lg p-4 space-y-2">
                <p className="text-cyan-100 font-semibold">🎯 Navigation Guide:</p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span>🏠</span>
                    <span><strong>Dashboard:</strong> View all courses and assignments</span>
                  </li>
                  <li className="flex gap-2">
                    <span>⚙️</span>
                    <span><strong>Profile (Settings):</strong> Update API key & custom prompts</span>
                  </li>
                  <li className="flex gap-2">
                    <span>🔄</span>
                    <span><strong>Regenerate:</strong> Click to regenerate content with different variations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Custom Prompt Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <Edit3 className="text-orange-400" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Custom System Prompt</h2>
                <p className="text-xs text-zinc-500">Personalize AI responses</p>
              </div>
            </div>

            {editingPrompt ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">Tell the AI how you'd like it to respond:</p>
                <textarea
                  className="bg-zinc-900 text-white px-4 py-3 rounded-lg w-full border border-zinc-700 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  rows={4}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Write solutions in a friendly, step-by-step style with examples..."
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>Cancel</Button>
                  <Button size="sm" onClick={handlePromptSave}>Save Prompt</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div className="bg-zinc-900 text-zinc-300 px-4 py-3 rounded-lg w-full border border-zinc-700 min-h-[80px] text-sm">
                  {customPrompt || <span className="text-zinc-500 italic">No custom prompt set. Use default AI behavior.</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(true)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;