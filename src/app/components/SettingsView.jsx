"use client";

import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle, Database } from "lucide-react";

const DEFAULT_SETTINGS = {
  routing: {
    primary: {
      provider: "gemini",
      model: "gemini-2.5-pro",
    },
    fallback: {
      provider: "none",
      model: "",
    },
  },
  providers: {
    openrouter: { apiKey: "" },
    gemini: { apiKey: "" },
    selfHosted: { baseUrl: "http://localhost:11434/v1", apiKey: "" },
  },
};

const PREDEFINED_MODELS = {
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  openrouter: ["anthropic/claude-3-haiku", "anthropic/claude-3-5-sonnet", "openai/gpt-4o", "openai/gpt-4o-mini", "meta-llama/llama-3-70b-instruct"],
  selfHosted: ["llama3", "mistral", "phi3", "gemma"],
  none: [],
};

export default function SettingsView() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("architect_ai_settings_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge deeply to handle structural changes smoothly
          setSettings({
            routing: { ...DEFAULT_SETTINGS.routing, ...(parsed.routing || {}) },
            providers: {
              openrouter: { ...DEFAULT_SETTINGS.providers.openrouter, ...(parsed.providers?.openrouter || {}) },
              gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...(parsed.providers?.gemini || {}) },
              selfHosted: { ...DEFAULT_SETTINGS.providers.selfHosted, ...(parsed.providers?.selfHosted || {}) },
            }
          });
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRoutingChange = (route, field, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.routing[route][field] = value;

      // Auto-set default model when provider changes if model is blank or switching away from 'none'
      if (field === 'provider' && value !== 'none') {
         newSettings.routing[route].model = PREDEFINED_MODELS[value]?.[0] || "";
      }

      if (field === 'provider' && value === 'none') {
         newSettings.routing[route].model = "";
      }

      return newSettings;
    });
    setIsSaved(false);
  };

  const handleProviderConfigChange = (provider, field, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.providers[provider][field] = value;
      return newSettings;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("architect_ai_settings_v2", JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            AI Provider & Routing Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure models and fallbacks for the Architect AI.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {isSaved ? "Saved Successfully!" : "Save Settings"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">

        {/* Routing Strategy */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
            <Database size={18} className="text-gray-600" />
            <h3 className="text-base font-bold text-gray-800">Routing Strategy</h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-6">

            {/* Primary Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Provider</label>
                <select
                  value={settings.routing.primary.provider}
                  onChange={(e) => handleRoutingChange("primary", "provider", e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="gemini">Google Gemini (Default)</option>
                  <option value="openrouter">OpenRouter / Omniroute</option>
                  <option value="selfHosted">Self-Hosted / Local (Ollama)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Model</label>
                <div className="relative">
                  <input
                    type="text"
                    list="primary-models"
                    value={settings.routing.primary.model}
                    onChange={(e) => handleRoutingChange("primary", "model", e.target.value)}
                    placeholder="Enter or select a model..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <datalist id="primary-models">
                    {PREDEFINED_MODELS[settings.routing.primary.provider]?.map(model => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            {/* Fallback Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fallback Provider</label>
                <select
                  value={settings.routing.fallback.provider}
                  onChange={(e) => handleRoutingChange("fallback", "provider", e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="none">None (Fail immediately)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter / Omniroute</option>
                  <option value="selfHosted">Self-Hosted / Local (Ollama)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fallback Model</label>
                <div className="relative">
                  <input
                    type="text"
                    list="fallback-models"
                    value={settings.routing.fallback.model}
                    onChange={(e) => handleRoutingChange("fallback", "model", e.target.value)}
                    placeholder={settings.routing.fallback.provider === 'none' ? "N/A" : "Enter or select a model..."}
                    disabled={settings.routing.fallback.provider === 'none'}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <datalist id="fallback-models">
                    {PREDEFINED_MODELS[settings.routing.fallback.provider]?.map(model => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Credentials & Configuration */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
            <Settings size={18} className="text-gray-600" />
            <h3 className="text-base font-bold text-gray-800">Provider Credentials</h3>
          </div>

          <div className="space-y-6">

            {/* Gemini */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">Google Gemini</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key (Optional override)</label>
                <input
                  type="password"
                  value={settings.providers.gemini.apiKey}
                  onChange={(e) => handleProviderConfigChange("gemini", "apiKey", e.target.value)}
                  placeholder="Leave blank to use server-side key"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* OpenRouter */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">OpenRouter / Omniroute</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={settings.providers.openrouter.apiKey}
                  onChange={(e) => handleProviderConfigChange("openrouter", "apiKey", e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Self-Hosted */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">Self-Hosted (OpenAI Compatible)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
                  <input
                    type="text"
                    value={settings.providers.selfHosted.baseUrl}
                    onChange={(e) => handleProviderConfigChange("selfHosted", "baseUrl", e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must include /v1 if required by your host (e.g. Ollama, vLLM).</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key (If applicable)</label>
                  <input
                    type="password"
                    value={settings.providers.selfHosted.apiKey}
                    onChange={(e) => handleProviderConfigChange("selfHosted", "apiKey", e.target.value)}
                    placeholder="Often not required for local hosts"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
