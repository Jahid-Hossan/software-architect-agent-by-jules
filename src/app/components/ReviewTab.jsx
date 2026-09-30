"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Loader2, RefreshCw, CheckCircle, Edit3, ShieldAlert, Target } from "lucide-react";

// Moved outside to fix React static component error
const Section = ({ title, content }) => (
  <div className="mb-6">
     <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">{title}</h4>
     {Array.isArray(content) ? (
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1">
           {content.length === 0 ? <li className="text-gray-400 italic list-none">Not specified</li> : content.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
     ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{content || <span className="text-gray-400 italic">Not specified</span>}</p>
     )}
  </div>
);

export default function ReviewTab({ project, onRequirementsUpdated }) {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
     const timer = setTimeout(() => {
        if (project?.requirements) {
           setRequirements(project.requirements);
        }
     }, 0);
     return () => clearTimeout(timer);
  }, [project]);

  const generateRequirements = async () => {
    setIsSynthesizing(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try { const saved = localStorage.getItem("architect_ai_settings_v3"); if (saved) aiSettings = JSON.parse(saved); } catch (e) {}

      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: project.id, aiSettings }),
      });

      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || "Failed to generate requirements");
      }
      const data = await res.json();
      setRequirements(data.requirements);
      if (onRequirementsUpdated) onRequirementsUpdated();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const toggleConfirmation = async (forceRevoke = false) => {
     setIsConfirming(true);
     try {
       const token = await user.getIdToken();
       const newStatus = forceRevoke ? false : !project.requirementsConfirmed;

       await fetch(`/api/projects/${project.id}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({
              requirementsConfirmed: newStatus,
              requirementsConfirmedAt: newStatus ? "NOW" : null
           })
       });
       if (onRequirementsUpdated) onRequirementsUpdated();
     } catch(e) {
        console.error(e);
     } finally {
        setIsConfirming(false);
     }
  };

  if (!requirements && !isSynthesizing) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 max-w-md mx-auto text-center space-y-4">
           <Target size={48} className="text-gray-300" />
           <h3 className="text-lg font-bold text-gray-800">No Requirements Generated</h3>
           <p className="text-sm">Generate the final structured requirements specification from the Project Memory to proceed.</p>
           <button
               onClick={generateRequirements}
               className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
           >
               Generate Requirements
           </button>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className={project?.requirementsConfirmed ? "text-green-600" : "text-amber-500"} size={20} />
            Structured Requirements Review
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Version: {project?.requirementsVersion || 0} |
            Status: {project?.requirementsConfirmed ? <span className="text-green-600 font-bold ml-1">Confirmed</span> : <span className="text-amber-600 font-bold ml-1">Pending Confirmation</span>}
          </p>
        </div>

        <div className="flex gap-2">
           {project?.requirementsConfirmed ? (
              <button
                 onClick={() => toggleConfirmation(true)}
                 disabled={isConfirming}
                 className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                 {isConfirming ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
                 Request Scope Changes
              </button>
           ) : (
              <>
                 <button
                    onClick={generateRequirements}
                    disabled={isSynthesizing}
                    className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                 >
                    {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Regenerate
                 </button>
                 <button
                    onClick={() => toggleConfirmation()}
                    disabled={isConfirming || isSynthesizing || !requirements}
                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                 >
                    {isConfirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Explicitly Confirm Requirements
                 </button>
              </>
           )}
        </div>
      </div>

      {error && <div className="m-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
         {isSynthesizing ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
               <Loader2 size={40} className="animate-spin text-blue-500" />
               <p>Synthesizing Project Memory into strict formal requirements...</p>
            </div>
         ) : requirements && (
            <div className="max-w-4xl mx-auto space-y-8">

               {!project?.requirementsConfirmed && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800">
                     <ShieldAlert className="shrink-0 mt-0.5" size={20} />
                     <div className="text-sm">
                        <strong className="block mb-1">Confirmation Required</strong>
                        Blueprint and Coding Agent Prompt generation are locked until you explicitly confirm these requirements. If you see errors or missing information, return to the Interview or Memory phase and update the project context before regenerating.
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="md:col-span-2">
                     <Section title="Purpose" content={requirements.purpose} />
                  </div>
                  <div>
                     <Section title="Target Users" content={requirements.targetUsers} />
                     <Section title="Included Features" content={requirements.includedFeatures} />
                     <Section title="Technical Assumptions" content={requirements.technicalAssumptions} />
                  </div>
                  <div>
                     <Section title="Primary User Journey" content={requirements.primaryUserJourney} />
                     <Section title="Explicit Exclusions" content={requirements.explicitExclusions} />
                     <Section title="Success Criteria" content={requirements.successCriteria} />
                  </div>
                  <div className="md:col-span-2">
                     <Section title="Data & Access Requirements" content={requirements.dataAndAccessRequirements} />
                  </div>
                  <div className="md:col-span-2">
                     <Section title="Integrations & APIs" content={requirements.integrationsAndApis} />
                  </div>
                  <div className="md:col-span-2">
                     <Section title="Budget & Hosting Constraints" content={requirements.budgetAndHostingConstraints} />
                  </div>
                  <div className="md:col-span-2">
                     <Section title="Research Limitations / Gaps" content={requirements.researchLimitations} />
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
