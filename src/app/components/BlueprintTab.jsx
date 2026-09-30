"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Loader2, RefreshCw, FileText, Download, Target, Layers, Database, Globe, CheckSquare, ListTodo, ShieldAlert } from "lucide-react";

// Moved outside to fix React static component error
const NavTab = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
     onClick={() => setActiveTab(id)}
     className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
  >
     <Icon size={16} /> {label}
  </button>
);

export default function BlueprintTab({ project, onBlueprintUpdated }) {
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("architecture");

  useEffect(() => {
     if (project?.blueprint) {
        setBlueprint(project.blueprint);
     }
  }, [project]);

  const generateBlueprint = async () => {
    if (!project?.requirementsConfirmed) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try { const saved = localStorage.getItem("architect_ai_settings_v3"); if (saved) aiSettings = JSON.parse(saved); } catch (e) {}

      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: project.id, aiSettings }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || "Failed to generate blueprint");
      }

      const data = await res.json();
      setBlueprint(data.blueprint);
      if (onBlueprintUpdated) onBlueprintUpdated();
    } catch (error) {
      console.error(error);
      setError(`Failed to generate blueprint: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadJson = () => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-v${project?.blueprintRequirementsVersion || 0}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!project?.requirementsConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert size={48} className="text-amber-300" />
        <h3 className="text-xl font-bold text-gray-800">Requirements Not Confirmed</h3>
        <p className="text-sm">You must finalize and explicitly confirm the project requirements in the Review tab before generating an implementation blueprint.</p>
      </div>
    );
  }

  const isStale = blueprint && project?.blueprintRequirementsVersion !== project?.requirementsVersion;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Implementation Blueprint
          </h3>
          {blueprint && (
            <p className="text-xs text-gray-500 mt-1">Generated from Requirements v{project?.blueprintRequirementsVersion}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {blueprint && (
            <button onClick={handleDownloadJson} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors flex shadow-sm">
               <Download size={14} /> JSON
            </button>
          )}
          <button
            onClick={generateBlueprint}
            disabled={isGenerating}
            className="w-full md:w-auto justify-center flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {blueprint ? "Regenerate Blueprint" : "Generate Blueprint"}
          </button>
        </div>
      </div>

      {error && <div className="m-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {isStale && !isGenerating && (
         <div className="mx-4 mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm flex items-center gap-2">
            <ShieldAlert size={16} />
            <strong>Stale Blueprint:</strong> Requirements have been updated to v{project?.requirementsVersion} since this blueprint was generated. Please regenerate.
         </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
         {!blueprint && !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <FileText size={48} className="mb-4 opacity-20" />
               <p>Ready to synthesize the confirmed requirements into a technical specification.</p>
            </div>
         ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
               <Loader2 size={40} className="animate-spin text-blue-500" />
               <p>Architecting solution and mapping dependencies...</p>
            </div>
         ) : (
            <>
               <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2 shrink-0">
                  <NavTab id="architecture" icon={Layers} label="Architecture" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <NavTab id="tech" icon={Code} label="Tech Stack" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <NavTab id="data" icon={Database} label="Data Models" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <NavTab id="apis" icon={Globe} label="APIs & Contracts" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <NavTab id="tasks" icon={ListTodo} label="Tasks" activeTab={activeTab} setActiveTab={setActiveTab} />
                  <NavTab id="done" icon={CheckSquare} label="Definition of Done" activeTab={activeTab} setActiveTab={setActiveTab} />
               </div>

               <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
                  <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm">

                     {activeTab === 'architecture' && (
                        <div className="space-y-6">
                           <div>
                              <h4 className="font-bold text-gray-800 mb-2">System Overview</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{blueprint.architectureAndSystem?.overview}</p>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                 <h4 className="font-bold text-gray-800 mb-2">System Boundaries</h4>
                                 <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                                    {blueprint.architectureAndSystem?.systemBoundaries?.map((b,i) => <li key={i}>{b}</li>)}
                                 </ul>
                              </div>
                              <div>
                                 <h4 className="font-bold text-gray-800 mb-2">Module Responsibilities</h4>
                                 <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                                    {blueprint.architectureAndSystem?.moduleResponsibilities?.map((m,i) => <li key={i}>{m}</li>)}
                                 </ul>
                              </div>
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-800 mb-2">Directory Structure</h4>
                              <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                 {blueprint.architectureAndSystem?.directoryStructure}
                              </pre>
                           </div>
                        </div>
                     )}

                     {activeTab === 'tech' && (
                        <div className="space-y-6">
                           {blueprint.techStackAndRationale?.map((tech, i) => (
                              <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{tech.category}</span>
                                    <span className="font-bold text-gray-900">{tech.technology}</span>
                                 </div>
                                 <div className="text-sm text-gray-700 mt-2"><strong>Reason:</strong> {tech.reason}</div>
                                 <div className="text-sm text-gray-500 mt-1"><strong>Alternatives Considered:</strong> {tech.alternativesConsidered}</div>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeTab === 'data' && (
                        <div className="space-y-6">
                           {blueprint.dataEntitiesAndSchemas?.map((entity, i) => (
                              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                 <div className="bg-gray-50 px-4 py-2 font-bold text-gray-800 border-b border-gray-200 flex items-center gap-2">
                                    <Database size={16} className="text-gray-500"/> {entity.entity}
                                 </div>
                                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                       <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Fields</h5>
                                       <ul className="text-sm text-gray-700 space-y-1 font-mono text-xs">
                                          {entity.fields?.map((f, fi) => <li key={fi}>• {f}</li>)}
                                       </ul>
                                    </div>
                                    <div>
                                       <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Relationships</h5>
                                       <ul className="text-sm text-gray-700 space-y-1">
                                          {entity.relationships?.map((r, ri) => <li key={ri}>• {r}</li>)}
                                       </ul>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeTab === 'apis' && (
                        <div className="space-y-4">
                           {blueprint.apisAndIntegrations?.map((api, i) => (
                              <div key={i} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4">
                                 <div className="shrink-0 w-24">
                                    <span className={clsx(
                                       "text-xs font-bold px-2 py-1 rounded inline-block text-center w-full",
                                       api.method === 'GET' ? "bg-blue-100 text-blue-700" :
                                       api.method === 'POST' ? "bg-green-100 text-green-700" :
                                       api.method === 'PUT' ? "bg-amber-100 text-amber-700" :
                                       api.method === 'DELETE' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                    )}>{api.method}</span>
                                 </div>
                                 <div className="flex-1">
                                    <div className="font-mono text-sm font-bold text-gray-800 mb-1">{api.path}</div>
                                    <div className="text-sm text-gray-600 mb-2">{api.purpose}</div>
                                    <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">{api.contract}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeTab === 'tasks' && (
                        <div className="space-y-4">
                           {blueprint.implementationTasks?.map((task, i) => (
                              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                 <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                       <span className="text-xs font-mono font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{task.id}</span>
                                       <span className="font-bold text-gray-800 text-sm">{task.title}</span>
                                    </div>
                                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">{task.phase}</span>
                                 </div>
                                 <div className="p-4 space-y-3">
                                    <p className="text-sm text-gray-700">{task.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                       <div>
                                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Dependencies</h5>
                                          <div className="flex flex-wrap gap-1">
                                             {task.dependencies?.map((dep, di) => (
                                                <span key={di} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{dep}</span>
                                             ))}
                                          </div>
                                       </div>
                                       <div>
                                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Target Files</h5>
                                          <ul className="text-xs font-mono text-gray-600 space-y-0.5">
                                             {task.filesAffected?.map((f, fi) => <li key={fi}>{f}</li>)}
                                          </ul>
                                       </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                       <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Acceptance Criteria</h5>
                                       <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5 ml-1">
                                          {task.acceptanceCriteria?.map((c, ci) => <li key={ci}>{c}</li>)}
                                       </ul>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {activeTab === 'done' && (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Testing Strategy</h4>
                                 <p className="text-sm text-gray-700">{blueprint.definitionOfDone?.testing}</p>
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Security Standards</h4>
                                 <p className="text-sm text-gray-700">{blueprint.definitionOfDone?.security}</p>
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Error Handling</h4>
                                 <p className="text-sm text-gray-700">{blueprint.definitionOfDone?.errorHandling}</p>
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Accessibility</h4>
                                 <p className="text-sm text-gray-700">{blueprint.definitionOfDone?.accessibility}</p>
                              </div>
                              <div className="md:col-span-2">
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Production Readiness</h4>
                                 <p className="text-sm text-gray-700">{blueprint.definitionOfDone?.productionReadiness}</p>
                              </div>
                              <div className="md:col-span-2">
                                 <h4 className="text-sm font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Known Limitations / Risks</h4>
                                 <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">{blueprint.definitionOfDone?.limitations}</p>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </>
         )}
      </div>
    </div>
  );
}
