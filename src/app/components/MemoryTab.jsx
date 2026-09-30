"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Loader2, RefreshCw, CheckCircle, Database, AlertCircle, AlertTriangle, HelpCircle, Lightbulb, UserCheck, XCircle, Plus, Trash2, Save } from "lucide-react";

// Moved outside to fix static-components rule
const MemorySection = ({ title, icon: Icon, category, colorClass, memory, updateItem, removeItem, addItem }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
     <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50`}>
        <h3 className={`font-bold flex items-center gap-2 ${colorClass}`}>
           <Icon size={18} /> {title}
        </h3>
        <button onClick={() => addItem(category)} className="text-gray-400 hover:text-gray-700 p-1"><Plus size={16}/></button>
     </div>
     <div className="p-4 space-y-2">
        {memory[category]?.length === 0 && <p className="text-sm text-gray-400 italic">No items identified.</p>}
        {memory[category]?.map((item, idx) => (
           <div key={idx} className="flex gap-2 items-start">
              <div className="mt-1 text-gray-400">•</div>
              <textarea
                 value={item}
                 onChange={(e) => updateItem(category, idx, e.target.value)}
                 className="flex-1 text-sm bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded px-2 py-1 outline-none resize-none overflow-hidden"
                 rows={Math.max(1, Math.ceil(item.length / 80))}
              />
              <button onClick={() => removeItem(category, idx)} className="text-gray-300 hover:text-red-500 mt-1 p-1"><Trash2 size={14}/></button>
           </div>
        ))}
     </div>
  </div>
);

export default function MemoryTab({ project, onMemoryUpdated }) {
  const { user } = useAuth();
  const [memory, setMemory] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
     const timer = setTimeout(() => {
        if (project?.memory) {
           setMemory({
              userDecisions: project.memory.userDecisions || [],
              recommendations: project.memory.recommendations || [],
              assumptions: project.memory.assumptions || [],
              exclusions: project.memory.exclusions || [],
              researchFindings: project.memory.researchFindings || [],
              unresolvedQuestions: project.memory.unresolvedQuestions || [],
              scopeConflicts: project.memory.scopeConflicts || [],
           });
        }
     }, 0);
     return () => clearTimeout(timer);
  }, [project]);

  const synthesizeMemory = async () => {
    setIsSynthesizing(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try { const saved = localStorage.getItem("architect_ai_settings_v3"); if (saved) aiSettings = JSON.parse(saved); } catch (e) {}

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: project.id, aiSettings }),
      });

      if (!res.ok) throw new Error("Failed to synthesize memory");
      const data = await res.json();
      setMemory(data.memory);
      if (onMemoryUpdated) onMemoryUpdated(data.memory);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveManualEdits = async () => {
     setIsSaving(true);
     try {
       const token = await user.getIdToken();
       await fetch(`/api/projects/${project.id}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ memory })
       });
       if (onMemoryUpdated) onMemoryUpdated(memory);
     } catch(e) {
        console.error(e);
     } finally {
        setIsSaving(false);
     }
  };

  const addItem = (category) => {
     setMemory(prev => ({ ...prev, [category]: [...prev[category], ""] }));
  };

  const updateItem = (category, idx, val) => {
     setMemory(prev => {
        const next = [...prev[category]];
        next[idx] = val;
        return { ...prev, [category]: next };
     });
  };

  const removeItem = (category, idx) => {
     setMemory(prev => {
        const next = [...prev[category]];
        next.splice(idx, 1);
        return { ...prev, [category]: next };
     });
  };

  if (!memory) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
           <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
           <p>Loading project memory...</p>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6">
         <p className="text-sm text-gray-600">
            Memory Vault automatically extracts key architectural constraints from your chat. Review, edit, or regenerate it.
         </p>
         <div className="flex gap-3">
            <button
               onClick={handleSaveManualEdits}
               disabled={isSaving}
               className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
               {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Edits
            </button>
            <button
               onClick={synthesizeMemory}
               disabled={isSynthesizing}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
               {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Synthesize from Chat
            </button>
         </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      <div className="flex-1 overflow-y-auto pb-10">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
            <div className="flex flex-col">
               <MemorySection title="User Decisions" icon={UserCheck} category="userDecisions" colorClass="text-blue-700" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
               <MemorySection title="Assumptions" icon={AlertCircle} category="assumptions" colorClass="text-purple-700" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
               <MemorySection title="Explicit Exclusions" icon={XCircle} category="exclusions" colorClass="text-gray-700" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
            </div>
            <div className="flex flex-col">
               <MemorySection title="Recommendations" icon={Lightbulb} category="recommendations" colorClass="text-green-700" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
               <MemorySection title="Unresolved Questions" icon={HelpCircle} category="unresolvedQuestions" colorClass="text-amber-600" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
               <MemorySection title="Scope Conflicts" icon={AlertTriangle} category="scopeConflicts" colorClass="text-red-600" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
               <MemorySection title="Research Findings" icon={Database} category="researchFindings" colorClass="text-indigo-600" memory={memory} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
            </div>
         </div>
      </div>
    </div>
  );
}
