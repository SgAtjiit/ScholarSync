// client/src/components/common/VaultUnlockModal.jsx

import React, { useState, useEffect } from 'react';
import { isVaultUnlocked, initializeVault, hasVaultPIN, clearVault } from '../../utils/keyManager';
import toast from 'react-hot-toast';

const VaultUnlockModal = () => {
    const [pin, setPin] = useState('');
    const [unlocked, setUnlocked] = useState(isVaultUnlocked());
    const [hasPin, setHasPin] = useState(hasVaultPIN());
    const [loading, setLoading] = useState(false);

    // Periodically sync/check vault status (especially when active provider changes or on mount)
    useEffect(() => {
        const checkVault = () => {
            setUnlocked(isVaultUnlocked());
            setHasPin(hasVaultPIN());
        };
        
        checkVault();
        // Set up event listener or interval to check if unlock status changes
        const interval = setInterval(checkVault, 1000);
        return () => clearInterval(interval);
    }, []);

    if (unlocked || !hasPin) {
        return null; // Don't show if unlocked or if they haven't configured a PIN yet
    }

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!pin.trim()) {
            toast.error("Please enter your Master PIN");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Decrypting API Keys...");

        try {
            await initializeVault(pin);
            setUnlocked(true);
            toast.success("ScholarSync Vault Unlocked!", { id: toastId });
        } catch (err) {
            toast.error("Invalid PIN. Access denied.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleResetVault = () => {
        const confirmReset = window.confirm(
            "WARNING: Resetting the vault will delete all your securely stored API keys from this device. You will need to input your LLM keys and set up a new Master PIN. Are you sure you want to proceed?"
        );
        if (confirmReset) {
            clearVault();
            // Clear all encrypted keys from local storage
            const providers = ['groq', 'gemini', 'openai', 'anthropic', 'openrouter'];
            providers.forEach(p => {
                localStorage.removeItem(`ss_enc_${p}_key`);
                localStorage.removeItem(`ss_enc_${p}_salt`);
                localStorage.removeItem(`ss_enc_${p}_iv`);
            });
            localStorage.removeItem("ss_vault_sentinel_key");
            localStorage.removeItem("ss_vault_sentinel_salt");
            localStorage.removeItem("ss_vault_sentinel_iv");
            localStorage.removeItem("hasCompletedAPIKeySetup");
            
            toast.success("Vault reset successfully. Please set up new API keys.");
            window.location.href = '/api-key-setup';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                {/* Visual gradients */}
                <div className="absolute top-[-20%] left-[-20%] w-[200px] h-[200px] bg-indigo-600/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[200px] h-[200px] bg-purple-600/10 rounded-full blur-[80px]" />

                <div className="relative z-10 text-center">
                    {/* Locked Shield Icon */}
                    <div className="mx-auto w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/5">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Unlock AI Vault</h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        Enter your Master PIN to decrypt your LLM API keys and enable AI features.
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder="••••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-center text-xl font-mono text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                                maxLength={20}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? "Decrypting..." : "Unlock Vault"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-zinc-900 flex justify-center">
                        <button
                            onClick={handleResetVault}
                            className="text-xs text-red-400/80 hover:text-red-400 transition-colors duration-150"
                        >
                            Forgot PIN / Reset Vault
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VaultUnlockModal;
