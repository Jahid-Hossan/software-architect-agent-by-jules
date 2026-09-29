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
    const { messages, projectId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-2.5-pro";

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

    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: model,
      contents: geminiMessages,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const aiMessage = response.text;

    return NextResponse.json({ text: aiMessage });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
