import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { Eye, EyeOff, Key, User, Mail, AlertTriangle, Edit3 } from "lucide-react";
import toast from 'react-hot-toast'; // ✨ ADDED

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
      // ✨ REPLACED: alert -> Custom Toast Warning
      toast("Gemini API Key not set! Please update your settings.", {
        icon: '⚠️',
        style: {
          border: '1px solid #f97316', // orange-500
          padding: '16px',
          color: '#fdba74', // orange-300
          background: '#18181b',
        },
      });
    }
  }, []);

  const handleApiKeySave = () => {
    localStorage.setItem("gemini_api_key", apiKey);
    // ✨ REPLACED: alert -> toast.success
    toast.success("Gemini API Key updated successfully!");
  };

  const handlePromptSave = () => {
    localStorage.setItem("custom_prompt", customPrompt);
    setEditingPrompt(false);
    // ✨ REPLACED: alert -> toast.success
    toast.success("Custom prompt saved!");
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-[#18181b] rounded-xl shadow-lg p-8 space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-4">Profile</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <User className="text-indigo-400" size={20} />
          <span className="text-white font-medium">{user.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="text-indigo-400" size={20} />
          <span className="text-zinc-300">{user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Key className="text-indigo-400" size={20} />
          <span className="text-white font-medium">Gemini API Key:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type={showApiKey ? "text" : "password"}
            className="bg-zinc-900 text-white px-3 py-2 rounded-lg w-full border border-zinc-700 focus:outline-none"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter Gemini API Key"
          />
          <button
            onClick={() => setShowApiKey(v => !v)}
            className="text-zinc-400 hover:text-indigo-400"
            {editingPrompt ? (
              <div className="flex gap-2">
                <textarea
                  className="bg-zinc-900 text-white px-3 py-2 rounded-lg w-full border border-zinc-700 focus:outline-none"
                  rows={3}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Write solutions in a friendly, step-by-step style... . But Currently not linked to backend"
                />
                <Button size="sm" onClick={handlePromptSave}>Save</Button>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div className="bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg w-full border border-zinc-700 min-h-[48px]">
                  {customPrompt || <span className="text-zinc-500">No custom prompt set.</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(true)}>
                  Edit
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Profile;