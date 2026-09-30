import { GoogleGenAI } from "@google/genai";

/**
 * Unified AI Routing Utility
 * Supports fallback across Google Gemini, OpenRouter/Omniroute, and Self-Hosted OpenAI-compatible endpoints.
 */

async function callGemini(messages, systemInstruction, temperature, useSearch, config) {
  // Use client-provided API key or fallback to server env
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = config?.model || "gemini-3.1-pro-preview"; // Updated from 2.5-pro

  const reqConfig = {
    systemInstruction,
    temperature,
  };

  if (useSearch) {
    reqConfig.tools = [{ googleSearch: {} }];
  }

  // Convert generic messages to Gemini format
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
  const { baseUrl, apiKey, model } = config;

  if (!baseUrl) {
    throw new Error(`Missing Base URL configuration for OpenAI compatible endpoint.`);
  }

  // Convert generic messages to OpenAI format
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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      model: model || "default", // OpenRouter requires model, local servers might not
      messages: oaiMessages,
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    metadata: null // Search grounding usually not supported natively in generic format
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

  // Attempt each provider in the fallback chain
  for (const provider of providers) {
    try {
      if (provider.type === "gemini") {
        return await callGemini(messages, systemInstruction, temperature, useSearch, {
          apiKey: provider.apiKey,
          model: provider.model
        });
      }

      if (provider.type === "openrouter") {
        return await callOpenAICompatible(messages, systemInstruction, temperature, {
          baseUrl: "https://openrouter.ai/api/v1", // Fixed base URL for OpenRouter
          apiKey: provider.apiKey,
          model: provider.model
        });
      }

      if (provider.type === "selfHosted") {
         return await callOpenAICompatible(messages, systemInstruction, temperature, {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model
        });
      }
    } catch (error) {
      console.error(`Provider [${provider.type}] failed:`, error.message);
      lastError = error;
      // Continue to the next provider in the loop
    }
  }

  // If we exhaust the loop, all providers failed
  throw new Error(`All configured AI providers failed. Last error: ${lastError?.message}`);
}
