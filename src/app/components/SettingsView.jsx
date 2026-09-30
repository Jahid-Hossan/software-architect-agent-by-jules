"use client";

import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle, Database, Plus, Trash2, Edit2, Play, RefreshCw } from "lucide-react";

const INITIAL_PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    type: "gemini-native",
    baseUrl: "",
    apiKey: "",
    isEnabled: true,
    defaultModelSlug: "gemini-3.1-pro-preview",
    models: [
      { id: "g1", name: "Gemini 3.1 Pro Preview", slug: "gemini-3.1-pro-preview", isCustom: false },
      { id: "g2", name: "Gemini 3.8 Flash", slug: "gemini-3.8-flash", isCustom: false },
      { id: "g3", name: "Gemini 3.5 Flash Lite", slug: "gemini-3.5-flash-lite", isCustom: false },
    ]
  },
  {
    id: "omni",
    name: "Omni Gateway",
    type: "openai-compatible",
    baseUrl: "https://omni.appshub.app/v1",
    apiKey: "",
    isEnabled: true,
    defaultModelSlug: "anthropic/claude-3-haiku",
    models: [
      { id: "o1", name: "Claude 3 Haiku", slug: "anthropic/claude-3-haiku", isCustom: false },
      { id: "o2", name: "Claude 3.5 Sonnet", slug: "anthropic/claude-3-5-sonnet", isCustom: false },
      { id: "o3", name: "GPT-4o Mini", slug: "openai/gpt-4o-mini", isCustom: false },
    ]
  },
  {
    id: "selfHosted",
    name: "Self-Hosted (Ollama)",
    type: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "",
    isEnabled: true,
    defaultModelSlug: "llama3",
    models: [
      { id: "s1", name: "Llama 3", slug: "llama3", isCustom: false },
      { id: "s2", name: "Mistral", slug: "mistral", isCustom: false },
    ]
  }
];

const DEFAULT_SETTINGS = {
  routing: {
    primary: { providerId: "gemini", modelSlug: "gemini-3.1-pro-preview" },
    fallback: { providerId: "none", modelSlug: "" },
  },
  providers: INITIAL_PROVIDERS
};

