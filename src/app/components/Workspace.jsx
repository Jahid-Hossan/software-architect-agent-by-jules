"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { Menu, Plus, MessageSquare, Code, CheckSquare, FileText, Settings, ChevronRight, X, LayoutDashboard, Edit2, Trash2 } from "lucide-react";
import clsx from "clsx";
import InterviewTab from "./InterviewTab";
import BlueprintTab from "./BlueprintTab";
import SettingsView from "./SettingsView";

const PIPELINE_STAGES = {
  INTERVIEW: 'INTERVIEW',
  TECHNOLOGY: 'TECHNOLOGY',
  REVIEW: 'REVIEW',
  BLUEPRINT: 'BLUEPRINT',
  CODING_PROMPT: 'CODING_PROMPT',
};

const STAGE_ORDER = Object.values(PIPELINE_STAGES);

export default function Workspace() {
  const { user, logOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);

  const [appView, setAppView] = useState("project"); // "project" | "settings"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Use refs to avoid dependency loops if functions are redefined
  const initialFetchDone = useRef(false);

  useEffect(() => {
    const fetchProjects = async () => {
       if (!user) return;
       setIsLoadingProjects(true);
       try {
          const token = await user.getIdToken();
          const res = await fetch("/api/projects", {
             headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
             const data = await res.json();
             setProjects(data.projects || []);

             // Auto select first project if nothing selected yet
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
  }, [user, activeProjectId]); // Added activeProjectId to deps

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    setAppView("project");
  };

  const handleNewChat = async () => {
     try {
        const token = await user.getIdToken();
        const res = await fetch("/api/projects", {
           method: "POST",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ title: "New Project Conversation" })
        });
        if (res.ok) {
           const data = await res.json();
           const newProj = { id: data.projectId, title: "New Project Conversation", status: PIPELINE_STAGES.INTERVIEW, updatedAt: new Date().toISOString() };
           setProjects([newProj, ...projects]);
           setActiveProjectId(data.projectId);
           setAppView("project");
        }
     } catch (e) {
        console.error(e);
     }
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
     if (activeProjectId === projectId) setActiveProjectId(null);

     try {
        const token = await user.getIdToken();
        await fetch(`/api/projects/${projectId}`, {
           method: "DELETE",
           headers: { Authorization: `Bearer ${token}` }
        });
     } catch(e) { console.error(e); }
  };

  const advanceStage = async (nextStage) => {
     setProjects(projects.map(p => p.id === activeProjectId ? { ...p, status: nextStage } : p));
     try {
        const token = await user.getIdToken();
        await fetch(`/api/projects/${activeProjectId}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ status: nextStage })
        });
     } catch (e) {
        console.error("Failed to advance stage", e);
     }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

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
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Chats / History
            </div>
            {isLoadingProjects ? (
               <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
            ) : projects.length === 0 ? (
               <div className="px-3 py-2 text-sm text-gray-400">No chats yet.</div>
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
                          <div className="truncate">{project.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{project.status}</div>
                       </div>

                       <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button onClick={(e) => handleRename(e, project.id)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={12}/></button>
                          <button onClick={(e) => handleDelete(e, project.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12}/></button>
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
                    AI Providers
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
              className="mt-3 w-full text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 transition-colors"
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
                  <span>Chats</span>
                  <ChevronRight size={16} className="mx-1" />
                  <span className="font-medium text-gray-900">
                    {activeProject?.title || "Select a project"}
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
        ) : activeProjectId ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
               <div className="flex items-center justify-between max-w-4xl mx-auto relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>

                  {[
                    { id: PIPELINE_STAGES.INTERVIEW, label: "Interview", icon: MessageSquare },
                    { id: PIPELINE_STAGES.TECHNOLOGY, label: "Tech Stack", icon: Code },
                    { id: PIPELINE_STAGES.REVIEW, label: "Review", icon: CheckSquare },
                    { id: PIPELINE_STAGES.BLUEPRINT, label: "Blueprint", icon: FileText },
                    { id: PIPELINE_STAGES.CODING_PROMPT, label: "Prompt", icon: FileText },
                  ].map((stage, idx) => {
                     const isCurrent = activeProject?.status === stage.id;
                     const isPast = STAGE_ORDER.indexOf(activeProject?.status) > idx;

                     return (
                        <div key={stage.id} className="flex flex-col items-center bg-white px-2">
                           <div className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium border-4 border-white shadow-sm transition-colors",
                              isCurrent ? "bg-blue-600 ring-2 ring-blue-200" : isPast ? "bg-green-500" : "bg-gray-300"
                           )}>
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
              {activeProject?.status === PIPELINE_STAGES.INTERVIEW && (
                 <>
                   <div className="mb-4 flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">Complete the interview with Architect AI. Once you have a clear scope, proceed to the next step.</p>
                      <button
                         onClick={() => advanceStage(PIPELINE_STAGES.TECHNOLOGY)}
                         className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                         Proceed to Tech Stack →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><InterviewTab projectId={activeProjectId} stage={PIPELINE_STAGES.INTERVIEW} /></div>
                 </>
              )}
              {activeProject?.status === PIPELINE_STAGES.TECHNOLOGY && (
                 <>
                   <div className="mb-4 flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-purple-800">Discuss and finalize the optimal technologies for your requirements.</p>
                      <button
                         onClick={() => advanceStage(PIPELINE_STAGES.REVIEW)}
                         className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                         Approve Tech & Review →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><InterviewTab projectId={activeProjectId} stage={PIPELINE_STAGES.TECHNOLOGY} /></div>
                 </>
              )}
              {activeProject?.status === PIPELINE_STAGES.REVIEW && (
                 <>
                   <div className="mb-4 flex justify-between items-center bg-amber-50 p-4 rounded-lg border border-amber-100">
                      <p className="text-sm text-amber-800">Final review of requirements and technical selections before generating heavy blueprints.</p>
                      <button
                         onClick={() => advanceStage(PIPELINE_STAGES.BLUEPRINT)}
                         className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-amber-700 transition-colors"
                      >
                         Generate Blueprint →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><InterviewTab projectId={activeProjectId} stage={PIPELINE_STAGES.REVIEW} /></div>
                 </>
              )}
              {activeProject?.status === PIPELINE_STAGES.BLUEPRINT && (
                 <>
                   <div className="mb-4 flex justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <p className="text-sm text-indigo-800">Review the generated system architecture and implementation blueprint.</p>
                      <button
                         onClick={() => advanceStage(PIPELINE_STAGES.CODING_PROMPT)}
                         className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                         Create Coding Prompt →
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><BlueprintTab projectId={activeProjectId} requirementsConfirmed={true} /></div>
                 </>
              )}
              {activeProject?.status === PIPELINE_STAGES.CODING_PROMPT && (
                 <>
                   <div className="mb-4 flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-green-800">Your final prompt is ready to be sent to a coding agent (Cursor, Claude Code, etc.).</p>
                      <button
                         onClick={() => {
                             alert("Full prompt copied to clipboard!");
                         }}
                         className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                         Copy Full Prompt
                      </button>
                   </div>
                   <div className="flex-1 min-h-0"><InterviewTab projectId={activeProjectId} stage={PIPELINE_STAGES.CODING_PROMPT} /></div>
                 </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
            Select a conversation from the sidebar or create a new chat to get started.
          </div>
        )}
      </main>
    </div>
  );
}
