import { GoogleGenAI } from "@google/genai";
import { ApiSettings } from '../types/index.js';
import * as prompts from '../utils/prompts.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callOpenAI = async (settings: ApiSettings, prompt: string, jsonMode: boolean = false, systemInstruction?: string): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");

  const baseUrl = (settings.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model: settings.model,
    messages: messages,
    temperature: 0.7,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
      "HTTP-Referer": "https://econarrative.studio", // Optional
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

export const generateText = async (settings: ApiSettings, prompt: string, jsonMode: boolean = false, systemInstruction?: string): Promise<string> => {
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (settings.provider === 'openai') {
        return await callOpenAI(settings, prompt, jsonMode, systemInstruction);
      } else {
        // Google GenAI SDK
        const ai = new GoogleGenAI({
            apiKey: settings.apiKey,
            baseUrl: settings.baseUrl || undefined
        } as any);
        
        const config: any = {
          temperature: 0.7,
          systemInstruction: systemInstruction
        };
        if (jsonMode) config.responseMimeType = "application/json";

        const response = await ai.models.generateContent({
          model: settings.model,
          contents: prompt,
          config
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
        console.warn(`API Error (Attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${waitTime}ms...`, msg);
        await delay(waitTime);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

// Business Logic Functions
export const generateEntitiesForLayer = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.generateEntitiesPrompt(params.layerTitle, params.layerDesc, params.categoriesStr, params.isTimeDimension, params.context);
    return await generateText(settings, prompt, false);
};

export const importWorldFromText = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.importWorldPrompt(params.storyText);
    return await generateText(settings, prompt, true);
};

export const generateWorldFromScenario = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.generateWorldFromScenarioPrompt(params.scenarioPrompt, params.frameworkName, params.frameworkDesc, params.layerInstructions);
    return await generateText(settings, prompt, true);
};

export const executeAgentTask = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.executeAgentTaskPrompt(params.taskInstruction, params.currentTime, params.worldContext, params.systemState, params.previousOutput, params.agentRole, params.critiqueFeedback);
    return await generateText(settings, prompt, false, params.systemPrompt);
};

export const executeReviewTask = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.executeReviewTaskPrompt(params.contentToReview, params.criteria);
    return await generateText(settings, prompt, true, params.systemPrompt);
};

export const generateWorldChronicle = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.generateWorldChroniclePrompt(params.frameworkName, params.context, params.entitiesDigest, params.historyDigest);
    return await generateText(settings, prompt, false);
};

export const generateRelatedTechNode = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.generateRelatedTechNodePrompt(params.context, params.baseNode, params.relation);
    return await generateText(settings, prompt, true);
};

export const generateCharacterProfile = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.generateCharacterProfilePrompt(params.promptInput, params.contextSnippet);
    return await generateText(settings, prompt, true);
};

export const extractEntitiesFromSnippet = async (settings: ApiSettings, params: any) => {
    const prompt = prompts.extractEntitiesFromSnippetPrompt(params.snippet, params.contextSnippet);
    return await generateText(settings, prompt, true);
};
