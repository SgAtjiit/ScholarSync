import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { Eye, EyeOff, Key, User, Mail, Edit3 } from "lucide-react";
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key") || "";
    setApiKey(storedKey);
    const storedPrompt = localStorage.getItem("custom_prompt") || "";
    setCustomPrompt(storedPrompt);

    if (!storedKey) {
      toast("Gemini API Key not set! Please update your settings.", {
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
    localStorage.setItem("gemini_api_key", apiKey);
    toast.success("Gemini API Key updated successfully!");
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
    <div className="max-w-2xl mx-auto mt-8 px-2 sm:px-4 md:px-8 w-full">
      <div className="bg-[#18181b] rounded-2xl shadow-xl p-4 sm:p-8 space-y-8 animate-fade-in border border-zinc-800">
        {/* Avatar in the center */}
        <div className="flex justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-24 h-24 rounded-full border-4 border-indigo-500 shadow-lg object-cover bg-zinc-800"
            />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-indigo-700 text-white text-3xl font-bold border-4 border-indigo-500 shadow-lg">
              {initials}
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 text-center">Profile</h2>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex flex-col items-center gap-2 justify-center">
            <div className="flex items-center gap-2">
              <User className="text-indigo-400" size={22} />
              <span className="text-white font-semibold text-lg">{user?.name || "User"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="text-indigo-400" size={22} />
              <span className="text-zinc-300 text-base">{user?.email || "No email"}</span>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* API Key Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="text-indigo-400" size={20} />
              <span className="text-white font-medium">Gemini API Key:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  className="bg-zinc-900 text-white px-3 py-2 pr-10 rounded-lg w-full border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API Key"
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
              <Button size="sm" className="w-full sm:w-auto" onClick={handleApiKeySave}>Save</Button>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Custom Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Edit3 className="text-indigo-400" size={20} />
              <span className="text-white font-medium">Custom System Prompt:</span>
            </div>
            {editingPrompt ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="bg-zinc-900 text-white px-3 py-2 rounded-lg w-full border border-zinc-700 focus:outline-none focus:border-indigo-500 text-sm"
                  rows={3}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Write solutions in a friendly, step-by-step style..."
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>Cancel</Button>
                  <Button size="sm" onClick={handlePromptSave}>Save Prompt</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div className="bg-zinc-900 text-zinc-300 px-3 py-2 rounded-lg w-full border border-zinc-700 min-h-[48px] text-sm">
                  {customPrompt || <span className="text-zinc-500 italic">No custom prompt set.</span>}
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