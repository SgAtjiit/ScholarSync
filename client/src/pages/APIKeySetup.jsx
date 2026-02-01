import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Check, AlertCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import useSEO from '../hooks/useSEO';

const APIKeySetup = () => {
  useSEO({
    title: 'Setup API Key',
    description: 'Complete your ScholarSync setup by adding your Groq API Key for AI features.'
  });

  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('groq_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setSaved(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API Key');
      return;
    }
    localStorage.setItem('groq_api_key', apiKey);
    localStorage.setItem('hasCompletedAPIKeySetup', 'true');
    setSaved(true);
    toast.success('API Key saved successfully!');
  };

  const handleSkip = () => {
    localStorage.setItem('hasCompletedAPIKeySetup', 'true');
    navigate('/dashboard');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://console.groq.com/keys');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const handleContinue = () => {
    if (saved || apiKey.trim()) {
      navigate('/dashboard');
    } else {
      toast.error('Please save your API Key first');
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
            <p className="text-xs text-zinc-400 mt-2">API Key</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Setup Your API Key</h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              To unlock AI-powered features, you'll need a Groq API Key. It's free and takes less than a minute!
            </p>
          </div>

          {/* Step-by-step Guide */}
          <div className="space-y-4 bg-zinc-800/50 rounded-xl p-4 sm:p-6 border border-white/5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-indigo-400">📋</span> How to Get Your API Key
            </h2>

            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">1</div>
              <div className="flex-1">
                <p className="text-white font-medium">Go to Groq Console</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Visit the Groq API console to create a free account.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                >
                  <ExternalLink size={14} />
                  https://console.groq.com/keys
                  {copied && <span className="text-green-400">✓ Copied</span>}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="h-px bg-zinc-700/50"></div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">2</div>
              <div className="flex-1">
                <p className="text-white font-medium">Create/Sign Up</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Sign in with your Google account or email. Groq offers free API credits for new users!
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="h-px bg-zinc-700/50"></div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">3</div>
              <div className="flex-1">
                <p className="text-white font-medium">Generate API Key</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Navigate to "API Keys" section and click "Create New API Key". Copy the key.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="h-px bg-zinc-700/50"></div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">4</div>
              <div className="flex-1">
                <p className="text-white font-medium">Paste Below</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Paste your API key in the input field below and save. You're ready to go!
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="flex-shrink-0 text-amber-500 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-amber-100 font-medium">Why do you need this?</p>
              <p className="text-amber-100/70 mt-1">
                Your API key enables AI-powered features like generating study notes, quizzes, and flashcards. It's stored locally and never shared.
              </p>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white">
              Paste your Groq API Key here:
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaved(false);
                }}
                placeholder="gsk_..."
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
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} />
                API Key saved successfully
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSaveKey}
              disabled={!apiKey.trim()}
              className="flex-1"
            >
              Save API Key
            </Button>
            {saved && (
              <Button
                onClick={handleContinue}
                variant="secondary"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Continue to Dashboard
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="text-xs text-zinc-500 text-center">
            🔒 Your API key is stored locally in your browser. It's never sent to ScholarSync servers.
          </div>
        </div>

        {/* Skip link at bottom */}
        {!saved && (
          <p className="text-center text-xs text-zinc-600 mt-6">
            Want to set it up later?{' '}
            <button
              onClick={handleSkip}
              className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
            >
              Go to Dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default APIKeySetup;
