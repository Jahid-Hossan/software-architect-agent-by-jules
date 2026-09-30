"use client";

import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle } from "lucide-react";

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    primaryProvider: "gemini",
    fallbackProvider: "none",
    omnirouteApiKey: "",
    omnirouteModel: "anthropic/claude-3-haiku",
    selfHostedUrl: "http://localhost:11434/v1",
    selfHostedApiKey: "",
    selfHostedModel: "llama3",
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load from local storage on mount - wrap in timeout to fix setState in effect warning
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("architect_ai_settings");
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("architect_ai_settings", JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Settings size={18} className="text-gray-600" />
          AI Provider Settings
        </h3>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {isSaved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <p className="text-sm text-gray-500 mb-8">
          Configure how the Architect AI routes your requests. If the Primary Provider fails, the system will automatically attempt to use the Fallback Provider. API keys entered here are stored locally in your browser.
        </p>

        {/* Routing Configuration */}
        <section className="mb-10">
          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Routing Strategy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Provider</label>
              <select
                name="primaryProvider"
                value={settings.primaryProvider}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="omniroute">Omniroute / OpenRouter</option>
                <option value="self-hosted">Self-Hosted / Local (Ollama, LM Studio)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Provider</label>
              <select
                name="fallbackProvider"
                value={settings.fallbackProvider}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None (Fail immediately)</option>
                <option value="gemini">Google Gemini (Default)</option>
                <option value="omniroute">Omniroute / OpenRouter</option>
                <option value="self-hosted">Self-Hosted / Local</option>
              </select>
            </div>
          </div>
        </section>

        {/* Omniroute Settings */}
        <section className="mb-10">
          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Omniroute / OpenRouter Configuration</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                name="omnirouteApiKey"
                value={settings.omnirouteApiKey}
                onChange={handleChange}
                placeholder="sk-or-v1-..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model String</label>
              <input
                type="text"
                name="omnirouteModel"
                value={settings.omnirouteModel}
                onChange={handleChange}
                placeholder="anthropic/claude-3-haiku"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Self-Hosted Settings */}
        <section>
          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Self-Hosted Configuration (OpenAI Compatible)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (include /v1)</label>
              <input
                type="text"
                name="selfHostedUrl"
                value={settings.selfHostedUrl}
                onChange={handleChange}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                name="selfHostedModel"
                value={settings.selfHostedModel}
                onChange={handleChange}
                placeholder="llama3"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Optional)</label>
              <input
                type="password"
                name="selfHostedApiKey"
                value={settings.selfHostedApiKey}
                onChange={handleChange}
                placeholder="Leave blank for local Ollama"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
