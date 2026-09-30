import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getProject, updateProject } from "@/lib/firebase/db";
import { executeAiRequest } from "@/lib/ai/routing";

if (!getApps().length) {
  try { initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }); } catch (e) {}
}

const PROMPT_SYSTEM_PROMPT = `You are a Master Software Architect.
Your task is to synthesize the confirmed Requirements and technical Blueprint into ONE highly detailed, execution-ready Coding Agent Prompt.
This prompt will be copy-pasted directly into an autonomous coding agent (like Cursor, Claude Code, or Codex).

Include:
1. Exact tech stack instructions.
2. Architecture rules and project structure.
3. API contracts.
4. Exact ordered tasks (Phase 1, Phase 2) with the specific files they need to create/modify.
5. Strict constraints (no mock data if DB requested, styling rules, etc).

Return ONLY the raw prompt string. Do not wrap it in JSON. Do not include introductory text like "Here is the prompt".`;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    if (!(await isOwner(decodedToken.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = decodedToken.uid;

    const { projectId, aiSettings } = await request.json();
    const project = await getProject(projectId, userId);

    if (!project?.requirementsConfirmed) {
       return NextResponse.json({ error: "Requirements must be explicitly confirmed before generating a coding prompt." }, { status: 400 });
    }

    if (!project?.blueprint) {
       return NextResponse.json({ error: "Blueprint must be generated before creating the coding prompt." }, { status: 400 });
    }

    const payload = `REQUIREMENTS (v${project.requirementsVersion}):\n${JSON.stringify(project.requirements)}\n\nBLUEPRINT:\n${JSON.stringify(project.blueprint)}`;

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
      messages: [{ role: 'user', content: payload }],
      systemInstruction: PROMPT_SYSTEM_PROMPT,
      temperature: 0.1,
      useSearch: false,
      providers
    });

    const codingPrompt = aiResponse.text.trim();

    await updateProject(projectId, userId, {
       codingPrompt,
       codingPromptRequirementsVersion: project.requirementsVersion
    });

    return NextResponse.json({ codingPrompt });
  } catch (error) {
    console.error("Prompt API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
