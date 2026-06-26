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
import { PROVIDERS, testConnection, cleanErrorMessage, getProviderTextModels, getProviderVisionModels } from "../services/llmService";
import {
  saveEncryptedKey,
  getDecryptedKey,
  hasVaultPIN,
  setVaultSentinel,
  checkVaultSentinel,
  initializeVault,
  migratePlaintextKeys,
  clearVault,
  isVaultUnlocked,
  getCachedPin,
  getSavedKeysMeta,
  removeEncryptedKey
} from "../utils/keyManager";

const PROVIDERS_META = {
  groq: {
    name: 'Groq Cloud',
    keyLink: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
    instruction: 'Visit the Groq console to create a free API key with ultra-fast inference speeds.'
  },
  openai: {
    name: 'OpenAI',
    keyLink: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    instruction: 'Create an API key from your OpenAI Platform account to use GPT models.'
  },
  openrouter: {
    name: 'OpenRouter',
    keyLink: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...',
    instruction: 'Generate a key from OpenRouter to access Claude, Llama, Gemini, and dozens of other open-source models.'
  },
  gemini: {
    name: 'Google Gemini',
    keyLink: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...',
    instruction: 'Create a key in Google AI Studio to use Gemini models (often includes a generous free tier).'
  },
  anthropic: {
    name: 'Anthropic Claude',
    keyLink: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
    instruction: 'Get a key from the Anthropic Console to experience Claude 3.5 Sonnet.'
  },
  ollama: {
    name: 'Local Ollama',
    keyLink: 'https://ollama.com',
    placeholder: 'http://localhost:11434',
    instruction: 'Run models locally on your computer. Download Ollama, start the app, and run "ollama run llama3" in your terminal.'
  }
};

