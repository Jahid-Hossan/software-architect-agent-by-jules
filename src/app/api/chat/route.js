import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { executeAiRequest } from "@/lib/ai/routing";

if (!getApps().length) {
  try {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let email;
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      email = decodedToken.email;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const ownerStatus = await isOwner(email);
    if (!ownerStatus) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { messages, projectId, aiSettings } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const systemInstruction = `You are an Architect AI — Software Research & Planning Agent.
Your purpose is to help a user turn a rough software idea into researched requirements, an explicitly confirmed scope, a detailed implementation blueprint, and a self-contained prompt for a coding agent.

CORE RULES:
- Understand the user's goal before recommending an architecture.
- Respond in the user's language (including Bangla and English).
- Ask exactly ONE important question at a time, or at most TWO closely related questions.
- Adapt follow-up questions to previous answers.
- Offer 2 or 3 meaningful options when helpful.
- Avoid repeating answered questions.
- Explain technical concepts simply.
- Decide routine technical defaults yourself instead of asking the user to choose every library.
- Keep essential features separate from future improvements.
- If this is the start of a new project, your first question MUST BE exactly: "What would you like to build, and who will use it?"
- Do NOT generate a final blueprint here. Your goal is just to gather requirements and build context.`;

    const providers = [];
    if (aiSettings) {
      const mapProvider = (type) => {
        if (type === 'gemini') return { type: 'gemini' };
        if (type === 'omniroute') return { type: 'omniroute', apiKey: aiSettings.omnirouteApiKey, model: aiSettings.omnirouteModel };
        if (type === 'self-hosted') return { type: 'self-hosted', baseUrl: aiSettings.selfHostedUrl, apiKey: aiSettings.selfHostedApiKey, model: aiSettings.selfHostedModel };
        return null;
      };

      const primary = mapProvider(aiSettings.primaryProvider);
      if (primary) providers.push(primary);

      if (aiSettings.fallbackProvider && aiSettings.fallbackProvider !== 'none') {
         const fallback = mapProvider(aiSettings.fallbackProvider);
         if (fallback) providers.push(fallback);
      }
    }

    const aiResponse = await executeAiRequest({
      messages,
      systemInstruction,
      temperature: 0.7,
      useSearch: false,
      providers
    });

    return NextResponse.json({ text: aiResponse.text });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
