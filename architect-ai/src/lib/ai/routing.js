import { GoogleGenAI } from "@google/genai";

/**
 * Unified AI Routing Utility
 * Supports fallback across Google Gemini, OpenRouter/Omniroute, and Self-Hosted OpenAI-compatible endpoints.
 */

async function callGemini(messages, systemInstruction, temperature, useSearch) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-2.5-pro";

  const config = {
    systemInstruction,
    temperature,
  };

  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  // Convert generic messages to Gemini format
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await ai.models.generateContent({
    model,
    contents: geminiMessages,
    config,
  });

  return {
    text: response.text,
    metadata: useSearch && response.candidates?.[0]?.groundingMetadata ? response.candidates[0].groundingMetadata : null
  };
}

async function callOpenAICompatible(messages, systemInstruction, temperature, config) {
  const { baseUrl, apiKey, model } = config;

  if (!baseUrl || !apiKey) {
    throw new Error(`Missing configuration for OpenAI compatible endpoint: ${baseUrl}`);
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
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "default", // Some self-hosted don't care, OpenRouter requires it
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
    return callGemini(messages, systemInstruction, temperature, useSearch);
  }

  let lastError = null;

  // Attempt each provider in the fallback chain
  for (const provider of providers) {
    try {
      if (provider.type === "gemini") {
        return await callGemini(messages, systemInstruction, temperature, useSearch);
      }

      if (provider.type === "omniroute") {
        return await callOpenAICompatible(messages, systemInstruction, temperature, {
          baseUrl: provider.baseUrl || "https://openrouter.ai/api/v1", // Standard OpenRouter/Omniroute base
          apiKey: provider.apiKey,
          model: provider.model || "anthropic/claude-3-haiku" // A fast default
        });
      }

      if (provider.type === "self-hosted") {
         return await callOpenAICompatible(messages, systemInstruction, temperature, {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey || "dummy-key", // some local hosts don't need a key
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
