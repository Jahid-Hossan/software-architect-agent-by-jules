"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function InterviewTab({ projectId, stage }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    async function loadHistory() {
      if (!user || !projectId || projectId.startsWith("new-")) {
         setIsLoading(false);
         if (!initialized.current) {
            initialized.current = true;
            // Provide different initial contexts based on the current stage if creating fresh
            const initialGreeting = stage === 'INTERVIEW'
               ? "What would you like to build, and who will use it?"
               : "Based on our discussion, let's explore technology stacks.";

            setMessages([{ role: "model", content: initialGreeting }]);
         }
         return;
      }

      try {
        setIsLoading(true);
        const token = await user.getIdToken();
        const res = await fetch(`/api/messages?projectId=${projectId}`, {
           headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
           const data = await res.json();
           if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
           } else {
              setMessages([{ role: "model", content: "What would you like to build, and who will use it?" }]);
           }
        }
      } catch (e) {
         console.error("Error loading chat history:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [projectId, user, stage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isSending]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsSending(true);

    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try {
        const saved = localStorage.getItem("architect_ai_settings_v3");
        if (saved) aiSettings = JSON.parse(saved);
      } catch (e) {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          messages: newMessages,
          aiSettings,
          stage // Pass current pipeline stage to backend
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || "Failed to send message");
      }

      const data = await res.json();
      setMessages([...newMessages, { role: "model", content: data.text }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages([...newMessages, { role: "system", content: `Error: ${error.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading && messages.length === 0 ? (
           <div className="flex justify-center items-center h-full text-gray-400">
              <Loader2 size={32} className="animate-spin text-blue-500" />
           </div>
        ) : (
           messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-blue-100 text-blue-600" :
                msg.role === "model" ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"
              }`}>
                {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>

              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "system"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-gray-100 text-gray-800"
              }`}>
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="bg-gray-100 rounded-2xl px-5 py-4 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Type your response to the ${stage.toLowerCase()} agent...`}
            disabled={isSending || isLoading}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || isLoading || !input.trim()}
            className="bg-blue-600 text-white rounded-lg px-5 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center"
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
