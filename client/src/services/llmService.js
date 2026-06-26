/**
 * Unified Client-Side LLM Service
 * Abstracts access to multiple LLM providers: Groq, OpenAI, OpenRouter, Gemini, Anthropic, and Ollama.
 * Direct API calls are run entirely in the browser using the user's local API keys.
 */

import { getDecryptedKey } from '../utils/keyManager';

// Model Lists and pricing (per million tokens)
export const PROVIDERS = {
    groq: {
        name: 'Groq Cloud',
        defaultModel: 'llama-3.3-70b-versatile',
        visionModel: 'llama-3.2-90b-vision-preview',
        textModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        visionModels: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview'],
        pricing: {
            'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
            'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
            'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
            'llama-3.2-90b-vision-preview': { input: 0.90, output: 0.90 },
            'llama-3.2-11b-vision-preview': { input: 0.15, output: 0.15 }
        }
    },
    openai: {
        name: 'OpenAI',
        defaultModel: 'gpt-4o-mini',
        visionModel: 'gpt-4o-mini',
        textModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        visionModels: ['gpt-4o-mini', 'gpt-4o'],
        pricing: {
            'gpt-4o-mini': { input: 0.15, output: 0.60 },
            'gpt-4o': { input: 2.50, output: 10.00 },
            'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
        }
    },
    openrouter: {
        name: 'OpenRouter',
        defaultModel: 'google/gemini-2.5-flash',
        visionModel: 'google/gemini-2.5-flash',
        textModels: ['google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct'],
        visionModels: ['google/gemini-2.5-flash', 'meta-llama/llama-3.2-11b-vision-instruct'],
        pricing: {
            'google/gemini-2.5-flash': { input: 0.075, output: 0.30 },
            'meta-llama/llama-3.3-70b-instruct': { input: 0.54, output: 0.75 },
            'meta-llama/llama-3.2-11b-vision-instruct': { input: 0.055, output: 0.055 }
        }
    },
    gemini: {
        name: 'Google Gemini',
        defaultModel: 'gemini-2.5-flash',
        visionModel: 'gemini-2.5-flash',
        textModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        visionModels: ['gemini-2.5-flash', 'gemini-1.5-flash'],
        pricing: {
            'gemini-2.5-flash': { input: 0.075, output: 0.30 },
            'gemini-2.5-pro': { input: 1.25, output: 5.00 },
            'gemini-1.5-flash': { input: 0.075, output: 0.30 },
            'gemini-1.5-pro': { input: 1.25, output: 5.00 }
        }
    },
    anthropic: {
        name: 'Anthropic Claude',
        defaultModel: 'claude-3-5-sonnet-latest',
        visionModel: 'claude-3-5-sonnet-latest',
        textModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
        visionModels: ['claude-3-5-sonnet-latest'],
        pricing: {
            'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
            'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 }
        }
    },
    ollama: {
        name: 'Local Ollama',
        defaultModel: 'llama3',
        visionModel: 'llava',
        textModels: ['llama3', 'mistral', 'phi3'],
        visionModels: ['llava', 'bakllava'],
        pricing: {
            'llama3': { input: 0.0, output: 0.0 },
            'mistral': { input: 0.0, output: 0.0 },
            'phi3': { input: 0.0, output: 0.0 },
            'llava': { input: 0.0, output: 0.0 },
            'bakllava': { input: 0.0, output: 0.0 }
        }
    }
};

// Flatten pricing reference mapping
export const PRICING = {};
Object.keys(PROVIDERS).forEach(p => {
    Object.assign(PRICING, PROVIDERS[p].pricing);
});

/**
 * Sanitize API keys and other long sensitive tokens within error messages
 */
