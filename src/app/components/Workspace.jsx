"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { Menu, Plus, MessageSquare, Code, CheckSquare, FileText, Settings, ChevronRight, X, LayoutDashboard, Edit2, Trash2, Database as DbIcon, Target, FileCode } from "lucide-react";
import clsx from "clsx";

import IntakeForm from "./IntakeForm";
import InterviewTab from "./InterviewTab";
import MemoryTab from "./MemoryTab";
import ReviewTab from "./ReviewTab";
import BlueprintTab from "./BlueprintTab";
import PromptTab from "./PromptTab";
import SettingsView from "./SettingsView";

const PIPELINE_STAGES = {
  IDEA: 'IDEA',
  INTERVIEW: 'INTERVIEW',
  MEMORY: 'MEMORY',
  REVIEW: 'REVIEW',
  BLUEPRINT: 'BLUEPRINT',
  PROMPT: 'PROMPT',
};

const STAGE_ORDER = Object.values(PIPELINE_STAGES);

export default function Workspace() {
  const { user, logOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);

  const [appView, setAppView] = useState("project"); // "project" | "settings"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectState, setActiveProjectState] = useState(null);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const initialFetchDone = useRef(false);

  // Fetch list of projects
  useEffect(() => {
    const fetchProjects = async () => {
       if (!user) return;
       setIsLoadingProjects(true);
       try {
          const token = await user.getIdToken();
          const res = await fetch("/api/projects", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
             const data = await res.json();
             setProjects(data.projects || []);

             if (data.projects?.length > 0 && !activeProjectId && !initialFetchDone.current) {
                setActiveProjectId(data.projects[0].id);
                initialFetchDone.current = true;
             }
          }
       } catch (e) {
          console.error("Failed to fetch projects", e);
       } finally {
          setIsLoadingProjects(false);
       }
    };
    fetchProjects();
  }, [user, activeProjectId]);

  // Fetch full state of the active project
  const loadActiveProjectDetails = async () => {
      if (!activeProjectId || !user || activeProjectId === 'new') return;
      try {
         const token = await user.getIdToken();
         const res = await fetch(`/api/projects/${activeProjectId}`, { headers: { Authorization: `Bearer ${token}` } });
         if (res.ok) {
            const data = await res.json();
            setActiveProjectState(data.project);
         }
      } catch (e) {
         console.error("Failed to load active project details", e);
      }
  };

  useEffect(() => {
     if (activeProjectId === 'new') {
        setActiveProjectState({ id: 'new', status: PIPELINE_STAGES.IDEA });
     } else {
        loadActiveProjectDetails();
     }
  }, [activeProjectId, user]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    setAppView("project");
  };

  const handleNewChatClick = () => {
     setActiveProjectId('new');
     setAppView("project");
  };

  const onProjectCreated = (newId) => {
     setActiveProjectId(newId);
     advanceStage(newId, PIPELINE_STAGES.INTERVIEW);
     setProjects([{ id: newId, title: "Loading...", status: PIPELINE_STAGES.INTERVIEW }, ...projects]);
  };

  const handleRename = async (e, projectId) => {
     e.stopPropagation();
     const newTitle = prompt("Enter new title:");
     if (!newTitle) return;

     setProjects(projects.map(p => p.id === projectId ? { ...p, title: newTitle } : p));
     try {
        const token = await user.getIdToken();
        await fetch(`/api/projects/${projectId}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ title: newTitle })
        });
     } catch(e) { console.error(e); }
  };

  const handleDelete = async (e, projectId) => {
     e.stopPropagation();
     if (!confirm("Delete this conversation?")) return;

     setProjects(projects.filter(p => p.id !== projectId));
     if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setActiveProjectState(null);
     }

     try {
        const token = await user.getIdToken();
        await fetch(`/api/projects/${projectId}`, {
           method: "DELETE",
           headers: { Authorization: `Bearer ${token}` }
        });
     } catch(e) { console.error(e); }
  };

  const advanceStage = async (projectId, nextStage) => {
     setProjects(projects.map(p => p.id === projectId ? { ...p, status: nextStage } : p));
     if (activeProjectState) {
        setActiveProjectState({ ...activeProjectState, status: nextStage });
     }

     try {
        const token = await user.getIdToken();
        await fetch(`/api/projects/${projectId}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ status: nextStage })
        });
     } catch (e) {
        console.error("Failed to advance stage", e);
     }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs">A</span>
            </div>
            Architect AI
          </h2>
          <button className="md:hidden text-gray-500" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={handleNewChatClick}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              History
            </div>
            {isLoadingProjects ? (
               <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
            ) : projects.length === 0 ? (
               <div className="px-3 py-2 text-sm text-gray-400">No projects yet.</div>
            ) : (
               <ul className="space-y-1">
                 {projects.map((project) => (
                   <li key={project.id}>
                     <div
                       onClick={() => handleSelectProject(project.id)}
                       className={clsx(
                         "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors cursor-pointer group",
                         (appView === "project" && activeProjectId === project.id)
                           ? "bg-blue-50 text-blue-700 font-medium"
                           : "text-gray-700 hover:bg-gray-100"
                       )}
                     >
                       <LayoutDashboard size={16} className="shrink-0" />
                       <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{project.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{project.status}</div>
                       </div>

                       <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button onClick={(e) => handleRename(e, project.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit2 size={12}/></button>
                          <button onClick={(e) => handleDelete(e, project.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 size={12}/></button>
                       </div>
                     </div>
                   </li>
                 ))}
               </ul>
            )}
          </div>

          <div>
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Configuration
            </div>
            <ul className="space-y-1">
              <li>
                <button
                    onClick={() => setAppView("settings")}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                      appView === "settings"
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Settings size={16} />
                    AI Providers & Models
                  </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium text-gray-900 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={logOut}
              className="mt-3 w-full text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 transition-colors font-medium"
            >
              Sign out
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md"
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center text-sm text-gray-500">
              {appView === "settings" ? (
                <span className="font-medium text-gray-900">Configuration</span>
              ) : (
                <>
                  <span>History</span>
                  <ChevronRight size={16} className="mx-1" />
                  <span className="font-medium text-gray-900">
                    {activeProjectState?.title || "New Project"}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {appView === "settings" ? (
          <div className="flex-1 overflow-hidden p-4 md:p-6 max-w-5xl mx-auto w-full">
            <SettingsView />
          </div>
        ) : activeProjectId === 'new' ? (
           <div className="flex-1 overflow-y-auto">
             <IntakeForm onProjectCreated={onProjectCreated} />
           </div>
        ) : activeProjectState ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10 overflow-x-auto shrink-0">
               <div className="flex items-center justify-between min-w-[600px] max-w-4xl mx-auto relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>

                  {[
                    { id: PIPELINE_STAGES.INTERVIEW, label: "Interview", icon: MessageSquare },
                    { id: PIPELINE_STAGES.MEMORY, label: "Memory", icon: DbIcon },
                    { id: PIPELINE_STAGES.REVIEW, label: "Review", icon: CheckSquare },
                    { id: PIPELINE_STAGES.BLUEPRINT, label: "Blueprint", icon: FileText },
                    { id: PIPELINE_STAGES.PROMPT, label: "Prompt", icon: FileCode },
                  ].map((stage, idx) => {
                     // Offset by 1 because IDEA is stage 0 but not shown in this stepper
                     const currentIdx = STAGE_ORDER.indexOf(activeProjectState.status);
                     const stageIdx = STAGE_ORDER.indexOf(stage.id);
                     const isCurrent = currentIdx === stageIdx;
                     const isPast = currentIdx > stageIdx;

                     return (
                        <div key={stage.id} className="flex flex-col items-center bg-white px-2">
                           <div className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium border-4 border-white shadow-sm transition-colors cursor-pointer",
                              isCurrent ? "bg-blue-600 ring-2 ring-blue-200" : isPast ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 hover:bg-gray-400"
                           )}
                           onClick={() => {
                              // Allow navigation to past phases
                              if (isPast || (activeProjectState.requirementsConfirmed && stageIdx > currentIdx)) {
                                 advanceStage(activeProjectState.id, stage.id);
                              }
                           }}>
                              {isPast ? "✓" : (idx + 1)}
                           </div>
                           <span className={clsx("text-xs mt-2 font-medium", isCurrent ? "text-blue-700" : isPast ? "text-gray-700" : "text-gray-400")}>
                              {stage.label}
                           </span>
                        </div>
                     )
                  })}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col max-w-5xl mx-auto w-full">

              {activeProjectState.status === PIPELINE_STAGES.INTERVIEW && (
                 <>
                   <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-sm text-blue-800">Discuss ideas, trade-offs, and technology choices. Once scoped, proceed to verify extracted architectural memory.</p>
                      <button
                         onClick={() => advanceStage(activeProjectState.id, PIPELINE_STAGES.MEMORY)}
                         className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 shadow-sm w-full md:w-auto text-center"
                      >
                         Proceed to Project Memory →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><InterviewTab project={activeProjectState} /></div>
                 </>
              )}

              {activeProjectState.status === PIPELINE_STAGES.MEMORY && (
                 <>
                   <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                      <p className="text-sm text-purple-800">Verify extracted assumptions, exclusions, and decisions.</p>
                      <button
                         onClick={() => advanceStage(activeProjectState.id, PIPELINE_STAGES.REVIEW)}
                         className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shrink-0 shadow-sm w-full md:w-auto text-center"
                      >
                         Proceed to Requirements Review →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0">
                      <MemoryTab
                         project={activeProjectState}
                         onMemoryUpdated={() => loadActiveProjectDetails()}
                      />
                   </div>
                 </>
              )}

              {activeProjectState.status === PIPELINE_STAGES.REVIEW && (
                 <>
                   <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                      <p className="text-sm text-amber-800">Review structured requirements. Explicit Confirmation is required to unlock downstream blueprints.</p>
                      <button
                         onClick={() => advanceStage(activeProjectState.id, PIPELINE_STAGES.BLUEPRINT)}
                         disabled={!activeProjectState.requirementsConfirmed}
                         className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shrink-0 shadow-sm w-full md:w-auto text-center disabled:opacity-50"
                      >
                         Generate Blueprint →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0">
                      <ReviewTab
                         project={activeProjectState}
                         onRequirementsUpdated={() => loadActiveProjectDetails()}
                      />
                   </div>
                 </>
              )}

              {activeProjectState.status === PIPELINE_STAGES.BLUEPRINT && (
                 <>
                   <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                      <p className="text-sm text-indigo-800">Review system architecture, API contracts, database schemas, and implementation task phases.</p>
                      <button
                         onClick={() => advanceStage(activeProjectState.id, PIPELINE_STAGES.PROMPT)}
                         disabled={!activeProjectState.blueprint}
                         className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0 shadow-sm w-full md:w-auto text-center disabled:opacity-50"
                      >
                         Generate Coding Prompt →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0">
                      <BlueprintTab
                         project={activeProjectState}
                         onBlueprintUpdated={() => loadActiveProjectDetails()}
                      />
                   </div>
                 </>
              )}

              {activeProjectState.status === PIPELINE_STAGES.PROMPT && (
                 <>
                   <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                      <p className="text-sm text-green-800">Your final, execution-ready prompt to feed directly into your preferred coding agent.</p>
                   </div>
                   <div className="flex-1 min-h-0">
                      <PromptTab
                         project={activeProjectState}
                         onPromptUpdated={() => loadActiveProjectDetails()}
                      />
                   </div>
                 </>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
             Loading project workspace...
          </div>
        )}
      </main>
    </div>
  );
}
