import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import * as admin from "firebase-admin";
import { executeAiRequest } from "@/lib/ai/routing";

if (!admin.apps?.length) {
  try {
    admin.initializeApp({
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
      const decodedToken = await admin.auth().verifyIdToken(token);
      email = decodedToken.email;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const ownerStatus = await isOwner(email);
    if (!ownerStatus) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { query, projectId, aiSettings } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const systemInstruction = `You are a strict Software Research Agent.
Your goal is to answer the user's software architecture research question using current facts.
You MUST search the web to answer this question.
Focus on APIs, compatibility, hosting limits, pricing, free tiers, and integration requirements.
If the search fails or produces no usable evidence, you MUST reply with exactly: "Research unverified."
Do not invent links, prices, sources, or unsupported claims.`;

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
      messages: [{ role: 'user', content: query }],
      systemInstruction,
      temperature: 0.2,
      useSearch: true, // Specifically request search grounding where supported
      providers
    });

    return NextResponse.json({
        text: aiResponse.text,
        groundingMetadata: aiResponse.metadata
    });

  } catch (error) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
