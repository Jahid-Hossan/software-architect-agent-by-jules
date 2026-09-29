"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Search, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ResearchTab({ projectId }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const performResearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    setQuery("");
    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          query: currentQuery,
        }),
      });

      if (!res.ok) throw new Error("Failed to perform research");

      const data = await res.json();
      setResults(prev => [{
        query: currentQuery,
        text: data.text,
        metadata: data.groundingMetadata,
        timestamp: new Date().toISOString()
      }, ...prev]);
    } catch (error) {
      console.error("Research error", error);
      setResults(prev => [{
        query: currentQuery,
        text: "Error: Failed to perform research. Please try again.",
        isError: true,
        timestamp: new Date().toISOString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 mb-2">Research Feasibility</h3>
        <p className="text-sm text-gray-500 mb-4">
          Query current information about APIs, compatibility, pricing, and free tiers using Google Search Grounding.
        </p>
        <form onSubmit={performResearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Does Firebase free tier support Cloud Functions?"
            disabled={isLoading}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 text-white rounded-lg px-6 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {results.length === 0 && !isLoading && (
          <div className="text-center text-gray-400 mt-10">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>No research queries yet.</p>
          </div>
        )}

        {results.map((result, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="font-medium text-gray-800 mb-3 pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">Q</span>
              {result.query}
            </div>

            <div className={`prose prose-sm max-w-none ${result.isError ? "text-red-600" : "text-gray-700"}`}>
              {result.text === "Research unverified." ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <AlertTriangle size={18} />
                  <span>Research unverified. No usable evidence found.</span>
                </div>
              ) : (
                <ReactMarkdown>{result.text}</ReactMarkdown>
              )}
            </div>

            {/* Render Grounding Citations */}
            {result.metadata?.groundingChunks?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sources</h4>
                <ul className="space-y-1">
                  {result.metadata.groundingChunks.map((chunk, cIdx) => (
                    chunk.web?.uri && (
                      <li key={cIdx}>
                        <a
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={10} />
                          {chunk.web.title || chunk.web.uri}
                        </a>
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
