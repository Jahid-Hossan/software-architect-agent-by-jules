import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { executeAiRequest } from "@/lib/ai/routing";
import { addMessage } from "@/lib/firebase/db";

if (!getApps().length) {
  try {
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

const STAGE_PROMPTS = {
  INTERVIEW: `You are an Architect AI — Software Research & Planning Agent in the INTERVIEW stage.
Your goal: Gather project requirements, scope, target audience, and constraints.
RULES:
- Respond in the user's language.
- Ask exactly ONE important question at a time.
- Adapt follow-up questions to previous answers.
- Explain technical concepts simply.
- If this is the start of a new project, your first question MUST BE exactly: "What would you like to build, and who will use it?"
- Do NOT generate a final blueprint or recommend specific tech stacks yet. Just gather business requirements.`,

  TECHNOLOGY: `You are an Architect AI in the TECHNOLOGY STACK stage.
Your goal: Review the gathered requirements and recommend the optimal technology stack (Frontend, Backend, Database, Hosting).
RULES:
- Propose 1-2 distinct stack options with clear trade-offs based on the user's requirements.
- Focus on pragmatism, scalability, and modern standards.
- Ask the user which stack they prefer or if they want to make any custom adjustments.`,

  REVIEW: `You are an Architect AI in the REVIEW stage.
Your goal: Summarize the final scope and the selected technology stack for final approval.`,

  BLUEPRINT: `You are an Architect AI in the BLUEPRINT generation stage.
Your goal: Draft a highly detailed software architecture blueprint.`,

  CODING_PROMPT: `You are an Architect AI. Your goal: Generate a final Coding Agent Prompt.`
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let email;
    let userId;
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      email = decodedToken.email;
      userId = decodedToken.uid;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const ownerStatus = await isOwner(email);
    if (!ownerStatus) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { messages, projectId, aiSettings, stage } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const activeStage = stage || 'INTERVIEW';

    // Persist User Message
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'user' && projectId && projectId.startsWith("new-") === false) {
       try {
           await addMessage(projectId, userId, 'user', latestMessage.content);
       } catch (dbErr) {
           console.error("[Chat API] Warning: Could not persist user message.", dbErr);
       }
    }

    const systemInstruction = STAGE_PROMPTS[activeStage] || STAGE_PROMPTS.INTERVIEW;

    const providers = [];
    if (aiSettings?.routing && Array.isArray(aiSettings?.providers)) {
      const { routing, providers: providerList } = aiSettings;
      const mapRouteToProvider = (routeConfig) => {
        if (!routeConfig || routeConfig.providerId === 'none') return null;
        const provDef = providerList.find(p => p.id === routeConfig.providerId);
        if (!provDef) return null;
        return { type: provDef.type, model: routeConfig.modelSlug, apiKey: provDef.apiKey, baseUrl: provDef.baseUrl };
      };

      const primary = mapRouteToProvider(routing.primary);
      if (primary) providers.push(primary);
      const fallback = mapRouteToProvider(routing.fallback);
      if (fallback) providers.push(fallback);
    }

    const aiResponse = await executeAiRequest({
      messages,
      systemInstruction,
      temperature: 0.7,
      useSearch: false,
      providers
    });

    // Persist Assistant Message
    if (aiResponse && aiResponse.text && projectId && projectId.startsWith("new-") === false) {
       try {
           await addMessage(projectId, userId, 'model', aiResponse.text);
       } catch (dbErr) {
           console.error("[Chat API] Warning: Could not persist assistant message.", dbErr);
       }
    }

    return NextResponse.json({ text: aiResponse.text });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
