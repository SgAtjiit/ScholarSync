// client/src/pages/APIKeySetup.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Check, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import useSEO from '../hooks/useSEO';
import { PROVIDERS, testConnection, cleanErrorMessage, getProviderTextModels, getProviderVisionModels } from '../services/llmService';
import {
  saveEncryptedKey,
  getDecryptedKey,
  hasVaultPIN,
  setVaultSentinel,
  checkVaultSentinel,
  initializeVault,
  hasKeysSaved,
  migratePlaintextKeys,
  getCachedPin
} from '../utils/keyManager';

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

const APIKeySetup = () => {
  useSEO({
    title: 'Setup AI Provider',
    description: 'Configure your preferred AI provider (Groq, OpenAI, OpenRouter, Gemini, Anthropic, or Ollama) for ScholarSync features.'
  });

  const navigate = useNavigate();
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Model Configuration States
  const [textModel, setTextModel] = useState('');
  const [visionModel, setVisionModel] = useState('');
  const [customTextModel, setCustomTextModel] = useState('');
  const [customVisionModel, setCustomVisionModel] = useState('');
  const [isCustomText, setIsCustomText] = useState(false);
  const [isCustomVision, setIsCustomVision] = useState(false);

  const [testing, setTesting] = useState(false);

  // Vault Security States
  const [hasPin, setHasPin] = useState(hasVaultPIN());
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [promptPin, setPromptPin] = useState('');
  const [promptShowPin, setPromptShowPin] = useState(false);

  // Temporary PIN state for legacy migration input
  const [migrationPin, setMigrationPin] = useState('');

  // Load saved key/config for the active provider
  useEffect(() => {
    const storedProvider = localStorage.getItem('active_llm_provider') || 'groq';
    setProvider(storedProvider);
    
    // Retrieve decrypted key from session vault if available
    const storedKey = getDecryptedKey(storedProvider) || getDecryptedKey('groq');
    if (storedKey) {
      setApiKey(storedKey);
      setSaved(true);
    } else {
      setApiKey('');
      setSaved(false);
    }

    const storedKeyName = localStorage.getItem(`ss_enc_${storedProvider}_key_name`) || '';
    setKeyName(storedKeyName);

    const storedOllamaUrl = localStorage.getItem('ollama_url');
    if (storedOllamaUrl) {
      setOllamaUrl(storedOllamaUrl);
    }

    // Set model selections
    const activeTextModel = localStorage.getItem(`${storedProvider}_text_model`) || PROVIDERS[storedProvider]?.defaultModel || '';
    const activeVisionModel = localStorage.getItem(`${storedProvider}_vision_model`) || PROVIDERS[storedProvider]?.visionModel || '';
    
    const textOptions = getProviderTextModels(storedProvider);
    const visionOptions = getProviderVisionModels(storedProvider);

    if (textOptions.includes(activeTextModel)) {
      setTextModel(activeTextModel);
      setIsCustomText(false);
    } else {
      setTextModel('custom');
      setCustomTextModel(activeTextModel);
      setIsCustomText(true);
    }

    if (visionOptions.includes(activeVisionModel)) {
      setVisionModel(activeVisionModel);
      setIsCustomVision(false);
    } else {
      setVisionModel('custom');
      setCustomVisionModel(activeVisionModel);
      setIsCustomVision(true);
    }
  }, []);

  // Update form fields when provider changes
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    localStorage.setItem('active_llm_provider', newProvider);
    
    const storedKey = getDecryptedKey(newProvider) || '';
    if (storedKey) {
      setApiKey(storedKey);
      setSaved(true);
    } else {
      setApiKey('');
      setSaved(false);
    }

    const storedKeyName = localStorage.getItem(`ss_enc_${newProvider}_key_name`) || '';
    setKeyName(storedKeyName);

    // Handle provider model lists
    const activeTextModel = localStorage.getItem(`${newProvider}_text_model`) || PROVIDERS[newProvider]?.defaultModel || '';
    const activeVisionModel = localStorage.getItem(`${newProvider}_vision_model`) || PROVIDERS[newProvider]?.visionModel || '';
    
    const textOptions = getProviderTextModels(newProvider);
    const visionOptions = getProviderVisionModels(newProvider);

    if (textOptions.includes(activeTextModel)) {
      setTextModel(activeTextModel);
      setIsCustomText(false);
    } else {
      setTextModel('custom');
      setCustomTextModel(activeTextModel);
      setIsCustomText(true);
    }

    if (visionOptions.includes(activeVisionModel)) {
      setVisionModel(activeVisionModel);
      setIsCustomVision(false);
    } else {
      setVisionModel('custom');
      setCustomVisionModel(activeVisionModel);
      setIsCustomVision(true);
    }
  };

  const saveModelsAndProvider = (txtModel, visModel) => {
    localStorage.setItem(`${provider}_text_model`, txtModel);
    localStorage.setItem(`${provider}_vision_model`, visModel);
    localStorage.setItem('active_llm_provider', provider);
    setSaved(true);
    localStorage.setItem('hasCompletedAPIKeySetup', 'true');
  };

  const handleSaveConfig = async () => {
    if (provider !== 'ollama' && !apiKey.trim()) {
      toast.error(`Please enter an API Key for ${PROVIDERS_META[provider].name}`);
      return;
    }
    if (provider !== 'ollama' && !keyName.trim()) {
      toast.error('Please enter a name for this API Key (e.g. "My Primary Key")');
      return;
    }
    if (provider === 'ollama' && !ollamaUrl.trim()) {
      toast.error('Please enter your Ollama endpoint URL');
      return;
    }

    const actualTextModel = isCustomText ? customTextModel : textModel;
    const actualVisionModel = isCustomVision ? customVisionModel : visionModel;

    if (!actualTextModel.trim()) {
      toast.error('Text model name cannot be empty');
      return;
    }

    setTesting(true);
    const toastId = toast.loading('Testing LLM provider connectivity...');

    try {
      const res = await testConnection(provider, apiKey, actualTextModel, actualVisionModel, ollamaUrl);
      if (res.success) {
        toast.success('Connection verified successfully!', { id: toastId });
        
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
            toast.success(`${PROVIDERS_META[provider].name} configuration updated securely!`);
          } else {
            // Prompt the user for their Master PIN via modal
            setPromptPin('');
            setShowPinPrompt(true);
          }
        }
      } else {
        toast.error(`Connection test failed: ${cleanErrorMessage(res.error)}`, { id: toastId, duration: 6000 });
      }
    } catch (err) {
      toast.error(`Connection verification error: ${cleanErrorMessage(err.message)}`, { id: toastId });
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

    const toastId = toast.loading("Encrypting and saving key...");
    try {
      if (!hasPin) {
        // Set new Master PIN
        await setVaultSentinel(promptPin);
        setHasPin(true);
      } else {
        // Verify PIN is correct
        const isPinValid = await checkVaultSentinel(promptPin);
        if (!isPinValid) {
          toast.error("Incorrect Master PIN. Key update unauthorized.", { id: toastId });
          return;
        }
      }

      await saveEncryptedKey(provider, apiKey, promptPin, keyName);
      await initializeVault(promptPin);
      saveModelsAndProvider(actualTextModel, actualVisionModel);
      setShowPinPrompt(false);
      toast.success(`${PROVIDERS_META[provider].name} configuration saved securely!`, { id: toastId });
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`, { id: toastId });
    }
  };

  const handleMigrate = async () => {
    if (!migrationPin.trim()) {
      toast.error('Please enter a PIN to secure your keys');
      return;
    }
    if (migrationPin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }

    setTesting(true);
    const toastId = toast.loading('Encrypting existing keys...');
    try {
      await migratePlaintextKeys(migrationPin);
      setHasPin(true);
      setSaved(true);
      toast.success('All existing keys encrypted successfully!', { id: toastId });
      
      // Load keys into the inputs
      const storedKey = getDecryptedKey(provider) || '';
      if (storedKey) setApiKey(storedKey);
    } catch (e) {
      toast.error('Failed to encrypt keys: ' + e.message, { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasCompletedAPIKeySetup', 'true');
    navigate('/dashboard');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(PROVIDERS_META[provider].keyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Console URL copied!');
  };

  const handleContinue = () => {
    if (saved || provider === 'ollama' || apiKey.trim()) {
      navigate('/dashboard');
    } else {
      toast.error('Please save your key or config first');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] relative overflow-hidden px-4 py-8">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-purple-600/10 rounded-full blur-[60px] sm:blur-[100px]" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
            <p className="text-xs text-zinc-400 mt-2">Login</p>
          </div>
          <div className="flex-1 h-px bg-zinc-800"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">2</div>
            <p className="text-xs text-zinc-400 mt-2">AI Config</p>
          </div>
          <div className="flex-1 h-px bg-zinc-800"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-sm">3</div>
            <p className="text-xs text-zinc-400 mt-2">Dashboard</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-12 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-600/20 rounded-xl">
                <Key className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Select AI Provider</h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              Choose your preferred LLM provider for running study summaries, Socratic tutoring, and practice tests.
            </p>
          </div>

          {/* Migration Prompt Banner */}
          {!hasPin && hasKeysSaved() && (
            <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <AlertCircle className="flex-shrink-0 text-amber-500 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="text-amber-200 font-semibold text-base">Security Upgrade Available</p>
                  <p className="text-amber-200/70 mt-1">
                    ScholarSync now supports secure client-side encryption. Enter a Master PIN below to encrypt your existing legacy keys.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <input
                  type="password"
                  value={migrationPin}
                  onChange={(e) => setMigrationPin(e.target.value)}
                  placeholder="Set Master PIN (min 4 chars)"
                  className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white tracking-widest font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleMigrate}
                  disabled={testing || migrationPin.length < 4}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-1.5 rounded-lg text-sm transition-all duration-150 disabled:opacity-50"
                >
                  Encrypt Keys
                </button>
              </div>
            </div>
          )}

          {/* Provider Select Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Active AI Provider:</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {Object.entries(PROVIDERS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step-by-step Guide */}
          <div className="space-y-4 bg-zinc-800/50 rounded-xl p-4 sm:p-6 border border-white/5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-indigo-400">📋</span> How to Set Up
            </h2>
            <div className="text-zinc-300 text-sm leading-relaxed">
              <p className="font-medium text-white mb-2">{PROVIDERS_META[provider].name} Details:</p>
              <p className="text-zinc-400 mb-3">{PROVIDERS_META[provider].instruction}</p>
              
              {provider !== 'ollama' && (
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors font-medium"
                >
                  <ExternalLink size={14} />
                  Get Key from {PROVIDERS_META[provider].name}
                  {copied && <span className="text-green-400 ml-2">✓ Link Copied</span>}
                </button>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-600/10 border border-indigo-600/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="flex-shrink-0 text-indigo-400 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-indigo-100 font-medium">Local Encrypted Storage</p>
              <p className="text-indigo-100/70 mt-1">
                Your keys are encrypted locally using AES-GCM and a Master PIN. They are never sent to ScholarSync databases and remain solely on your device.
              </p>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            {provider === 'ollama' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Ollama Base Endpoint URL:
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => {
                    setOllamaUrl(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="http://localhost:11434"
                  className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    API Key Name:
                  </label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => {
                      setKeyName(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="e.g. My Fast Groq Key"
                    className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Enter {PROVIDERS_META[provider].name} API Key:
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setSaved(false);
                      }}
                      placeholder={PROVIDERS_META[provider].placeholder}
                      className="w-full bg-zinc-800 text-white px-4 py-3 pr-10 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-400"
                      tabIndex={-1}
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Model Selection Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Select Text/Normal Model:
                </label>
                <select
                  value={textModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTextModel(val);
                    setIsCustomText(val === 'custom');
                    setSaved(false);
                  }}
                  className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
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
                    onChange={(e) => {
                      setCustomTextModel(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full mt-2 bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Select Vision Model:
                </label>
                <select
                  value={visionModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVisionModel(val);
                    setIsCustomVision(val === 'custom');
                    setSaved(false);
                  }}
                  className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
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
                    placeholder="Enter custom vision model name"
                    value={customVisionModel}
                    onChange={(e) => {
                      setCustomVisionModel(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full mt-2 bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono"
                  />
                )}
              </div>
            </div>
            
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm pt-2">
                <Check size={16} />
                Configuration saved and encrypted successfully!
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSaveConfig}
              disabled={testing}
              className="flex-1"
            >
              {testing ? 'Verifying...' : 'Save Configuration'}
            </Button>
            {saved && (
              <Button
                onClick={handleContinue}
                variant="secondary"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Continue to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Separate modal prompt for Master PIN upon save */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400"
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

export default APIKeySetup;
