"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Send, Bot, User, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";

export default function InterviewTab({ project }) {
  const { user } = useAuth();
  const projectId = project?.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  const sendSystemTrigger = async (triggerText) => {
     setIsSending(true);
     try {
       const token = await user.getIdToken();
       let aiSettings = null;
       try { const saved = localStorage.getItem("architect_ai_settings_v3"); if (saved) aiSettings = JSON.parse(saved); } catch (e) {}

       const res = await fetch("/api/chat", {
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ projectId, messages: [{ role: 'user', content: triggerText }], aiSettings }),
       });
       if (!res.ok) throw new Error("Failed to initialize interview.");

       const data = await res.json();
       setMessages([{ role: "model", content: data.message, metadata: { options: data.options } }]);
     } catch (e) {
        console.error(e);
     } finally {
        setIsSending(false);
     }
  };

  useEffect(() => {
    async function loadHistory() {
      if (!user || !projectId || projectId === 'new') {
         setIsLoading(false);
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
           } else if (!initialized.current) {
              // Trigger initial AI greeting
              initialized.current = true;
              await sendSystemTrigger("Start the interview based on my initial idea.");
           }
        }
      } catch (e) {
         console.error("Error loading chat history:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isSending]);

  const sendMessage = async (e, forcedContent = null) => {
    e?.preventDefault();
    const messageContent = forcedContent || input;
    if (!messageContent.trim() || isSending) return;

    const newMessages = [...messages, { role: "user", content: messageContent }];
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

      // Strip metadata before sending to AI to save context window
      const cleanMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          messages: cleanMessages,
          aiSettings
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || "Failed to send message");
      }

      const data = await res.json();
      setMessages([...newMessages, { role: "model", content: data.message, metadata: { options: data.options } }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages([...newMessages, { role: "system", content: `Error: ${error.message}. Please check your Provider Settings.` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {isLoading && messages.length === 0 ? (
           <div className="flex justify-center items-center h-full text-gray-400">
              <Loader2 size={32} className="animate-spin text-blue-500" />
           </div>
        ) : (
           messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-blue-100 text-blue-600" :
                msg.role === "model" ? "bg-gray-100 text-gray-700 border border-gray-200" : "bg-red-100 text-red-600"
              }`}>
                {msg.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>

              <div className={clsx(
                 "flex flex-col gap-3 max-w-[85%]",
                 msg.role === "user" ? "items-end" : "items-start"
              )}>
                 <div className={clsx(
                    "px-5 py-3.5 rounded-2xl shadow-sm border",
                    msg.role === "user"
                     ? "bg-blue-600 text-white border-blue-700 rounded-tr-sm"
                     : msg.role === "system"
                       ? "bg-red-50 text-red-600 border-red-100"
                       : "bg-white text-gray-800 border-gray-200 rounded-tl-sm"
                 )}>
                   {msg.role === "user" ? (
                     <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                   ) : (
                     <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                       <ReactMarkdown>{msg.content}</ReactMarkdown>
                     </div>
                   )}
                 </div>

                 {/* Render AI Interactive Options if this is the latest AI message */}
                 {msg.role === "model" && msg.metadata?.options?.length > 0 && idx === messages.length - 1 && !isSending && (
                    <div className="flex flex-col gap-2 mt-2 w-full max-w-2xl">
                       <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-2 mb-1">Select an option or type your own:</p>
                       {msg.metadata.options.map((opt, oIdx) => (
                          <button
                             key={oIdx}
                             onClick={(e) => sendMessage(e, `I choose: ${opt.label}. ${opt.description}`)}
                             className={clsx(
                                "flex items-start text-left p-4 rounded-xl border transition-all hover:shadow-md",
                                opt.isRecommended ? "bg-blue-50 border-blue-200 hover:border-blue-400" : "bg-white border-gray-200 hover:border-gray-400"
                             )}
                          >
                             <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="font-bold text-gray-900">{opt.label}</span>
                                   {opt.isRecommended && <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={12}/> Recommended</span>}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{opt.description}</p>
                                {opt.tradeOff && (
                                   <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 flex items-start gap-1.5">
                                      <span className="font-semibold shrink-0">Trade-off:</span>
                                      <span>{opt.tradeOff}</span>
                                   </div>
                                )}
                             </div>
                             <ChevronRight size={20} className="text-gray-400 self-center ml-4 shrink-0" />
                          </button>
                       ))}
                    </div>
                 )}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <form onSubmit={(e) => sendMessage(e)} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your own answer or provide constraints..."
            disabled={isSending || isLoading}
            className="flex-1 bg-white border border-gray-300 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 shadow-sm"
          />
          <button
            type="submit"
            disabled={isSending || isLoading || !input.trim()}
            className="bg-gray-900 text-white rounded-xl px-6 py-3.5 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:hover:bg-gray-900 flex items-center justify-center shadow-sm"
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
