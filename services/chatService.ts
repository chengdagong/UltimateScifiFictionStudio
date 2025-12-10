import { GoogleGenAI } from "@google/genai";
import { BrainstormConfig, BrainstormMessage } from "../types";

/**
 * Initialize Google Client with specific API Key
 */
const getGoogleClient = (apiKey: string, baseUrl?: string) => {
    if (!apiKey) throw new Error("API Key is missing.");
    return new GoogleGenAI({
        apiKey: apiKey,
        baseUrl: baseUrl || undefined
    } as any);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call OpenAI Compatible API
 */
const callOpenAI = async (config: BrainstormConfig, messages: BrainstormMessage[]): Promise<string> => {
    if (!config.apiKey) throw new Error("API Key missing");

    const baseUrl = (config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, "");
    const url = `${baseUrl}/chat/completions`;

    const apiMessages = [];
    if (config.systemInstruction) {
        apiMessages.push({ role: "system", content: config.systemInstruction });
    }

    // Convert BrainstormMessage to OpenAI format
    messages.forEach(m => {
        apiMessages.push({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
        });
    });

    const body: any = {
        model: config.model,
        messages: apiMessages,
        temperature: config.temperature,
    };

    if (config.maxOutputTokens) {
        body.max_tokens = config.maxOutputTokens;
    }

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`,
            "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : '',
            "X-Title": "EcoNarrative Studio"
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
};

/**
 * Send Chat Message
 */
export const sendChatMessage = async (
    history: BrainstormMessage[],
    newMessage: string,
    config: BrainstormConfig
): Promise<string> => {

    // Construct full message list for context (unless using Google SDK which manages history via ChatSession, 
    // but here we might want stateless or manual management to support system instructions easily across providers)
    // For simplicity and uniformity, we'll use a stateless approach or construct history manually.

    const messages = [...history, { id: 'temp', role: 'user' as const, content: newMessage, timestamp: Date.now() }];

    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            if (config.provider === 'openai') {
                return await callOpenAI(config, messages);
            } else {
                // Google GenAI SDK
                const ai = getGoogleClient(config.apiKey, config.baseUrl);

                const generationConfig: any = {
                    temperature: config.temperature,
                };
                if (config.maxOutputTokens) generationConfig.maxOutputTokens = config.maxOutputTokens;

                const genaiConfig: any = {
                    temperature: config.temperature,
                    systemInstruction: config.systemInstruction
                };
                if (config.maxOutputTokens) genaiConfig.maxOutputTokens = config.maxOutputTokens;

                // Prepare contents (history + new message)
                const contents = history.map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                }));
                // Add the new message
                contents.push({
                    role: 'user',
                    parts: [{ text: newMessage }]
                });

                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: contents,
                    config: genaiConfig
                });

                return response.text || "";
            }
        } catch (error: any) {
            lastError = error;
            const msg = error.message || JSON.stringify(error);

            const isRetryable =
                msg.includes("500") ||
                msg.includes("503") ||
                msg.includes("Rpc failed") ||
                msg.includes("xhr error") ||
                msg.includes("fetch failed");

            if (isRetryable && attempt < MAX_RETRIES - 1) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.warn(`Brainstorm API Error (Attempt ${attempt + 1}/${MAX_RETRIES}). Retrying...`, msg);
                await delay(waitTime);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};