export const sanitizeAPIKeys = (text) => {
    if (!text) return text;
    let sanitized = String(text);
    
    // 1. Explicit patterns with prefixes
    sanitized = sanitized.replace(/\b(gsk_[a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]{10,}([a-zA-Z0-9_-]{4})\b/g, '$1...$2');
    sanitized = sanitized.replace(/\b(sk-[a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]{10,}([a-zA-Z0-9_-]{4})\b/g, '$1...$2');
    sanitized = sanitized.replace(/\b(AIza[a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]{10,}([a-zA-Z0-9_-]{4})\b/g, '$1...$2');
    
    // 2. Generic long credential/token-like contiguous strings (20+ characters)
    // Avoid modifying URLs or common file paths by ensuring it's a single word token
    sanitized = sanitized.replace(/\b([a-zA-Z0-9_.-]{6})[a-zA-Z0-9_.-]{12,}([a-zA-Z0-9_.-]{6})\b/g, (match, p1, p2) => {
        // If it looks like a URL, domain name, or file path, leave it untouched
        if (match.includes('/') || match.startsWith('http') || (match.match(/\./g) || []).length > 2) {
            return match;
        }
        return `${p1}...${p2}`;
    });
    return sanitized;
};

/**
 * Clean LLM API error messages to a single line and sanitize sensitive data
 */
export const cleanErrorMessage = (errorObj, defaultMsg) => {
    let rawMsg = '';
    if (!errorObj) {
        rawMsg = defaultMsg || 'API request failed';
    } else if (typeof errorObj === 'string') {
        rawMsg = errorObj;
    } else {
        rawMsg = errorObj?.error?.message || errorObj?.message || defaultMsg || 'API request failed';
    }
    const firstLine = String(rawMsg).split('\n')[0].trim();
    let cleanMsg = firstLine.replace(/<[^>]+>/g, '').trim();
    
    // Truncate/sanitize API keys
    cleanMsg = sanitizeAPIKeys(cleanMsg);

    if (cleanMsg.length > 120) {
        cleanMsg = cleanMsg.substring(0, 117) + '...';
    }
    return cleanMsg;
};

/**
 * Get active configuration from localStorage
 */
export const getActiveConfig = () => {
    const provider = localStorage.getItem('active_llm_provider') || 'groq';
    
    const defaultTextModel = PROVIDERS[provider]?.defaultModel || 'llama-3.3-70b-versatile';
    const textModel = localStorage.getItem(`${provider}_text_model`) || defaultTextModel;
    
    const defaultVisionModel = PROVIDERS[provider]?.visionModel || 'llama-3.2-90b-vision-preview';
    const visionModel = localStorage.getItem(`${provider}_vision_model`) || defaultVisionModel;

    return {
        provider,
        model: textModel, // fallback
        textModel,
        visionModel,
        apiKey: getDecryptedKey(provider) || getDecryptedKey('groq'), // Fallback to groq key for legacy support
        ollamaUrl: localStorage.getItem('ollama_url') || 'http://localhost:11434'
    };
};

/**
 * Check if the active provider has an API key configured
 */
export const hasApiKey = () => {
    const { provider, apiKey } = getActiveConfig();
    if (provider === 'ollama') return true; // Ollama runs locally, no key needed
    return !!apiKey;
};

/**
 * Main completions router
 */
export const chatCompletion = async ({
    messages,
    model: optionModel,
    temperature = 0.4,
    maxTokens = 4096,
    stream = false,
    providerOverride,
    apiKeyOverride,
    ollamaUrlOverride,
}) => {
    const config = getActiveConfig();
    const provider = providerOverride || config.provider;
    const model = optionModel || config.textModel;
    const apiKey = apiKeyOverride !== undefined ? apiKeyOverride : config.apiKey;
    const ollamaUrl = ollamaUrlOverride || config.ollamaUrl;

    if (provider !== 'ollama' && !apiKey) {
        throw new Error(`API key not configured for ${PROVIDERS[provider]?.name || provider}. Please update your settings.`);
    }


    // Router based on selected provider
    if (provider === 'gemini') {
        return callGeminiAPI({ messages, model, apiKey, temperature, maxTokens });
    } else if (provider === 'anthropic') {
        return callAnthropicAPI({ messages, model, apiKey, temperature, maxTokens });
    } else {
        // Groq, OpenAI, OpenRouter, and Ollama are OpenAI-compatible
        let apiBaseUrl = 'https://api.groq.com/openai/v1';
        if (provider === 'openai') apiBaseUrl = 'https://api.openai.com/v1';
        if (provider === 'openrouter') apiBaseUrl = 'https://openrouter.ai/api/v1';
        if (provider === 'ollama') apiBaseUrl = `${ollamaUrl}/v1`;

        return callOpenAICompatibleAPI({
            messages,
            model,
            apiKey,
            apiBaseUrl,
            temperature,
            maxTokens,
            stream
        });
    }
};

/**
 * OpenAI-Compatible Completion Call
 */
const callOpenAICompatibleAPI = async ({
    messages,
    model,
    apiKey,
    apiBaseUrl,
    temperature,
    maxTokens,
    stream
}) => {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream
        })
    });

    if (!response.ok) {
        if (response.status === 429) {
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `API request failed: ${response.status}`));
    }

    const data = await response.json();
    
    // Estimate usage if server doesn't return usage
    if (data.usage) {
        trackTokenUsage(model, data.usage.prompt_tokens, data.usage.completion_tokens);
    } else {
        const promptEstimate = Math.ceil(JSON.stringify(messages).length / 4);
        const completionEstimate = Math.ceil((data.choices?.[0]?.message?.content || '').length / 4);
        trackTokenUsage(model, promptEstimate, completionEstimate);
    }

    return data;
};

