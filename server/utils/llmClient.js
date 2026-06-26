/**
 * Unified Backend LLM Client
 * Routes chat, vision, and extraction completions to OpenAI-compatible, Gemini, and Anthropic APIs.
 */

// Clean error message helper
const cleanErrorMessage = (errorObj, defaultMsg) => {
    if (!errorObj) return defaultMsg;
    if (typeof errorObj === 'string') return errorObj;
    return errorObj.error?.message || errorObj.message || defaultMsg;
};

// 1. OpenAI-Compatible Call
const callOpenAICompatible = async ({ apiBaseUrl, apiKey, model, messages, temperature, maxTokens, responseFormat }) => {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const body = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
    };
    if (responseFormat) body.response_format = responseFormat;

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `API Error (Status ${response.status})`));
    }

    return await response.json();
};

// 2. Gemini Call
const callGemini = async ({ apiKey, model, messages, temperature, maxTokens, responseFormat }) => {
    const systemMessage = messages.find(m => m.role === 'system');
    const geminiMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => {
            let parts = [];
            if (Array.isArray(msg.content)) {
                msg.content.forEach(part => {
                    if (part.type === 'text') {
                        parts.push({ text: part.text });
                    } else if (part.type === 'image_url') {
                        // Extract base64 and mime type from data URL
                        const match = part.image_url.url.match(/^data:(.*?);base64,(.*)$/);
                        if (match) {
                            parts.push({
                                inlineData: {
                                    mimeType: match[1],
                                    data: match[2]
                                }
                            });
                        }
                    }
                });
            } else {
                parts.push({ text: msg.content });
            }
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts
            };
        });

    const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens
    };

    if (responseFormat && responseFormat.type === 'json_object') {
        generationConfig.responseMimeType = 'application/json';
    }

    const body = {
        contents: geminiMessages,
        generationConfig
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
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `Gemini API Error (Status ${response.status})`));
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Standardize to OpenAI structure
    return {
        choices: [
            {
                message: {
                    role: 'assistant',
                    content
                }
            }
        ]
    };
};

// 3. Anthropic Call
const callAnthropic = async ({ apiKey, model, messages, temperature, maxTokens, responseFormat }) => {
    const systemMessage = messages.find(m => m.role === 'system');
    
    // Map messages
    const claudeMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => {
            let content = [];
            if (Array.isArray(msg.content)) {
                msg.content.forEach(part => {
                    if (part.type === 'text') {
                        content.push({ type: 'text', text: part.text });
                    } else if (part.type === 'image_url') {
                        const match = part.image_url.url.match(/^data:(.*?);base64,(.*)$/);
                        if (match) {
                            content.push({
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: match[1],
                                    data: match[2]
                                }
                            });
                        }
                    }
                });
            } else {
                content = msg.content;
            }
            return {
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content
            };
        });

    const body = {
        model,
        messages: claudeMessages,
        max_tokens: maxTokens,
        temperature
    };

    if (systemMessage) {
        body.system = systemMessage.content;
    }

    // Standard Anthropic json response prompt adjustment
    if (responseFormat && responseFormat.type === 'json_object') {
        const jsonInstruction = "\nCRITICAL: Return your response strictly as valid, parsable JSON matching the requested structure.";
        if (body.system) {
            body.system += jsonInstruction;
        } else {
            body.system = jsonInstruction;
        }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(cleanErrorMessage(error, `Anthropic API Error (Status ${response.status})`));
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return {
        choices: [
            {
                message: {
                    role: 'assistant',
                    content
                }
            }
        ]
    };
};

