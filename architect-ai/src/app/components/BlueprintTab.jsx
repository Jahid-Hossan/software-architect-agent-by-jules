"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { FileText, Loader2, Download, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function BlueprintTab({ projectId, requirementsConfirmed }) {
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateBlueprint = async () => {
    if (!requirementsConfirmed) return;

    setIsGenerating(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          requirementsHash: "abc123def456", // Mock hash
        }),
      });

      if (!res.ok) throw new Error("Failed to generate blueprint");

      const data = await res.json();
      setBlueprint({
        content: data.blueprint,
        timestamp: new Date().toISOString(),
        revision: 1
      });
    } catch (error) {
      console.error("Blueprint generation error", error);
      setError("Failed to generate blueprint. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (type) => {
    if (!blueprint) return;

    let content, mime, ext;

    if (type === 'md') {
      content = blueprint.content;
      mime = "text/markdown";
      ext = "md";
    } else if (type === 'prompt') {
      // Very basic extraction of section 17, fallback to entire doc if not found cleanly
      const parts = blueprint.content.split(/17\.\s*A complete coding-agent implementation prompt/i);
      content = parts.length > 1 ? "17. A complete coding-agent implementation prompt" + parts[1] : blueprint.content;
      mime = "text/plain";
      ext = "txt";
    } else if (type === 'json') {
      content = JSON.stringify({
        projectId,
        revision: blueprint.revision,
        generatedAt: blueprint.timestamp,
        blueprint: blueprint.content
      }, null, 2);
      mime = "application/json";
      ext = "json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `architect-blueprint-${type}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!requirementsConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Requirements Not Confirmed</h3>
        <p className="text-gray-500 max-w-md">
          You must finalize and explicitly confirm the project requirements in the Requirements tab before generating a blueprint.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Implementation Blueprint
          </h3>
          {blueprint && (
            <p className="text-xs text-gray-500 mt-1">Generated based on confirmed revision {blueprint.revision}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {blueprint && (
            <>
              <button onClick={() => handleDownload('md')} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors flex">
                <Download size={14} /> MD
              </button>
              <button onClick={() => handleDownload('json')} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors flex">
                <Download size={14} /> JSON
              </button>
              <button onClick={() => handleDownload('prompt')} className="flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors flex">
                 <Download size={14} /> Prompt
              </button>
            </>
          )}
          <button
            onClick={generateBlueprint}
            disabled={isGenerating}
            className="w-full md:w-auto justify-center flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : (blueprint ? <RefreshCw size={16} /> : <CheckCircle size={16} />)}
            {blueprint ? "Regenerate" : "Generate Blueprint"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
            {error}
          </div>
        )}

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p>Architecting the solution and generating the 17-point blueprint...</p>
          </div>
        ) : blueprint ? (
          <div className="prose prose-sm md:prose-base max-w-none prose-blue">
            <ReactMarkdown>{blueprint.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Ready to generate the implementation blueprint.</p>
          </div>
        )}
      </div>
    </div>
  );
}
