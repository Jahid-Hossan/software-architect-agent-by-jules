"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function InterviewTab({ projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (messages.length === 0 && !isLoading && !initialized.current) {
      initialized.current = true;
      setTimeout(() => {
        setMessages([
          {
            role: "model",
            content: "What would you like to build, and who will use it?",
          },
        ]);
      }, 0);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      let aiSettings = null;
      try {
        const saved = localStorage.getItem("architect_ai_settings_v3"); // Updated to v3
        if (saved) aiSettings = JSON.parse(saved);
      } catch (e) {
         console.error("Failed to parse local ai settings v3", e);
      }

      console.log("Client Dispatching Chat with Settings:", aiSettings?.routing?.primary);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          messages: newMessages,
          aiSettings
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
      setMessages([
        ...newMessages,
        { role: "system", content: `Error: ${error.message}. Please check your Provider Settings.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
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
        ))}
        {isLoading && (
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

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer or ask a question..."
            disabled={isLoading}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white rounded-lg px-5 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
