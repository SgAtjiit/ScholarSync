import React, { useState, useEffect } from 'react';
import { PROVIDERS, testConnection, cleanErrorMessage, getProviderTextModels, getProviderVisionModels } from '../../services/llmService';
import { saveEncryptedKey, getDecryptedKey, getCachedPin, hasVaultPIN, checkVaultSentinel, initializeVault } from '../../utils/keyManager';
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDERS_META = {
  groq: { name: 'Groq Cloud', placeholder: 'gsk_...' },
  openai: { name: 'OpenAI', placeholder: 'sk-proj-...' },
  openrouter: { name: 'OpenRouter', placeholder: 'sk-or-...' },
  gemini: { name: 'Google Gemini', placeholder: 'AIzaSy...' },
  anthropic: { name: 'Anthropic Claude', placeholder: 'sk-ant-...' },
  ollama: { name: 'Local Ollama', placeholder: 'http://localhost:11434' }
};

const RateLimitModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [provider, setProvider] = useState('groq');
    const [apiKey, setApiKey] = useState('');
    const [keyName, setKeyName] = useState('');
    const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
    const [showKey, setShowKey] = useState(false);

    // Model Configuration States
    const [textModel, setTextModel] = useState('');
    const [visionModel, setVisionModel] = useState('');
    const [customTextModel, setCustomTextModel] = useState('');
    const [customVisionModel, setCustomVisionModel] = useState('');
    const [isCustomText, setIsCustomText] = useState(false);
    const [isCustomVision, setIsCustomVision] = useState(false);

    // Vault/PIN states
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [hasPin, setHasPin] = useState(hasVaultPIN());

    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const handleTrigger = (e) => {
            const activeProvider = e.detail?.provider || localStorage.getItem('active_llm_provider') || 'groq';
            setProvider(activeProvider);
            
            const storedKey = getDecryptedKey(activeProvider) || '';
            setApiKey(storedKey);

            // Fetch stored key name if it exists, otherwise leave empty for user to fill
            const storedKeyName = localStorage.getItem(`ss_enc_${activeProvider}_key_name`) || '';
            setKeyName(storedKeyName);

            const storedOllamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434';
            setOllamaUrl(storedOllamaUrl);

            // Handle models
            const activeTextModel = localStorage.getItem(`${activeProvider}_text_model`) || PROVIDERS[activeProvider]?.defaultModel || '';
            const activeVisionModel = localStorage.getItem(`${activeProvider}_vision_model`) || PROVIDERS[activeProvider]?.visionModel || '';
            
            const textOptions = getProviderTextModels(activeProvider);
            const visionOptions = getProviderVisionModels(activeProvider);

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

            setHasPin(hasVaultPIN());
            setIsOpen(true);
        };

        window.addEventListener('scholarsync:rate-limit-triggered', handleTrigger);
        return () => window.removeEventListener('scholarsync:rate-limit-triggered', handleTrigger);
    }, []);

    if (!isOpen) return null;

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        const storedKey = getDecryptedKey(newProvider) || '';
        setApiKey(storedKey);

        const storedKeyName = localStorage.getItem(`ss_enc_${newProvider}_key_name`) || '';
        setKeyName(storedKeyName);

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

    const handleSaveAndResume = async (e) => {
        e.preventDefault();

        if (provider !== 'ollama' && !apiKey.trim()) {
            toast.error('API Key cannot be empty');
            return;
        }

        if (provider !== 'ollama' && !keyName.trim()) {
            toast.error('Please name your API Key (e.g. "My Fast Key")');
            return;
        }

        const actualTextModel = isCustomText ? customTextModel : textModel;
        const actualVisionModel = isCustomVision ? customVisionModel : visionModel;

        if (!actualTextModel.trim()) {
            toast.error('Text model name cannot be empty');
            return;
        }

        // Vault PIN resolution
        let pinToUse = getCachedPin();
        if (provider !== 'ollama' && hasPin && !pinToUse) {
            if (!pin.trim()) {
                toast.error('Please enter your Master PIN to decrypt and update keys');
                return;
            }
            const isPinValid = await checkVaultSentinel(pin);
            if (!isPinValid) {
                toast.error('Incorrect Master PIN. Key update unauthorized.');
                return;
            }
            pinToUse = pin;
            // Also initialize session vault for smoother experience
            await initializeVault(pin);
        }

        setTesting(true);
        const toastId = toast.loading('Verifying connection & saving configuration...');

        try {
            const res = await testConnection(provider, apiKey, actualTextModel, actualVisionModel, ollamaUrl);
            if (res.success) {
                if (provider === 'ollama') {
                    localStorage.setItem('ollama_url', ollamaUrl);
                } else {
                    await saveEncryptedKey(provider, apiKey, pinToUse, keyName);
                }

                localStorage.setItem('active_llm_provider', provider);
                localStorage.setItem(`${provider}_text_model`, actualTextModel);
                localStorage.setItem(`${provider}_vision_model`, actualVisionModel);

                toast.success('AI Configuration updated successfully!', { id: toastId });
                setIsOpen(false);
            } else {
                toast.error(`Connection test failed: ${cleanErrorMessage(res.error)}`, { id: toastId, duration: 6000 });
            }
        } catch (err) {
            toast.error(`Error saving configuration: ${cleanErrorMessage(err.message)}`, { id: toastId });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/85 backdrop-blur-md p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Visual gradients */}
                <div className="absolute top-[-20%] left-[-20%] w-[200px] h-[200px] bg-red-600/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[200px] h-[200px] bg-amber-600/10 rounded-full blur-[80px]" />

                <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">AI Rate Limit Reached</h2>
                            <p className="text-zinc-400 text-xs mt-0.5">Change provider or configure another key to resume instantly.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveAndResume} className="space-y-4 mt-6">
                        {/* Active AI Provider */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active AI Provider</label>
                            <select
                                value={provider}
                                onChange={(e) => handleProviderChange(e.target.value)}
                                className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm shadow-inner"
                            >
                                {Object.entries(PROVIDERS_META).map(([key, meta]) => (
                                    <option key={key} value={key}>
                                        {meta.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {provider === 'ollama' ? (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ollama Endpoint URL</label>
                                <input
                                    type="text"
                                    value={ollamaUrl}
                                    onChange={(e) => setOllamaUrl(e.target.value)}
                                    placeholder="http://localhost:11434"
                                    className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm font-mono shadow-inner"
                                />
                            </div>
                        ) : (
                            <>
                                {/* Key Name Input */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">API Key Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. My Backup Groq Key"
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm shadow-inner"
                                    />
                                </div>

                                {/* API Key Input */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        {PROVIDERS_META[provider]?.name} API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder={PROVIDERS_META[provider]?.placeholder}
                                            className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 pr-10 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm font-mono shadow-inner"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                                            tabIndex={-1}
                                        >
                                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Model Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Text Model Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Text Model</label>
                                <select
                                    value={textModel}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setTextModel(val);
                                        setIsCustomText(val === 'custom');
                                    }}
                                    className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm shadow-inner"
                                >
                                    {getProviderTextModels(provider).map((modelName) => (
                                        <option key={modelName} value={modelName}>
                                            {modelName}
                                        </option>
                                    ))}
                                    <option value="custom">-- Custom Model --</option>
                                </select>

                                {isCustomText && (
                                    <input
                                        type="text"
                                        placeholder="Enter custom text model name"
                                        value={customTextModel}
                                        onChange={(e) => setCustomTextModel(e.target.value)}
                                        className="w-full mt-2 bg-[#09090b] text-zinc-100 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-xs font-mono shadow-inner"
                                    />
                                )}
                            </div>

                            {/* Vision Model Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Vision Model</label>
                                <select
                                    value={visionModel}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setVisionModel(val);
                                        setIsCustomVision(val === 'custom');
                                    }}
                                    className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm shadow-inner"
                                >
                                    {getProviderVisionModels(provider).map((modelName) => (
                                        <option key={modelName} value={modelName}>
                                            {modelName}
                                        </option>
                                    ))}
                                    <option value="custom">-- Custom Model --</option>
                                </select>

                                {isCustomVision && (
                                    <input
                                        type="text"
                                        placeholder="Enter custom vision model name"
                                        value={customVisionModel}
                                        onChange={(e) => setCustomVisionModel(e.target.value)}
                                        className="w-full mt-2 bg-[#09090b] text-zinc-100 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-xs font-mono shadow-inner"
                                    />
                                )}
                            </div>
                        </div>

                        {/* PIN Entry if required and vault is currently locked in session */}
                        {provider !== 'ollama' && hasPin && !getCachedPin() && (
                            <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Enter Master PIN</label>
                                <div className="relative">
                                    <input
                                        type={showPin ? 'text' : 'password'}
                                        placeholder="••••"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        maxLength={10}
                                        className="w-full bg-[#09090b] text-zinc-100 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 text-sm font-mono tracking-widest shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                        tabIndex={-1}
                                    >
                                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-medium rounded-xl py-3 text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={testing}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl py-3 text-sm transition-all shadow-lg shadow-indigo-600/10"
                            >
                                {testing ? 'Saving & Resuming...' : 'Save & Resume'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RateLimitModal;
