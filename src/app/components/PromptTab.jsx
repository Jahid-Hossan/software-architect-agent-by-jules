"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Loader2, RefreshCw, FileCode, Download, Copy, CheckCircle2, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function PromptTab({ project, onPromptUpdated }) {
  const { user } = useAuth();
  const [promptContent, setPromptContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
     const timer = setTimeout(() => {
        if (project?.codingPrompt) {
           setPromptContent(project.codingPrompt);
        }
     }, 0);
     return () => clearTimeout(timer);
  }, [project]);

  const generatePrompt = async () => {
    if (!project?.requirementsConfirmed || !project?.blueprint) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try { const saved = localStorage.getItem("architect_ai_settings_v3"); if (saved) aiSettings = JSON.parse(saved); } catch (e) {}

      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: project.id, aiSettings }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || "Failed to generate coding prompt");
      }

      const data = await res.json();
      setPromptContent(data.codingPrompt);
      if (onPromptUpdated) onPromptUpdated();
    } catch (error) {
      console.error(error);
      setError(`Failed to generate prompt: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
     if (!promptContent) return;
     try {
        await navigator.clipboard.writeText(promptContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
     } catch (err) {
        console.error("Failed to copy text: ", err);
        const textArea = document.createElement("textarea");
        textArea.value = promptContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (copyErr) {
            console.error('Fallback: Oops, unable to copy', copyErr);
            alert("Copy failed. Please select the text manually.");
        }
        document.body.removeChild(textArea);
     }
  };

  const handleDownload = () => {
    if (!promptContent) return;
    const blob = new Blob([promptContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coding-agent-prompt-v${project?.codingPromptRequirementsVersion || 0}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!project?.requirementsConfirmed || !project?.blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert size={48} className="text-amber-300" />
        <h3 className="text-xl font-bold text-gray-800">Prerequisites Not Met</h3>
        <p className="text-sm">You must confirm the requirements and generate the blueprint before synthesizing the final coding prompt.</p>
      </div>
    );
  }

  const isStale = promptContent && project?.codingPromptRequirementsVersion !== project?.requirementsVersion;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileCode size={18} className="text-blue-600" />
            Coding Agent Prompt
          </h3>
          {promptContent && (
            <p className="text-xs text-gray-500 mt-1">Generated from Requirements v{project?.codingPromptRequirementsVersion}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {promptContent && (
            <>
              <button onClick={handleCopy} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex shadow-sm">
                 {isCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />} {isCopied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleDownload} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex shadow-sm">
                 <Download size={14} /> MD
              </button>
            </>
          )}
          <button
            onClick={generatePrompt}
            disabled={isGenerating}
            className="w-full md:w-auto justify-center flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {promptContent ? "Regenerate" : "Generate Prompt"}
          </button>
        </div>
      </div>

      {error && <div className="m-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {isStale && !isGenerating && (
         <div className="mx-4 mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm flex items-center gap-2">
            <ShieldAlert size={16} />
            <strong>Stale Prompt:</strong> Requirements have been updated to v{project?.requirementsVersion} since this prompt was generated. Please regenerate.
         </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
         {!promptContent && !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full">
               <FileCode size={48} className="mb-4 opacity-20" />
               <p>Ready to synthesize all architectural artifacts into a single executable prompt.</p>
            </div>
         ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full space-y-4">
               <Loader2 size={40} className="animate-spin text-blue-500" />
               <p>Compiling comprehensive system prompt...</p>
            </div>
         ) : (
            <div className="max-w-4xl mx-auto bg-gray-900 text-gray-100 p-6 rounded-xl border border-gray-800 shadow-md">
               <div className="prose prose-sm md:prose-base max-w-none prose-invert prose-pre:bg-black/50 prose-a:text-blue-400">
                  <ReactMarkdown>{promptContent}</ReactMarkdown>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
