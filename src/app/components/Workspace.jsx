"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Menu, Plus, MessageSquare, ListTodo, Search, FileText, Settings, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import InterviewTab from "./InterviewTab";
import ResearchTab from "./ResearchTab";
import RequirementsTab from "./RequirementsTab";
import BlueprintTab from "./BlueprintTab";
import SettingsTab from "./SettingsTab";

export default function Workspace() {
  const { user, logOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("interview");
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [isMockConfirmed, setIsMockConfirmed] = useState(false);

  useEffect(() => {
    // Wrap in timeout to fix setState in effect warnings during hydration
    const timer = setTimeout(() => {
      setProjects([
        { id: "new-1", title: "New Project", status: "INTERVIEWING" },
      ]);
      setActiveProjectId("new-1");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const tabs = [
    { id: "interview", label: "Interview", icon: MessageSquare },
    { id: "requirements", label: "Requirements", icon: ListTodo },
    { id: "research", label: "Research", icon: Search },
    { id: "blueprint", label: "Blueprint", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
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
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Plus size={18} />
              New Project
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Your Projects
            </div>
            <ul className="space-y-1">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => setActiveProjectId(project.id)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                      activeProjectId === project.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="truncate flex-1">{project.title}</span>
                    {(project.status === "CONFIRMED" || isMockConfirmed) && (
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md"
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center text-sm text-gray-500">
              <span>Projects</span>
              <ChevronRight size={16} className="mx-1" />
              <span className="font-medium text-gray-900">
                {projects.find(p => p.id === activeProjectId)?.title || "Select a project"}
              </span>
            </div>
          </div>
          <button
             onClick={() => setIsMockConfirmed(!isMockConfirmed)}
             className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1"
          >
             Toggle Confirm (Debug)
          </button>
        </header>

        {activeProjectId ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="px-4 pt-2 border-b border-gray-200 flex gap-1 overflow-x-auto shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
              {activeTab === "interview" && <InterviewTab projectId={activeProjectId} />}
              {activeTab === "requirements" && <RequirementsTab projectId={activeProjectId} />}
              {activeTab === "research" && <ResearchTab projectId={activeProjectId} />}
              {activeTab === "blueprint" && <BlueprintTab projectId={activeProjectId} requirementsConfirmed={isMockConfirmed} />}
              {activeTab === "settings" && <SettingsTab />}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
            Select a project from the sidebar or create a new one to get started.
          </div>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
