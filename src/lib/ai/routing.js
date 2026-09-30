import { GoogleGenAI } from "@google/genai";

/**
 * Unified AI Routing Utility
 * Supports fallback across Google Gemini, OpenRouter/Omniroute, and Self-Hosted OpenAI-compatible endpoints.
 */

async function callGemini(messages, systemInstruction, temperature, useSearch, config) {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure it in Provider Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = config?.model || "gemini-3.1-pro-preview";

  const reqConfig = {
    systemInstruction,
    temperature,
  };

  if (useSearch) {
    reqConfig.tools = [{ googleSearch: {} }];
  }

  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await ai.models.generateContent({
    model,
    contents: geminiMessages,
    config: reqConfig,
  });

  return {
    text: response.text,
    metadata: useSearch && response.candidates?.[0]?.groundingMetadata ? response.candidates[0].groundingMetadata : null
  };
}

async function callOpenAICompatible(messages, systemInstruction, temperature, config) {
  let { baseUrl, apiKey, model } = config;

  if (!baseUrl) {
    throw new Error("Missing Base URL configuration for OpenAI compatible endpoint.");
  }

  // Ensure trailing slash is removed for clean URL construction
  baseUrl = baseUrl.replace(/\/$/, '');

  const oaiMessages = [];
  if (systemInstruction) {
    oaiMessages.push({ role: "system", content: systemInstruction });
  }

  messages.forEach(msg => {
     oaiMessages.push({
       role: msg.role === 'model' ? 'assistant' : msg.role,
       content: msg.content
     });
  });

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://appshub.app",
      "X-Title": "Architect AI",
    },
    body: JSON.stringify({
      model: model || "default",
      messages: oaiMessages,
      temperature
    })
  };

  if (apiKey) {
    fetchOptions.headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  } else if (!baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
     // If it's a remote URL and no API key is provided, fail fast to prevent unauthenticated network hangups
     throw new Error("API Key is missing for this remote provider.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, fetchOptions);

  if (!response.ok) {
    let errorText = "";
    try {
       errorText = await response.text();
    } catch(e) {}
    throw new Error(`API Error ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    metadata: null
  };
}

export async function executeAiRequest({
  messages,
  systemInstruction,
  temperature = 0.7,
  useSearch = false,
  providers = []
}) {
  if (!providers || providers.length === 0) {
    // Default to standard Gemini if no routing config is provided
    return callGemini(messages, systemInstruction, temperature, useSearch, { model: "gemini-3.1-pro-preview" });
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      if (provider.type === "gemini-native" || provider.type === "gemini") {
        return await callGemini(messages, systemInstruction, temperature, useSearch, {
          apiKey: provider.apiKey,
          model: provider.model
        });
      }

      if (provider.type === "openai-compatible" || provider.type === "openrouter" || provider.type === "selfHosted") {
        const apiKey = provider.apiKey || (provider.baseUrl.includes('omni') ? (process.env.OMNI_API_KEY || process.env.OPENROUTER_API_KEY) : null);

        return await callOpenAICompatible(messages, systemInstruction, temperature, {
          baseUrl: provider.baseUrl,
          apiKey: apiKey,
          model: provider.model
        });
      }
    } catch (error) {
      console.error(`Provider [${provider.type}] failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All configured AI providers failed. Last error: ${lastError?.message}`);
}