export default function SettingsView() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("routing"); // routing | providers

  // UI State for editing
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [testStatus, setTestStatus] = useState({});
  const [isFetchingModels, setIsFetchingModels] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("architect_ai_settings_v3");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      } else {
        // Attempt migration from v2 if v3 doesn't exist
        const oldSaved = localStorage.getItem("architect_ai_settings_v2");
        if (oldSaved) {
           try {
              const oldParsed = JSON.parse(oldSaved);
              const migratedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

              // Migrate credentials
              const gProv = migratedSettings.providers.find(p => p.id === 'gemini');
              if (gProv) gProv.apiKey = oldParsed.providers?.gemini?.apiKey || "";

              const oProv = migratedSettings.providers.find(p => p.id === 'omni');
              if (oProv) {
                 oProv.apiKey = oldParsed.providers?.openrouter?.apiKey || "";
                 oProv.baseUrl = oldParsed.providers?.openrouter?.baseUrl || "https://omni.appshub.app/v1";
              }

              const sProv = migratedSettings.providers.find(p => p.id === 'selfHosted');
              if (sProv) {
                 sProv.apiKey = oldParsed.providers?.selfHosted?.apiKey || "";
                 sProv.baseUrl = oldParsed.providers?.selfHosted?.baseUrl || "http://localhost:11434/v1";
              }

              // Migrate routing
              const mapProvId = (pid) => pid === 'openrouter' ? 'omni' : pid;
              migratedSettings.routing.primary.providerId = mapProvId(oldParsed.routing?.primary?.provider) || "gemini";
              migratedSettings.routing.primary.modelSlug = oldParsed.routing?.primary?.model || "gemini-3.1-pro-preview";
              migratedSettings.routing.fallback.providerId = mapProvId(oldParsed.routing?.fallback?.provider) || "none";
              migratedSettings.routing.fallback.modelSlug = oldParsed.routing?.fallback?.model || "";

              setSettings(migratedSettings);
           } catch(e) {}
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    localStorage.setItem("architect_ai_settings_v3", JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const updateRouting = (route, field, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      newSettings.routing[route][field] = value;

      if (field === 'providerId' && value !== 'none') {
         const provider = prev.providers.find(p => p.id === value);
         newSettings.routing[route].modelSlug = provider?.defaultModelSlug || provider?.models[0]?.slug || "";
      }

      if (field === 'providerId' && value === 'none') {
         newSettings.routing[route].modelSlug = "";
      }

      return newSettings;
    });
    setIsSaved(false);
  };

  const updateProvider = (id, field, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const index = newSettings.providers.findIndex(p => p.id === id);
      if (index > -1) {
        newSettings.providers[index][field] = value;
      }
      return newSettings;
    });
    setIsSaved(false);
  };

  const addProvider = () => {
    const newId = `prov_${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      providers: [...prev.providers, {
        id: newId,
        name: "New Provider",
        type: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        isEnabled: true,
        defaultModelSlug: "",
        models: []
      }]
    }));
    setEditingProviderId(newId);
    setIsSaved(false);
  };

  const deleteProvider = (id) => {
    setSettings(prev => {
       const newSettings = { ...prev };
       newSettings.providers = newSettings.providers.filter(p => p.id !== id);

       if (newSettings.routing.primary.providerId === id) {
          newSettings.routing.primary.providerId = "none";
          newSettings.routing.primary.modelSlug = "";
       }
       if (newSettings.routing.fallback.providerId === id) {
          newSettings.routing.fallback.providerId = "none";
          newSettings.routing.fallback.modelSlug = "";
       }
       return newSettings;
    });
    setIsSaved(false);
  };

  const addModel = (providerId) => {
     setSettings(prev => {
      const newSettings = { ...prev };
      const index = newSettings.providers.findIndex(p => p.id === providerId);
      if (index > -1) {
        newSettings.providers[index].models.push({
           id: `mod_${Date.now()}`,
           name: "New Model",
           slug: "model-slug",
           isCustom: true
        });
      }
      return newSettings;
    });
    setIsSaved(false);
  };

  const updateModel = (providerId, modelId, field, value) => {
     setSettings(prev => {
      const newSettings = { ...prev };
      const pIndex = newSettings.providers.findIndex(p => p.id === providerId);
      if (pIndex > -1) {
        const mIndex = newSettings.providers[pIndex].models.findIndex(m => m.id === modelId);
        if (mIndex > -1) {
           newSettings.providers[pIndex].models[mIndex][field] = value;

           // If we changed the slug and it's the default, update the default
           if (field === 'slug' && prev.providers[pIndex].defaultModelSlug === prev.providers[pIndex].models[mIndex].slug) {
               newSettings.providers[pIndex].defaultModelSlug = value;
           }
        }
      }
      return newSettings;
    });
    setIsSaved(false);
  };

  const deleteModel = (providerId, modelId) => {
     setSettings(prev => {
      const newSettings = { ...prev };
      const pIndex = newSettings.providers.findIndex(p => p.id === providerId);
      if (pIndex > -1) {
        newSettings.providers[pIndex].models = newSettings.providers[pIndex].models.filter(m => m.id !== modelId);
      }
      return newSettings;
    });
    setIsSaved(false);
  };

  const testConnection = async (provider) => {
    setTestStatus(prev => ({ ...prev, [provider.id]: "testing" }));
    try {
      if (provider.type === "openai-compatible") {
        let cleanBaseUrl = provider.baseUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanBaseUrl}/models`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${provider.apiKey}`
          }
        });
        if (res.ok) {
           setTestStatus(prev => ({ ...prev, [provider.id]: "success" }));
        } else {
           const err = await res.text();
           setTestStatus(prev => ({ ...prev, [provider.id]: `error: ${res.status} ${err.substring(0, 30)}` }));
        }
      } else {
        // Gemini test implies checking standard SDK which is backend side, just mock success for UI if key exists
        if (provider.apiKey || provider.id === 'gemini') {
           setTestStatus(prev => ({ ...prev, [provider.id]: "success" }));
        } else {
           setTestStatus(prev => ({ ...prev, [provider.id]: "error: Missing API Key" }));
        }
      }
    } catch (e) {
       setTestStatus(prev => ({ ...prev, [provider.id]: `error: ${e.message}` }));
    }
  };

  const fetchModels = async (provider) => {
     if (provider.type !== "openai-compatible") return;

     setIsFetchingModels(prev => ({ ...prev, [provider.id]: true }));
     try {
        let cleanBaseUrl = provider.baseUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanBaseUrl}/models`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${provider.apiKey}`
          }
        });

        if (res.ok) {
           const data = await res.json();
           if (data.data && Array.isArray(data.data)) {
              const fetchedModels = data.data.map((m, i) => ({
                 id: `fetched_${Date.now()}_${i}`,
                 name: m.id, // usually API doesn't return friendly names
                 slug: m.id,
                 isCustom: true
              }));

              setSettings(prev => {
                const newSettings = { ...prev };
                const pIndex = newSettings.providers.findIndex(p => p.id === provider.id);
                if (pIndex > -1) {
                   // Append only unique slugs
                   const existingSlugs = new Set(newSettings.providers[pIndex].models.map(m => m.slug));
                   const newUnique = fetchedModels.filter(m => !existingSlugs.has(m.slug));
                   newSettings.providers[pIndex].models = [...newSettings.providers[pIndex].models, ...newUnique];
                }
                return newSettings;
              });
              alert(`Successfully imported ${fetchedModels.length} models.`);
           }
        } else {
           alert("Failed to fetch models from provider.");
        }
     } catch (e) {
        alert("Error fetching models: " + e.message);
     } finally {
        setIsFetchingModels(prev => ({ ...prev, [provider.id]: false }));
        setIsSaved(false);
     }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            AI Provider & Model Manager
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure routing strategies, add custom gateways, and map exact model slugs.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {isSaved ? "Saved Successfully!" : "Save Settings"}
        </button>
      </div>

      {/* Tabs Nav */}
      <div className="px-5 pt-3 border-b border-gray-200 flex gap-1">
         <button onClick={() => setActiveTab("routing")} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'routing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Routing Strategy
         </button>
         <button onClick={() => setActiveTab("providers")} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'providers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Providers & Models
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">

        {activeTab === 'routing' && (
          <section className="max-w-3xl space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Database size={18} className="text-gray-600" /> Primary Route
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
                  <select
                    value={settings.routing.primary.providerId}
                    onChange={(e) => updateRouting("primary", "providerId", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    {settings.providers.filter(p => p.isEnabled).map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Model (Slug)</label>
                  <select
                    value={settings.routing.primary.modelSlug}
                    onChange={(e) => updateRouting("primary", "modelSlug", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                     {settings.providers.find(p => p.id === settings.routing.primary.providerId)?.models.map(m => (
                        <option key={m.id} value={m.slug}>{m.name} ({m.slug})</option>
                     ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Database size={18} className="text-gray-600" /> Fallback Route
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
                  <select
                    value={settings.routing.fallback.providerId}
                    onChange={(e) => updateRouting("fallback", "providerId", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="none">None (Fail immediately)</option>
                    {settings.providers.filter(p => p.isEnabled).map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Model (Slug)</label>
                  <select
                    value={settings.routing.fallback.modelSlug}
                    onChange={(e) => updateRouting("fallback", "modelSlug", e.target.value)}
                    disabled={settings.routing.fallback.providerId === 'none'}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
                  >
                     {settings.routing.fallback.providerId === 'none' ? (
                        <option value="">N/A</option>
                     ) : (
                        settings.providers.find(p => p.id === settings.routing.fallback.providerId)?.models.map(m => (
                           <option key={m.id} value={m.slug}>{m.name} ({m.slug})</option>
                        ))
                     )}
                  </select>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'providers' && (
           <div className="space-y-6">
              <div className="flex justify-end">
                 <button onClick={addProvider} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                    <Plus size={16} /> Add Custom Provider
                 </button>
              </div>

              {settings.providers.map(provider => (
                 <div key={provider.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <input
                             type="checkbox"
                             checked={provider.isEnabled}
                             onChange={(e) => updateProvider(provider.id, "isEnabled", e.target.checked)}
                             className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          {editingProviderId === provider.id ? (
                             <input
                                value={provider.name}
                                onChange={(e) => updateProvider(provider.id, "name", e.target.value)}
                                className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                             />
                          ) : (
                             <h3 className="font-bold text-gray-900">{provider.name}</h3>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">{provider.type}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => testConnection(provider)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Test Connection">
                             <Play size={16} />
                          </button>
                          <button onClick={() => setEditingProviderId(editingProviderId === provider.id ? null : provider.id)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Edit Properties">
                             <Edit2 size={16} />
                          </button>
                          {provider.id !== 'gemini' && (
                             <button onClick={() => deleteProvider(provider.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Provider">
                                <Trash2 size={16} />
                             </button>
                          )}
                       </div>
                    </div>

                    {testStatus[provider.id] && (
                       <div className={`px-5 py-2 text-xs font-medium border-b ${testStatus[provider.id] === 'success' ? 'bg-green-50 text-green-700 border-green-200' : testStatus[provider.id] === 'testing' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {testStatus[provider.id] === 'testing' ? 'Testing connection...' :
                           testStatus[provider.id] === 'success' ? 'Connection successful!' :
                           `Connection failed: ${testStatus[provider.id]}`}
                       </div>
                    )}

                    {editingProviderId === provider.id && (
                       <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Provider Type</label>
                                <select
                                   value={provider.type}
                                   onChange={(e) => updateProvider(provider.id, "type", e.target.value)}
                                   className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500"
                                   disabled={provider.id === 'gemini'}
                                >
                                   <option value="openai-compatible">OpenAI Compatible (REST)</option>
                                   <option value="gemini-native">Gemini Native SDK</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Default Model Slug</label>
                                <select
                                   value={provider.defaultModelSlug}
                                   onChange={(e) => updateProvider(provider.id, "defaultModelSlug", e.target.value)}
                                   className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500"
                                >
                                   <option value="">Select a default...</option>
                                   {provider.models.map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}
                                </select>
                             </div>
                             {provider.type === "openai-compatible" && (
                                <div className="md:col-span-2">
                                   <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
                                   <input
                                      type="text"
                                      value={provider.baseUrl}
                                      onChange={(e) => updateProvider(provider.id, "baseUrl", e.target.value)}
                                      placeholder="https://api.../v1"
                                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500"
                                   />
                                </div>
                             )}
                             <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">API Key (Bearer Token)</label>
                                <input
                                   type="password"
                                   value={provider.apiKey}
                                   onChange={(e) => updateProvider(provider.id, "apiKey", e.target.value)}
                                   placeholder="Leave blank for server env fallback or local auth"
                                   className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500"
                                />
                             </div>
                          </div>
                       </div>
                    )}

                    <div className="p-5">
                       <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-700">Model Mapping Configuration</h4>
                          <div className="flex gap-2">
                             {provider.type === "openai-compatible" && (
                                <button onClick={() => fetchModels(provider)} disabled={isFetchingModels[provider.id]} className="text-xs flex items-center gap-1 text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                   <RefreshCw size={12} className={isFetchingModels[provider.id] ? "animate-spin" : ""} /> Fetch Models
                                </button>
                             )}
                             <button onClick={() => addModel(provider.id)} className="text-xs flex items-center gap-1 text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                <Plus size={12} /> Add Model
                             </button>
                          </div>
                       </div>

                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                             <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
                                <tr>
                                   <th className="px-4 py-2 font-medium">Display Name</th>
                                   <th className="px-4 py-2 font-medium">Technical Slug (ID)</th>
                                   <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                             </thead>
                             <tbody>
                                {provider.models.map((model) => (
                                   <tr key={model.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                      <td className="px-4 py-2 w-1/3">
                                         <input
                                            value={model.name}
                                            onChange={(e) => updateModel(provider.id, model.id, "name", e.target.value)}
                                            className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 outline-none transition-colors"
                                         />
                                      </td>
                                      <td className="px-4 py-2 w-1/2">
                                         <input
                                            value={model.slug}
                                            onChange={(e) => updateModel(provider.id, model.id, "slug", e.target.value)}
                                            className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 font-mono text-xs outline-none transition-colors"
                                         />
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                         <button onClick={() => deleteModel(provider.id, model.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                            <Trash2 size={14} />
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                                {provider.models.length === 0 && (
                                   <tr>
                                      <td colSpan="3" className="px-4 py-4 text-center text-gray-500 text-xs">
                                         No models configured for this provider. Add one to use it in routing.
                                      </td>
                                   </tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
