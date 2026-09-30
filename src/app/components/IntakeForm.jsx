"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Play, Loader2 } from "lucide-react";

export default function IntakeForm({ onProjectCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [initialIdea, setInitialIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          initialIdea
        }),
      });

      if (!res.ok) {
         throw new Error("Failed to create project");
      }

      const data = await res.json();
      onProjectCreated(data.projectId);
    } catch (error) {
      console.error("Project creation error", error);
      alert("Failed to start project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start a New Project</h2>
        <p className="text-gray-500 mb-8">
          Share your initial software idea. The Architect AI will guide you through a dynamic interview to define requirements and tech stacks.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., E-commerce Admin Dashboard"
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Idea / Problem Statement <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={initialIdea}
              onChange={(e) => setInitialIdea(e.target.value)}
              placeholder="What are you trying to build? Who is it for? Don't worry if it's incomplete."
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            Begin Dynamic Interview
          </button>
        </form>
      </div>
    </div>
  );
}