/**
 * Google Gemini API Call
 */
const callGeminiAPI = async ({ messages, model, apiKey, temperature, maxTokens }) => {
    // Map system instructions and dialog roles
    const systemMessage = messages.find(m => m.role === 'system');
    const geminiMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

    const body = {
        contents: geminiMessages,
        generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens
        }
    };

    if (systemMessage) {
        body.systemInstruction = {
            parts: [{ text: systemMessage.content }]
        };
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    );

    if (!response.ok) {
        if (response.status === 429) {
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `Gemini API request failed: ${response.status}`));
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Format response to match OpenAI structure for frontend compatibility
    const responsePayload = {
        choices: [
            {
                message: {
                    role: 'assistant',
                    content: content
                }
            }
        ],
        usage: {
            prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4),
            completion_tokens: Math.ceil(content.length / 4)
        }
    };

    trackTokenUsage(model, responsePayload.usage.prompt_tokens, responsePayload.usage.completion_tokens);
    return responsePayload;
};

/**
 * Anthropic Claude API Call
 */
const callAnthropicAPI = async ({ messages, model, apiKey, temperature, maxTokens }) => {
    const systemMessage = messages.find(m => m.role === 'system');
    const claudeMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));

    const body = {
        model,
        messages: claudeMessages,
        max_tokens: maxTokens,
        temperature
    };

    if (systemMessage) {
        body.system = systemMessage.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        if (response.status === 429) {
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `Anthropic API request failed: ${response.status}`));
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    const responsePayload = {
        choices: [
            {
                message: {
                    role: 'assistant',
                    content
                }
            }
        ],
        usage: {
            prompt_tokens: data.usage?.input_tokens || Math.ceil(JSON.stringify(messages).length / 4),
            completion_tokens: data.usage?.output_tokens || Math.ceil(content.length / 4)
        }
    };

    trackTokenUsage(model, responsePayload.usage.prompt_tokens, responsePayload.usage.completion_tokens);
    return responsePayload;
};

/**
 * Completions Streaming Router
 */