const Profile = () => {
  useSEO({ 
    title: 'Profile Settings', 
    description: 'Manage your ScholarSync profile, API keys, and custom prompts.' 
  });

  const { user, connectClassroom, disconnectClassroom } = useAuth();
  
  // Settings States
  const [disconnecting, setDisconnecting] = useState(false);

  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [textModel, setTextModel] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [customTextModel, setCustomTextModel] = useState("");
  const [customVisionModel, setCustomVisionModel] = useState("");
  const [isCustomText, setIsCustomText] = useState(false);
  const [isCustomVision, setIsCustomVision] = useState(false);
  const [savedKeys, setSavedKeys] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const [customPrompt, setCustomPrompt] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);

  // Vault Security States
  const [hasPin, setHasPin] = useState(hasVaultPIN());
  const [isUnlocked, setIsUnlocked] = useState(isVaultUnlocked());
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [promptPin, setPromptPin] = useState("");
  const [promptShowPin, setPromptShowPin] = useState(false);
  
  // Local PIN states for Vault Security card inputs
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem("active_llm_provider") || "groq";
    setProvider(storedProvider);

    const storedKey = getDecryptedKey(storedProvider) || "";
    setApiKey(storedKey);

    const storedKeyName = localStorage.getItem(`ss_enc_${storedProvider}_key_name`) || "";
    setKeyName(storedKeyName);

    const storedOllamaUrl = localStorage.getItem("ollama_url") || "http://localhost:11434";
    setOllamaUrl(storedOllamaUrl);

    const activeTextModel = localStorage.getItem(`${storedProvider}_text_model`) || PROVIDERS[storedProvider]?.defaultModel || "";
    const activeVisionModel = localStorage.getItem(`${storedProvider}_vision_model`) || PROVIDERS[storedProvider]?.visionModel || "";

    const textOptions = getProviderTextModels(storedProvider);
    const visionOptions = getProviderVisionModels(storedProvider);

    if (textOptions.includes(activeTextModel)) {
      setTextModel(activeTextModel);
      setIsCustomText(false);
    } else {
      setTextModel("custom");
      setCustomTextModel(activeTextModel);
      setIsCustomText(true);
    }

    if (visionOptions.includes(activeVisionModel)) {
      setVisionModel(activeVisionModel);
      setIsCustomVision(false);
    } else {
      setVisionModel("custom");
      setCustomVisionModel(activeVisionModel);
      setIsCustomVision(true);
    }

    const storedPrompt = localStorage.getItem("custom_prompt") || "";
    setCustomPrompt(storedPrompt);

    setSavedKeys(getSavedKeysMeta());

    if (!storedKey && storedProvider !== 'ollama') {
      toast("AI API Key not set! AI features won't work.", {
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

  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect Google Classroom & Drive? This will remove all synced courses, assignments, and generated solutions from the app. Your manual assignments will not be affected.")) {
      setDisconnecting(true);
      const toastId = toast.loading("Disconnecting Classroom & Drive...");
      try {
        await disconnectClassroom();
        toast.success("Disconnected successfully!", { id: toastId });
      } catch (err) {
        toast.error("Failed to disconnect. Please try again.", { id: toastId });
      } finally {
        setDisconnecting(false);
      }
    }
  };


  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    const storedKey = getDecryptedKey(newProvider) || "";
    setApiKey(storedKey);

    const storedKeyName = localStorage.getItem(`ss_enc_${newProvider}_key_name`) || "";
    setKeyName(storedKeyName);
    
    const activeTextModel = localStorage.getItem(`${newProvider}_text_model`) || PROVIDERS[newProvider]?.defaultModel || "";
    const activeVisionModel = localStorage.getItem(`${newProvider}_vision_model`) || PROVIDERS[newProvider]?.visionModel || "";
    
    const textOptions = getProviderTextModels(newProvider);
    const visionOptions = getProviderVisionModels(newProvider);

    if (textOptions.includes(activeTextModel)) {
      setTextModel(activeTextModel);
      setIsCustomText(false);
    } else {
      setTextModel("custom");
      setCustomTextModel(activeTextModel);
      setIsCustomText(true);
    }

    if (visionOptions.includes(activeVisionModel)) {
      setVisionModel(activeVisionModel);
      setIsCustomVision(false);
    } else {
      setVisionModel("custom");
      setCustomVisionModel(activeVisionModel);
      setIsCustomVision(true);
    }
  };

  const saveModelsAndProvider = (txtModel, visModel) => {
    localStorage.setItem("active_llm_provider", provider);
    localStorage.setItem(`${provider}_text_model`, txtModel);
    localStorage.setItem(`${provider}_vision_model`, visModel);
  };

  const handleSaveConfig = async () => {
    if (provider !== 'ollama' && !apiKey.trim()) {
      toast.error(`API Key for ${PROVIDERS_META[provider]?.name || provider} cannot be empty!`);
      return;
    }

    if (provider !== 'ollama' && !keyName.trim()) {
      toast.error("Please enter a name for this API Key (e.g. 'My Fast Groq Key')");
      return;
    }

    const actualTextModel = isCustomText ? customTextModel : textModel;
    const actualVisionModel = isCustomVision ? customVisionModel : visionModel;

    if (!actualTextModel.trim()) {
      toast.error("Text/Normal model name cannot be empty!");
      return;
    }

    setTesting(true);
    const toastId = toast.loading("Verifying connection & credentials...");

    try {
      const res = await testConnection(provider, apiKey, actualTextModel, actualVisionModel, ollamaUrl);
      if (res.success) {
        toast.success("Connection verified successfully!", { id: toastId });
        
        if (provider === 'ollama') {
          localStorage.setItem('ollama_url', ollamaUrl);
          saveModelsAndProvider(actualTextModel, actualVisionModel);
        } else {
          // If we already have the PIN unlocked in this session, save silently
          const activePin = getCachedPin();
          if (activePin) {
            await saveEncryptedKey(provider, apiKey, activePin, keyName);
            await initializeVault(activePin);
            saveModelsAndProvider(actualTextModel, actualVisionModel);
            setSavedKeys(getSavedKeysMeta());
            setIsUnlocked(true);
            toast.success(`${PROVIDERS_META[provider]?.name || provider} configuration verified and saved successfully!`);
          } else {
            setPromptPin('');
            setShowPinPrompt(true);
          }
        }
      } else {
        toast.error(`Verification Failed: ${cleanErrorMessage(res.error)}`, { id: toastId, duration: 6000 });
      }
    } catch (err) {
      toast.error(`Verification error: ${cleanErrorMessage(err.message)}`, { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handlePinPromptSubmit = async (e) => {
    e.preventDefault();
    if (!promptPin.trim()) {
      toast.error("PIN cannot be empty");
      return;
    }
    if (!hasPin && promptPin.length < 4) {
      toast.error("Master PIN must be at least 4 characters long.");
      return;
    }

    const actualTextModel = isCustomText ? customTextModel : textModel;
    const actualVisionModel = isCustomVision ? customVisionModel : visionModel;

    const toastId = toast.loading("Saving and encrypting key...");
    try {
      if (!hasPin) {
        await setVaultSentinel(promptPin);
        setHasPin(true);
      } else {
        const isPinValid = await checkVaultSentinel(promptPin);
        if (!isPinValid) {
          toast.error("Incorrect Master PIN.", { id: toastId });
          return;
        }
      }

      await saveEncryptedKey(provider, apiKey, promptPin, keyName);
      await initializeVault(promptPin);
      saveModelsAndProvider(actualTextModel, actualVisionModel);
      setSavedKeys(getSavedKeysMeta());
      setIsUnlocked(true);
      setShowPinPrompt(false);
      toast.success(`${PROVIDERS_META[provider]?.name || provider} configuration verified and saved successfully!`, { id: toastId });
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`, { id: toastId });
    }
  };

  const handleDeleteKey = (providerToDelete) => {
    if (window.confirm(`Are you sure you want to delete the securely stored API key for ${PROVIDERS_META[providerToDelete]?.name || providerToDelete}?`)) {
      removeEncryptedKey(providerToDelete);
      setSavedKeys(getSavedKeysMeta());
      if (provider === providerToDelete) {
        setApiKey("");
        setKeyName("");
      }
      toast.success("API key deleted successfully!");
    }
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
                  <p className="text-sm text-zinc-400 mt-0.5">Manage your AI Provider & Model settings</p>
                </div>
              </div>
              
              {/* Status Badge */}
              {(apiKey || provider === 'ollama') ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold whitespace-nowrap">
                  <ShieldCheck size={14} /> Configured
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold whitespace-nowrap">
                  <AlertCircle size={14} /> Missing Configuration
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
                >
                  {Object.entries(PROVIDERS_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoint for Ollama */}
              {provider === 'ollama' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">Ollama Base Endpoint URL</label>
                  <input
                    type="text"
                    className="bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner font-mono"
                    value={ollamaUrl}
                    onChange={e => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                </div>
              ) : (
                /* API Key & Name Inputs */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                      API Key Name
                    </label>
                    <input
                      type="text"
                      className="bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
                      value={keyName}
                      onChange={e => setKeyName(e.target.value)}
                      placeholder="e.g. My Fast Groq Key"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                      {PROVIDERS_META[provider]?.name} API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        className="bg-[#09090b] text-zinc-100 px-4 py-3 pr-12 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm shadow-inner"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={PROVIDERS_META[provider]?.placeholder}
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
                  </div>
                </div>
              )}

              {/* Text Model Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                  Select Text/Normal Model
                </label>
                <select
                  value={textModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTextModel(val);
                    setIsCustomText(val === 'custom');
                  }}
                  className="bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
                >
                  {getProviderTextModels(provider).map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                  <option value="custom">-- Custom Model (Enter Name) --</option>
                </select>

                {isCustomText && (
                  <input
                    type="text"
                    placeholder="Enter custom text model name (e.g. gpt-4-32k)"
                    value={customTextModel}
                    onChange={(e) => setCustomTextModel(e.target.value)}
                    className="bg-[#09090b] text-zinc-100 px-4 py-3 mt-2 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-mono shadow-inner"
                  />
                )}
              </div>

              {/* Vision Model Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                  Select Vision Model
                </label>
                <select
                  value={visionModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVisionModel(val);
                    setIsCustomVision(val === 'custom');
                  }}
                  className="bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
                >
                  {getProviderVisionModels(provider).map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                  <option value="custom">-- Custom Model (Enter Name) --</option>
                </select>

                {isCustomVision && (
                  <input
                    type="text"
                    placeholder="Enter custom vision model name (e.g. gpt-4o-vision)"
                    value={customVisionModel}
                    onChange={(e) => setCustomVisionModel(e.target.value)}
                    className="bg-[#09090b] text-zinc-100 px-4 py-3 mt-2 rounded-xl w-full border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-mono shadow-inner"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={testing}
                  className="w-full py-3 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Testing Configuration...
                    </>
                  ) : (
                    "Test & Save Configuration"
                  )}
                </Button>
              </div>

              {/* Console Link / Instruction Link */}
              {provider !== 'ollama' && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-4">
                  <Cpu className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-indigo-200">Need an API key?</p>
                    <p className="text-xs text-zinc-400">
                      Visit the provider's console to generate a key:{' '}
                      <a 
                        href={PROVIDERS_META[provider]?.keyLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        {PROVIDERS_META[provider]?.name} Console <ExternalLink size={10} />
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved API Keys List Card */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <CheckCircle2 className="text-indigo-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Saved API Keys</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Manage your securely configured credentials</p>
              </div>
            </div>

            {savedKeys.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl bg-zinc-900/10">
                No secure API keys configured yet. Set up one above!
              </div>
            ) : (
              <div className="space-y-3">
                {savedKeys.map((keyMeta) => (
                  <div 
                    key={keyMeta.provider} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#09090b] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">
                        {keyMeta.keyName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-500/10">
                          {PROVIDERS_META[keyMeta.provider]?.name || keyMeta.provider}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Added: {new Date(keyMeta.addedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(keyMeta.provider)}
                      className="p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete Key"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vault Security Card */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <ShieldCheck className="text-indigo-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Vault Security</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">Encrypt and secure your local API keys</p>
                </div>
              </div>
              
              {/* Unlock status badge */}
              {hasPin ? (
                isUnlocked ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                    Unlocked
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                    Locked
                  </span>
                )
              ) : (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold animate-pulse">
                  Plaintext Keys
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* If no PIN setup yet */}
              {!hasPin ? (
                <div className="space-y-3">
                  <div className="text-sm text-zinc-300">
                    Your API keys are currently saved in plaintext. Secure them by creating a Master PIN.
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Set Master PIN (min 4 chars)"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      className="bg-[#09090b] text-zinc-100 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm font-mono tracking-widest flex-1"
                    />
                    <Button
                      onClick={async () => {
                        if (pin.length < 4) {
                          toast.error("PIN must be at least 4 characters");
                          return;
                        }
                        await migratePlaintextKeys(pin);
                        setHasPin(true);
                        setIsUnlocked(true);
                        setPin("");
                        toast.success("Vault secured and encrypted successfully!");
                      }}
                      className="rounded-xl px-4 py-2 text-xs"
                    >
                      Enable Encryption
                    </Button>
                  </div>
                </div>
              ) : (
                /* PIN configured */
                <div className="space-y-4">
                  {isUnlocked ? (
                    <div className="flex justify-between items-center bg-[#09090b] p-4 rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">Vault is active</p>
                        <p className="text-xs text-zinc-500">API keys are loaded in-memory and ready for use.</p>
                      </div>
                      <Button
                        onClick={() => {
                          clearVault();
                          setIsUnlocked(false);
                          setApiKey("");
                          toast.success("Vault locked! In-memory API keys cleared.");
                        }}
                        variant="secondary"
                        className="rounded-xl text-xs px-4 bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700/80 transition-all border"
                      >
                        Lock Vault
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-red-400">
                        Vault is locked. Enter Master PIN to unlock your keys.
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Enter Master PIN"
                          value={pin}
                          onChange={e => setPin(e.target.value)}
                          className="bg-[#09090b] text-zinc-100 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm font-mono tracking-widest flex-1"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              await initializeVault(pin);
                              setIsUnlocked(true);
                              // Reload active key
                              const activeKey = getDecryptedKey(provider) || "";
                              setApiKey(activeKey);
                              setPin("");
                              toast.success("Vault unlocked successfully!");
                            } catch (e) {
                              toast.error("Incorrect Master PIN");
                            }
                          }}
                          className="rounded-xl px-4 py-2 text-xs"
                        >
                          Unlock
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Change PIN section */}
                  {isUnlocked && (
                    <details className="text-xs text-zinc-500 cursor-pointer">
                      <summary className="hover:text-zinc-300 select-none">Change PIN / Reset Vault</summary>
                      <div className="mt-3 p-4 bg-[#09090b] border border-zinc-900 rounded-xl space-y-3 cursor-default">
                        <p className="text-zinc-400">To change your PIN, enter a new one below. It will re-encrypt all stored keys.</p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="New Master PIN"
                            id="new_pin_input"
                            className="bg-zinc-950 text-zinc-100 px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500 text-xs font-mono tracking-widest flex-1"
                          />
                          <Button
                            onClick={async () => {
                              const newPinVal = document.getElementById("new_pin_input").value;
                              if (!newPinVal || newPinVal.length < 4) {
                                toast.error("New PIN must be at least 4 characters long.");
                                return;
                              }
                              // Get all currently decrypted keys
                              const currentKeys = {};
                              const providers = ['groq', 'gemini', 'openai', 'anthropic', 'openrouter'];
                              providers.forEach(p => {
                                const key = getDecryptedKey(p);
                                if (key) currentKeys[p] = key;
                              });

                              // Set new sentinel
                              await setVaultSentinel(newPinVal);
                              
                              // Re-encrypt all keys
                              for (const p of providers) {
                                if (currentKeys[p]) {
                                  await saveEncryptedKey(p, currentKeys[p], newPinVal);
                                }
                              }

                              // Re-initialize vault with new pin
                              await initializeVault(newPinVal);
                              document.getElementById("new_pin_input").value = "";
                              toast.success("Master PIN changed and keys re-encrypted!");
                            }}
                            className="rounded-lg px-3 py-1.5 text-[10px]"
                          >
                            Update PIN
                          </Button>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
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

          {/* --- Google Classroom Connection Card --- */}
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <RefreshCw className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Google Classroom & Drive</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">Sync assignments and create draft Google Docs</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {user?.hasClassroomConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-3 flex-1">
                    <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-emerald-200">Integration Connected</p>
                      <p className="text-xs text-zinc-400">Classroom courses, coursework, and Drive scopes are linked. Disconnecting will revoke Google tokens and completely delete synced data from the database.</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleDisconnect}
                    variant="danger"
                    disabled={disconnecting}
                    loading={disconnecting}
                    className="w-full sm:w-auto py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <AlertCircle className="text-indigo-400 shrink-0" size={20} />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-indigo-200">Sync is optional</p>
                      <p className="text-xs text-zinc-400">
                        Without syncing, you can still create manual assignments, upload files, and download solutions. Syncing allows you to retrieve coursework from your official classes.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={connectClassroom}
                    className="w-full py-3 rounded-xl shadow-lg bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 flex items-center justify-center gap-2 text-white font-medium"
                  >
                    <RefreshCw size={16} />
                    Sync Google Classroom & Drive
                  </Button>
                </div>
              )}
            </div>
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
                    <p className="text-sm text-zinc-300 leading-relaxed mt-0.5">Go to your <strong>Dashboard</strong> to view linked courses or create manual assignments.</p>
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
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">✨</div>
                      <span className="text-sm font-semibold text-zinc-200">AI Response Tab</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">Explain / Quiz / Tutor</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 shadow-inner hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">📄</div>
                      <span className="text-sm font-semibold text-zinc-200">Assignment Tab</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">PDF Viewer</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#09090b] border border-white/5 shadow-inner hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-lg bg-white/5 p-2 rounded-lg border border-white/5">🛠️</div>
                      <span className="text-sm font-semibold text-zinc-200">AI Toolkit (Sidebar)</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">Extract / Mode Select</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* --- 3. API Usage Analytics (Moved to Bottom) --- */}
      <div className="rounded-3xl bg-[#121214] border border-white/5 shadow-xl overflow-hidden p-1 sm:p-2 mt-8">
        <ApiUsageCharts />
      </div>

      {/* Separate modal prompt for Master PIN upon save */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center cursor-default">
            {/* Shield Icon */}
            <div className="mx-auto w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {hasPin ? "Enter Master PIN" : "Create Master PIN"}
            </h3>
            <p className="text-zinc-400 text-xs mb-4">
              {hasPin
                ? "Verify your PIN to encrypt and store this key locally."
                : "Choose a Master PIN. This PIN encrypts all your local API keys and is never uploaded."}
            </p>
            <form onSubmit={handlePinPromptSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={promptShowPin ? "text" : "password"}
                  placeholder={hasPin ? "Enter PIN" : "Choose a PIN (min 4 chars)"}
                  value={promptPin}
                  onChange={(e) => setPromptPin(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-mono text-white tracking-widest focus:outline-none focus:border-indigo-500"
                  maxLength={20}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setPromptShowPin(!promptShowPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400"
                  tabIndex={-1}
                >
                  {promptShowPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPinPrompt(false)}
                  className="flex-1 text-xs py-2.5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 text-xs py-2.5 bg-white text-black hover:bg-zinc-200"
                >
                  {hasPin ? "Authorize" : "Set PIN & Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;