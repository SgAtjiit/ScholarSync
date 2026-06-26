// client/src/utils/keyManager.js

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Helper to convert Uint8Array to base64
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper to convert base64 to Uint8Array
const base64ToArrayBuffer = (base64) => {
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Derive AES-GCM 256 CryptoKey using PBKDF2
 */
const deriveKey = async (password, salt) => {
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

/**
 * Encrypt a plaintext string using a password
 */
export const encryptData = async (plaintext, password) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(password, salt);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encoder.encode(plaintext)
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        salt: arrayBufferToBase64(salt),
        iv: arrayBufferToBase64(iv)
    };
};

/**
 * Decrypt a ciphertext string using a password
 */
export const decryptData = async (ciphertext, saltBase64, ivBase64, password) => {
    const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const cryptoKey = await deriveKey(password, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        base64ToArrayBuffer(ciphertext)
    );

    return decoder.decode(decryptedBuffer);
};

// --- Session Cache & Vault State Management ---

// In-memory cache singleton
let memoryVault = {};
let cachedPin = null;

export const getCachedPin = () => cachedPin;
export const setCachedPin = (pin) => {
    cachedPin = pin;
};

export const PROVIDERS_LIST = ['groq', 'gemini', 'openai', 'anthropic', 'openrouter'];

/**
 * Save an API key encrypted in localStorage
 */
export const saveEncryptedKey = async (provider, plaintextKey, password, keyName) => {
    if (!plaintextKey || !plaintextKey.trim()) {
        removeEncryptedKey(provider);
        return;
    }
    const encrypted = await encryptData(plaintextKey, password);
    localStorage.setItem(`ss_enc_${provider}_key`, encrypted.ciphertext);
    localStorage.setItem(`ss_enc_${provider}_salt`, encrypted.salt);
    localStorage.setItem(`ss_enc_${provider}_iv`, encrypted.iv);
    localStorage.setItem(`ss_enc_${provider}_added_at`, new Date().toISOString());
    localStorage.setItem(`ss_enc_${provider}_key_name`, keyName || `${provider.toUpperCase()} Key`);
    
    // Cache in session
    setInSession(provider, plaintextKey);
};

/**
 * Remove encrypted key from localStorage
 */
export const removeEncryptedKey = (provider) => {
    localStorage.removeItem(`ss_enc_${provider}_key`);
    localStorage.removeItem(`ss_enc_${provider}_salt`);
    localStorage.removeItem(`ss_enc_${provider}_iv`);
    localStorage.removeItem(`ss_enc_${provider}_added_at`);
    localStorage.removeItem(`ss_enc_${provider}_key_name`);
    
    // Also remove from legacy plaintext keys if they exist
    localStorage.removeItem(`${provider}_api_key`);
    if (provider === 'groq') {
        localStorage.removeItem('groq_api_key');
    }

    // Remove from session
    removeFromSession(provider);
};

/**
 * Write to memory & sessionStorage
 */
export const setInSession = (provider, key) => {
    memoryVault[provider] = key;
    try {
        sessionStorage.setItem(`ss_session_${provider}_key`, key);
    } catch (e) {
        console.error("sessionStorage write failed", e);
    }
};

/**
 * Remove key from memory & sessionStorage
 */
const removeFromSession = (provider) => {
    delete memoryVault[provider];
    try {
        sessionStorage.removeItem(`ss_session_${provider}_key`);
    } catch (e) {
        console.error("sessionStorage remove failed", e);
    }
};

/**
 * Get active API key from session storage / memory vault
 */
export const getDecryptedKey = (provider) => {
    if (provider === 'ollama') return '';
    
    if (memoryVault[provider]) {
        return memoryVault[provider];
    }
    
    // Fallback/Restore from sessionStorage
    try {
        const sessionKey = sessionStorage.getItem(`ss_session_${provider}_key`);
        if (sessionKey) {
            memoryVault[provider] = sessionKey;
            return sessionKey;
        }
    } catch (e) {
        console.error("sessionStorage read failed", e);
    }

    // Legacy support: if the vault has not been set up/encrypted yet,
    // we return the plaintext key directly so we don't break old setups until they migrate.
    if (!hasVaultPIN()) {
        const legacyKey = localStorage.getItem(`${provider}_api_key`) || (provider === 'groq' ? localStorage.getItem('groq_api_key') : null);
        if (legacyKey) {
            return legacyKey;
        }
    }
    
    return null;
};

/**
 * Set verification sentinel
 */
export const setVaultSentinel = async (password) => {
    const encrypted = await encryptData("scholarsync_vault", password);
    localStorage.setItem("ss_vault_sentinel_key", encrypted.ciphertext);
    localStorage.setItem("ss_vault_sentinel_salt", encrypted.salt);
    localStorage.setItem("ss_vault_sentinel_iv", encrypted.iv);
};