export const chatCompletionStream = async ({
    messages,
    model: optionModel,
    temperature = 0.4,
    maxTokens = 4096
}, onChunk) => {
    const config = getActiveConfig();
    const { provider, textModel, apiKey, ollamaUrl } = config;
    const model = optionModel || textModel;

    if (provider === 'gemini' || provider === 'anthropic') {
        // Fallback to non-streaming for Gemini & Anthropic client-side to keep structure clean
        const result = await chatCompletion({ messages, temperature, maxTokens });
        onChunk(result.choices[0].message.content);
        return { content: result.choices[0].message.content };
    }

    let apiBaseUrl = 'https://api.groq.com/openai/v1';
    if (provider === 'openai') apiBaseUrl = 'https://api.openai.com/v1';
    if (provider === 'openrouter') apiBaseUrl = 'https://openrouter.ai/api/v1';
    if (provider === 'ollama') apiBaseUrl = `${ollamaUrl}/v1`;

    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true
        })
    });

    if (!response.ok) {
        if (response.status === 429) {
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `API request failed: ${response.status}`));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            } catch {
                // Ignore parsing errors on partial chunks
            }
        }
    }

    const estimatedInput = Math.ceil(JSON.stringify(messages).length / 4);
    const estimatedOutput = Math.ceil(fullContent.length / 4);
    trackTokenUsage(model, estimatedInput, estimatedOutput);

    return { content: fullContent };
};

/**
 * Image processing router using vision models
 */
export const processImageWithVision = async (base64Image, prompt) => {
    const config = getActiveConfig();
    const { provider, visionModel } = config;
    
    // Choose correct vision model
    const model = visionModel || PROVIDERS[provider]?.visionModel || 'llama-3.2-90b-vision-preview';

    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { 
                    type: 'image_url', 
                    image_url: { url: base64Image } 
                }
            ]
        }
    ];

    const response = await chatCompletion({
        model,
        messages,
        temperature: 0.1,
        maxTokens: 4000
    });

    return response.choices[0]?.message?.content || '';

};

/**
 * Extract content from an assignment page image
 */
export const extractImageContent = async (base64Image, pageNumber = 1, fileName = 'document') => {
    const prompt = `Analyze this image from page ${pageNumber} of "${fileName}".
 
 INSTRUCTIONS:
 1. Extract ALL text EXACTLY as written - questions, instructions, paragraphs
 2. Preserve numbering format: "1.", "Q1", "(a)", "(i)" etc.
 3. For mathematical expressions, write them clearly:
    - Subscripts: use _ (e.g., R_1, V_out)
    - Superscripts: use ^ (e.g., x^2, 10^3)
    - Fractions: use / (e.g., 1/2, V/R)
 4. For EVERY diagram, figure, circuit, graph or image write:
    [FIGURE: <detailed description including all labels, values, connections>]
 5. For tables, recreate the structure clearly
 6. For code snippets, preserve exact formatting
 
 Return ONLY the extracted content, no commentary.`;

    return processImageWithVision(base64Image, prompt);
};

/**
 * Track token usage and cost
 */
export const trackTokenUsage = (model, inputTokens, outputTokens) => {
    const stored = localStorage.getItem('groq_usage');
    let usage = {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalRequests: 0,
        totalCost: 0,
        models: {},
        daily: {}
    };

    if (stored) {
        try {
            usage = JSON.parse(stored);
        } catch {
            // Reset if corrupted
        }
    }

    const today = new Date().toISOString().split('T')[0];

    if (!usage.models[model]) {
        usage.models[model] = { inputTokens: 0, outputTokens: 0, requests: 0, cost: 0 };
    }

    // Find cost model
    let pricing = { input: 0.1, output: 0.1 }; // fallback
    Object.keys(PROVIDERS).forEach(p => {
        if (PROVIDERS[p].pricing[model]) {
            pricing = PROVIDERS[p].pricing[model];
        }
    });

    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

    usage.models[model].inputTokens += inputTokens;
    usage.models[model].outputTokens += outputTokens;
    usage.models[model].requests += 1;
    usage.models[model].cost += cost;

    usage.totalInputTokens += inputTokens;
    usage.totalOutputTokens += outputTokens;
    usage.totalRequests += 1;
    usage.totalCost += cost;

    if (!usage.daily[today]) {
        usage.daily[today] = { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };
    }
    usage.daily[today].inputTokens += inputTokens;
    usage.daily[today].outputTokens += outputTokens;
    usage.daily[today].cost += cost;
    usage.daily[today].requests += 1;

    usage.lastUpdated = new Date().toISOString();
    localStorage.setItem('groq_usage', JSON.stringify(usage));
};

