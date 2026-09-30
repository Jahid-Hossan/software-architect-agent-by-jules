"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Menu, Plus, MessageSquare, ListTodo, Search, FileText, Settings, ChevronRight, X, LayoutDashboard } from "lucide-react";
import clsx from "clsx";
import InterviewTab from "./InterviewTab";
import ResearchTab from "./ResearchTab";
import RequirementsTab from "./RequirementsTab";
import BlueprintTab from "./BlueprintTab";
import SettingsView from "./SettingsView"; // Updated import

export default function Workspace() {
  const { user, logOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);

  // App-level view routing
  const [appView, setAppView] = useState("project"); // "project" | "settings"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeTab, setActiveTab] = useState("interview");

  const [isMockConfirmed, setIsMockConfirmed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProjects([
        { id: "new-1", title: "New Project", status: "INTERVIEWING" },
      ]);
      setActiveProjectId("new-1");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    setAppView("project");
  };

  const projectTabs = [
    { id: "interview", label: "Interview", icon: MessageSquare },
    { id: "requirements", label: "Requirements", icon: ListTodo },
    { id: "research", label: "Research", icon: Search },
    { id: "blueprint", label: "Blueprint", icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
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
            onClick={() => {
              // Implementation for new project would go here
              setAppView("project");
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Your Projects
            </div>
            <ul className="space-y-1">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => handleSelectProject(project.id)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                      (appView === "project" && activeProjectId === project.id)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <LayoutDashboard size={16} />
                    <span className="truncate flex-1">{project.title}</span>
                    {(project.status === "CONFIRMED" || isMockConfirmed) && (
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
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

      {/* Main Content */}
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
                  <span>Projects</span>
                  <ChevronRight size={16} className="mx-1" />
                  <span className="font-medium text-gray-900">
                    {projects.find(p => p.id === activeProjectId)?.title || "Select a project"}
                  </span>
                </>
              )}
            </div>
          </div>

          {appView === "project" && (
            <button
              onClick={() => setIsMockConfirmed(!isMockConfirmed)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1"
            >
              Toggle Confirm (Debug)
            </button>
          )}
        </header>

        {appView === "settings" ? (
          <div className="flex-1 overflow-hidden p-4 md:p-6 max-w-5xl mx-auto w-full">
            <SettingsView />
          </div>
        ) : activeProjectId ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Project Tabs */}
            <div className="px-4 pt-2 border-b border-gray-200 bg-white flex gap-1 overflow-x-auto shrink-0 shadow-sm z-10">
              {projectTabs.map((tab) => {
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeTab === "interview" && <InterviewTab projectId={activeProjectId} />}
              {activeTab === "requirements" && <RequirementsTab projectId={activeProjectId} />}
              {activeTab === "research" && <ResearchTab projectId={activeProjectId} />}
              {activeTab === "blueprint" && <BlueprintTab projectId={activeProjectId} requirementsConfirmed={isMockConfirmed} />}
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
