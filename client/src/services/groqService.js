/**
 * Client-Side Groq API Service
 * Direct API calls to Groq from the browser using user's API key.
 * This eliminates backend processing and token waste.
 */

// Groq API Base URL
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

// Default models
const DEFAULT_TEXT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Pricing per million tokens (as of 2024 - update as needed)
export const PRICING = {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.2-90b-vision-preview': { input: 0.90, output: 0.90 },
    'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0.11, output: 0.34 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
};

/**
 * Get the user's Groq API key from localStorage
 * @returns {string|null}
 */
export const getApiKey = () => {
    return localStorage.getItem('groq_api_key');
};

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export const hasApiKey = () => {
    return !!getApiKey();
};

/**
 * Make a chat completion request to Groq
 * @param {Object} options - Request options
 * @param {Array} options.messages - Chat messages array
 * @param {string} options.model - Model to use
 * @param {number} options.temperature - Temperature (0-2)
 * @param {number} options.maxTokens - Max tokens to generate
 * @param {boolean} options.stream - Whether to stream response
 * @returns {Promise<Object>} - Chat completion response
 */
export const chatCompletion = async ({
    messages,
    model = DEFAULT_TEXT_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
    stream = false,
}) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API key not configured. Please set your Groq API key in settings.');
    }

    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.error?.message || `API request failed: ${response.status}`;
        
        // Check for rate limiting
        if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            throw new Error(`Rate limit exceeded. ${retryAfter ? `Try again in ${retryAfter}s` : 'Please wait a moment.'}`);
        }
        
        throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Track usage
    if (data.usage) {
        trackTokenUsage(model, data.usage.prompt_tokens, data.usage.completion_tokens);
    }

    return data;
};

/**
 * Stream a chat completion from Groq
 * @param {Object} options - Request options (same as chatCompletion)
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<{content: string, usage: Object}>}
 */
export const chatCompletionStream = async ({ messages, model = DEFAULT_TEXT_MODEL, temperature = 0.7, maxTokens = 4096 }, onChunk) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API key not configured');
    }

    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API request failed: ${response.status}`);
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
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            } catch {
                // Skip malformed chunks
            }
        }
    }

    // Estimate tokens for tracking (no exact count in streaming)
    const estimatedInput = Math.ceil(JSON.stringify(messages).length / 4);
    const estimatedOutput = Math.ceil(fullContent.length / 4);
    trackTokenUsage(model, estimatedInput, estimatedOutput);

    return { content: fullContent };
};

/**
 * Process an image with Groq Vision API
 * @param {string} base64Image - Base64 encoded image (with data URL prefix)
 * @param {string} prompt - Instruction for vision processing
 * @param {string} model - Vision model to use
 * @returns {Promise<string>} - Vision analysis result
 */
export const processImageWithVision = async (base64Image, prompt, model = DEFAULT_VISION_MODEL) => {
    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { 
                    type: 'image_url', 
                    image_url: { url: base64Image } 
                },
            ],
        },
    ];

    const response = await chatCompletion({
        messages,
        model,
        temperature: 0.1,
        maxTokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
};

/**
 * Extract content from an assignment image using vision
 * @param {string} base64Image - Base64 image data
 * @param {number} pageNumber - Page number for context
 * @param {string} fileName - File name for context
 * @returns {Promise<string>}
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
 * Track token usage in localStorage
 * @param {string} model - Model used
 * @param {number} inputTokens - Input tokens used
 * @param {number} outputTokens - Output tokens generated
 */
export const trackTokenUsage = (model, inputTokens, outputTokens) => {
    const usage = getTokenUsage();
    const today = new Date().toISOString().split('T')[0];

    // Initialize model entry if needed
    if (!usage.models[model]) {
        usage.models[model] = { inputTokens: 0, outputTokens: 0, requests: 0, cost: 0 };
    }

    // Update model stats
    usage.models[model].inputTokens += inputTokens;
    usage.models[model].outputTokens += outputTokens;
    usage.models[model].requests += 1;

    // Calculate cost
    const pricing = PRICING[model] || { input: 0.5, output: 0.5 };
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
    usage.models[model].cost += cost;

    // Update totals
    usage.totalInputTokens += inputTokens;
    usage.totalOutputTokens += outputTokens;
    usage.totalRequests += 1;
    usage.totalCost += cost;

    // Track daily usage
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
 * Get token usage stats from localStorage
 * @returns {Object}
 */
export const getTokenUsage = () => {
    const stored = localStorage.getItem('groq_usage');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // Invalid data, reset
        }
    }

    return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalRequests: 0,
        totalCost: 0,
        models: {},
        daily: {},
        lastUpdated: null,
    };
};

/**
 * Reset token usage stats
 */
export const resetTokenUsage = () => {
    localStorage.removeItem('groq_usage');
};

/**
 * Get usage summary for display
 * @returns {Object}
 */
export const getUsageSummary = () => {
    const usage = getTokenUsage();
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = usage.daily[today] || { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };

    // Get last 7 days of usage for charts
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

export default {
    getApiKey,
    hasApiKey,
    chatCompletion,
    chatCompletionStream,
    processImageWithVision,
    extractImageContent,
    trackTokenUsage,
    getTokenUsage,
    resetTokenUsage,
    getUsageSummary,
    PRICING,
};
