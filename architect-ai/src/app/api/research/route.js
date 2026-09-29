import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { isOwner } from "@/lib/firebase/server";
import * as admin from "firebase-admin";

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
    const { query, projectId } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-2.5-pro";

    const systemInstruction = `You are a strict Software Research Agent.
Your goal is to answer the user's software architecture research question using current facts.
You MUST search the web to answer this question.
Focus on APIs, compatibility, hosting limits, pricing, free tiers, and integration requirements.
If the search fails or produces no usable evidence, you MUST reply with exactly: "Research unverified."
Do not invent links, prices, sources, or unsupported claims.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const aiMessage = response.text;

    let searchMetadata = null;
    try {
        if (response.candidates && response.candidates[0].groundingMetadata) {
           searchMetadata = response.candidates[0].groundingMetadata;
        }
    } catch(e) {
        console.error("Error parsing grounding metadata", e);
    }

    return NextResponse.json({
        text: aiMessage,
        groundingMetadata: searchMetadata
    });

  } catch (error) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