/**
 * Check if the PIN/password is correct using the sentinel
 */
export const checkVaultSentinel = async (password) => {
    const key = localStorage.getItem("ss_vault_sentinel_key");
    const salt = localStorage.getItem("ss_vault_sentinel_salt");
    const iv = localStorage.getItem("ss_vault_sentinel_iv");

    if (!key || !salt || !iv) {
        // No sentinel setup yet
        return false;
    }

    try {
        const decrypted = await decryptData(key, salt, iv, password);
        return decrypted === "scholarsync_vault";
    } catch (e) {
        return false;
    }
};

/**
 * Initialize vault: Verify password and decrypt all saved keys
 */
export const initializeVault = async (password) => {
    const isValid = await checkVaultSentinel(password);
    if (!isValid) {
        throw new Error("Incorrect Vault PIN / Password");
    }

    // Decrypt and load all keys into session memory
    for (const provider of PROVIDERS_LIST) {
        const key = localStorage.getItem(`ss_enc_${provider}_key`);
        const salt = localStorage.getItem(`ss_enc_${provider}_salt`);
        const iv = localStorage.getItem(`ss_enc_${provider}_iv`);

        if (key && salt && iv) {
            try {
                const plaintext = await decryptData(key, salt, iv, password);
                setInSession(provider, plaintext);
            } catch (e) {
                console.error(`Failed to decrypt key for ${provider}`, e);
            }
        }
    }
    
    // Mark vault as session unlocked
    sessionStorage.setItem("ss_vault_unlocked", "true");
    cachedPin = password;
    return true;
};

/**
 * Clear the session vault (Lock the vault)
 */
export const clearVault = () => {
    memoryVault = {};
    cachedPin = null;
    try {
        PROVIDERS_LIST.forEach(provider => {
            sessionStorage.removeItem(`ss_session_${provider}_key`);
        });
        sessionStorage.removeItem("ss_vault_unlocked");
    } catch (e) {
        console.error("Failed to clear sessionStorage vault", e);
    }
};

/**
 * Check if the vault has been unlocked in the current session
 */
export const isVaultUnlocked = () => {
    // If there is no PIN set, it's considered unlocked (or rather, unconfigured)
    if (!hasVaultPIN()) {
        return true;
    }
    return sessionStorage.getItem("ss_vault_unlocked") === "true";
};

/**
 * Check if the vault PIN has been configured
 */
export const hasVaultPIN = () => {
    return !!localStorage.getItem("ss_vault_sentinel_key");
};

/**
 * Check if any encrypted keys or legacy plaintext keys exist
 */
export const hasKeysSaved = () => {
    // Check encrypted keys
    for (const provider of PROVIDERS_LIST) {
        if (localStorage.getItem(`ss_enc_${provider}_key`)) {
            return true;
        }
    }
    // Check legacy plaintext keys
    for (const provider of PROVIDERS_LIST) {
        if (localStorage.getItem(`${provider}_api_key`)) {
            return true;
        }
    }
    if (localStorage.getItem('groq_api_key')) {
        return true;
    }
    return false;
};

/**
 * Migrate legacy plaintext keys to encrypted storage
 */
export const migratePlaintextKeys = async (password) => {
    // 1. Create the sentinel
    await setVaultSentinel(password);
    
    // 2. Encrypt all existing plaintext keys
    for (const provider of PROVIDERS_LIST) {
        const legacyKey = localStorage.getItem(`${provider}_api_key`) || (provider === 'groq' ? localStorage.getItem('groq_api_key') : null);
        if (legacyKey && legacyKey.trim()) {
            await saveEncryptedKey(provider, legacyKey, password, `Migrated ${provider} Key`);
            // Delete plaintext key
            localStorage.removeItem(`${provider}_api_key`);
            if (provider === 'groq') {
                localStorage.removeItem('groq_api_key');
            }
        }
    }

    // Mark vault as unlocked
    sessionStorage.setItem("ss_vault_unlocked", "true");
    cachedPin = password;
};

/**
 * Mask key for UI presentation
 */
export const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

/**
 * Get metadata for all currently saved encrypted keys
 */
export const getSavedKeysMeta = () => {
    const list = [];
    PROVIDERS_LIST.forEach(provider => {
        if (localStorage.getItem(`ss_enc_${provider}_key`)) {
            const addedAt = localStorage.getItem(`ss_enc_${provider}_added_at`) || new Date().toISOString();
            const keyName = localStorage.getItem(`ss_enc_${provider}_key_name`) || `${provider.toUpperCase()} Key`;
            list.push({
                provider,
                addedAt,
                keyName
            });
        }
    });
    return list;
};