/**
 * Get usage summary for display
 */
export const getUsageSummary = () => {
    const stored = localStorage.getItem('groq_usage');
    let usage = {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalRequests: 0,
        totalCost: 0,
        models: {},
        daily: {}
    };

    if (stored) {
        try {
            usage = JSON.parse(stored);
        } catch {}
    }

    const today = new Date().toISOString().split('T')[0];
    const todayUsage = usage.daily[today] || { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };

    const dailyHistory = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayUsage = usage.daily[dateStr] || { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };
        dailyHistory.push({
            date: dateStr,
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            ...dayUsage,
            totalTokens: dayUsage.inputTokens + dayUsage.outputTokens,
        });
    }

    return {
        allTime: {
            inputTokens: usage.totalInputTokens,
            outputTokens: usage.totalOutputTokens,
            totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
            requests: usage.totalRequests,
            cost: usage.totalCost.toFixed(4),
        },
        today: {
            inputTokens: todayUsage.inputTokens,
            outputTokens: todayUsage.outputTokens,
            totalTokens: todayUsage.inputTokens + todayUsage.outputTokens,
            requests: todayUsage.requests,
            cost: todayUsage.cost.toFixed(4),
        },
        byModel: Object.entries(usage.models).map(([model, stats]) => ({
            model,
            inputTokens: stats.inputTokens,
            outputTokens: stats.outputTokens,
            requests: stats.requests,
            cost: stats.cost.toFixed(4),
        })),
        dailyHistory,
    };
};

/**
 * Test LLM Connection and Model Settings
 */
export const testConnection = async (provider, apiKey, textModel, visionModel, ollamaUrl = '') => {
    try {
        // 1. Verify text model
        await chatCompletion({
            messages: [{ role: 'user', content: 'Say OK' }],
            model: textModel,
            temperature: 0.1,
            maxTokens: 10,
            providerOverride: provider,
            apiKeyOverride: apiKey,
            ollamaUrlOverride: ollamaUrl
        });

        // 2. Verify vision model if provided and provider is not local Ollama
        if (visionModel && provider !== 'ollama') {
            await chatCompletion({
                messages: [{ role: 'user', content: 'Say OK' }],
                model: visionModel,
                temperature: 0.1,
                maxTokens: 10,
                providerOverride: provider,
                apiKeyOverride: apiKey,
                ollamaUrlOverride: ollamaUrl
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Connection test failed:', error);
        return { success: false, error: error.message || 'API request failed' };
    }
};

export const getProviderTextModels = (provider) => {
    const defaultModels = PROVIDERS[provider]?.textModels || [];
    const envKey = `VITE_${provider.toUpperCase()}_TEXT_MODELS`;
    const envVal = import.meta.env[envKey];
    if (envVal) {
        const envModels = envVal.split(',').map(m => m.trim()).filter(Boolean);
        return Array.from(new Set([...envModels, ...defaultModels]));
    }
    return defaultModels;
};

export const getProviderVisionModels = (provider) => {
    const defaultModels = PROVIDERS[provider]?.visionModels || [];
    const envKey = `VITE_${provider.toUpperCase()}_VISION_MODELS`;
    const envVal = import.meta.env[envKey];
    if (envVal) {
        const envModels = envVal.split(',').map(m => m.trim()).filter(Boolean);
        return Array.from(new Set([...envModels, ...defaultModels]));
    }
    return defaultModels;
};

export const resetTokenUsage = () => {
    localStorage.removeItem('groq_usage');
};

export default {
    getActiveConfig,
    hasApiKey,
    chatCompletion,
    chatCompletionStream,
    processImageWithVision,
    extractImageContent,
    getUsageSummary,
    testConnection,
    cleanErrorMessage,
    sanitizeAPIKeys,
    resetTokenUsage,
    getProviderTextModels,
    getProviderVisionModels
};