// Main completions router
export const chatCompletion = async ({
    provider = 'groq',
    apiKey,
    messages,
    model,
    temperature = 0.3,
    maxTokens = 4000,
    responseFormat,
    ollamaUrl = 'http://localhost:11434'
}) => {
    if (!apiKey && provider !== 'ollama') {
        throw new Error(`API key is missing for LLM provider: ${provider}`);
    }

    if (provider === 'gemini') {
        return callGemini({ apiKey, model, messages, temperature, maxTokens, responseFormat });
    } else if (provider === 'anthropic') {
        return callAnthropic({ apiKey, model, messages, temperature, maxTokens, responseFormat });
    } else {
        let apiBaseUrl = 'https://api.groq.com/openai/v1';
        if (provider === 'openai') apiBaseUrl = 'https://api.openai.com/v1';
        if (provider === 'openrouter') apiBaseUrl = 'https://openrouter.ai/api/v1';
        if (provider === 'ollama') apiBaseUrl = `${ollamaUrl}/v1`;

        return callOpenAICompatible({ apiBaseUrl, apiKey, model, messages, temperature, maxTokens, responseFormat });
    }
};

export const chatCompletionStream = async ({
    provider = 'groq',
    apiKey,
    messages,
    model,
    temperature = 0.3,
    maxTokens = 4000,
    ollamaUrl = 'http://localhost:11434',
    onChunk
}) => {
    if (!apiKey && provider !== 'ollama') {
        throw new Error(`API key is missing for LLM provider: ${provider}`);
    }

    if (provider === 'gemini') {
        const systemMessage = messages.find(m => m.role === 'system');
        const geminiMessages = messages
            .filter(m => m.role !== 'system')
            .map(msg => {
                let parts = [];
                if (Array.isArray(msg.content)) {
                    msg.content.forEach(part => {
                        if (part.type === 'text') {
                            parts.push({ text: part.text });
                        }
                    });
                } else {
                    parts.push({ text: msg.content });
                }
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });

        const generationConfig = {
            temperature,
            maxOutputTokens: maxTokens
        };

        const body = {
            contents: geminiMessages,
            generationConfig
        };

        if (systemMessage) {
            body.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(cleanErrorMessage(error, `Gemini Stream API Error (Status ${response.status})`));
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        for await (const rawChunk of response.body) {
            buffer += typeof rawChunk === 'string' ? rawChunk : decoder.decode(rawChunk, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                if (cleanLine.startsWith('data:')) {
                    const dataStr = cleanLine.slice(5).trim();
                    try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (content) onChunk(content);
                    } catch (e) {}
                }
            }
        }
    } else if (provider === 'anthropic') {
        const systemMessage = messages.find(m => m.role === 'system');
        const claudeMessages = messages
            .filter(m => m.role !== 'system')
            .map(msg => {
                let content = [];
                if (Array.isArray(msg.content)) {
                    msg.content.forEach(part => {
                        if (part.type === 'text') {
                            content.push({ type: 'text', text: part.text });
                        }
                    });
                } else {
                    content = msg.content;
                }
                return {
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content
                };
            });

        const body = {
            model,
            messages: claudeMessages,
            max_tokens: maxTokens,
            temperature,
            stream: true
        };

        if (systemMessage) {
            body.system = systemMessage.content;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(cleanErrorMessage(error, `Anthropic Stream API Error (Status ${response.status})`));
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        for await (const rawChunk of response.body) {
            buffer += typeof rawChunk === 'string' ? rawChunk : decoder.decode(rawChunk, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                if (cleanLine.startsWith('data:')) {
                    const dataStr = cleanLine.slice(5).trim();
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                            onChunk(parsed.delta.text);
                        }
                    } catch (e) {}
                }
            }
        }
    } else {
        // OpenAI, Groq, OpenRouter, Ollama
        let apiBaseUrl = 'https://api.groq.com/openai/v1';
        if (provider === 'openai') apiBaseUrl = 'https://api.openai.com/v1';
        if (provider === 'openrouter') apiBaseUrl = 'https://openrouter.ai/api/v1';
        if (provider === 'ollama') apiBaseUrl = `${ollamaUrl}/v1`;

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const body = {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true
        };

        const response = await fetch(`${apiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(cleanErrorMessage(error, `API Stream Error (Status ${response.status})`));
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        for await (const rawChunk of response.body) {
            buffer += typeof rawChunk === 'string' ? rawChunk : decoder.decode(rawChunk, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                if (cleanLine.startsWith('data:')) {
                    const dataStr = cleanLine.slice(5).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) onChunk(content);
                    } catch (e) {}
                }
            }
        }
    }
};

export default {
    chatCompletion,
    chatCompletionStream
};
