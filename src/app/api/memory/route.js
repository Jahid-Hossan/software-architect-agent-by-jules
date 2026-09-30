import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getProject, updateProject, getMessages } from "@/lib/firebase/db";
import { executeAiRequest } from "@/lib/ai/routing";

if (!getApps().length) {
  try { initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }); } catch (e) {}
}

const MEMORY_SYSTEM_PROMPT = `You are a Project Memory Extraction Agent.
Your task is to analyze the entire conversation history between the User and the Architect AI and extract specific structured information into JSON format.

You MUST group the extracted information into exactly these arrays:
1. "userDecisions": Explicit choices made by the user (e.g. "I want to use React").
2. "recommendations": Suggestions made by the Architect that haven't been finalized.
3. "assumptions": Implicit constraints or facts deduced by the Architect.
4. "exclusions": Features or tools explicitly declared out of scope.
5. "unresolvedQuestions": Blocking questions the Architect still needs answers to.
6. "scopeConflicts": Contradictions in the user's requirements (e.g. "Wants zero cloud dependencies, but asked for push notifications").

RULES:
- Return ONLY valid JSON matching the schema below.
- Do NOT wrap the JSON in Markdown ticks (\`\`\`json).
- Be concise.
- If a category has no items, return an empty array [].

SCHEMA:
{
  "userDecisions": ["decision 1", "decision 2"],
  "recommendations": [],
  "assumptions": [],
  "exclusions": [],
  "unresolvedQuestions": [],
  "scopeConflicts": []
}`;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    if (!(await isOwner(decodedToken.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = decodedToken.uid;

    const { projectId, aiSettings } = await request.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const messages = await getMessages(projectId, userId);
    if (!messages || messages.length === 0) {
       return NextResponse.json({ memory: null, message: "No conversation history found to analyze." });
    }

    const aiPayload = messages.map(m => ({ role: m.role, content: m.content }));

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
      messages: aiPayload,
      systemInstruction: MEMORY_SYSTEM_PROMPT,
      temperature: 0.1,
      useSearch: false,
      providers
    });

    let cleanJsonStr = aiResponse.text.trim();
    if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    let memory;
    try {
        memory = JSON.parse(cleanJsonStr);
    } catch(e) {
        console.error("Failed to parse Memory JSON", aiResponse.text);
        throw new Error("AI failed to return valid JSON memory.");
    }

    // Persist to project document
    await updateProject(projectId, userId, { memory });

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("Memory API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
