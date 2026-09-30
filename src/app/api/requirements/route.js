import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getProject, updateProject } from "@/lib/firebase/db";
import { executeAiRequest } from "@/lib/ai/routing";

if (!getApps().length) {
  try { initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }); } catch (e) {}
}

const REQUIREMENTS_SYSTEM_PROMPT = `You are an Expert Requirements Analyst.
Your task is to synthesize the provided Project Memory and Initial Idea into a finalized, structured Requirements Specification.

Return ONLY valid JSON matching this exact schema:
{
  "purpose": "Brief description of why the software exists",
  "targetUsers": ["User 1", "User 2"],
  "primaryUserJourney": "High level flow of how users interact",
  "includedFeatures": ["Feature 1", "Feature 2"],
  "explicitExclusions": ["Exclusion 1", "Exclusion 2"],
  "dataAndAccessRequirements": "Notes on data models, privacy, and auth",
  "integrationsAndApis": ["API 1", "API 2"],
  "budgetAndHostingConstraints": "Constraints found in memory",
  "technicalAssumptions": ["Assumption 1", "Assumption 2"],
  "researchLimitations": "Any gaps in knowledge",
  "successCriteria": ["Metric 1", "Metric 2"]
}

If you do not have enough context for a field, use "Not specified" or leave the array empty.
Do NOT wrap the JSON in Markdown ticks (\`\`\`json).`;

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

    if (!project?.memory) {
       return NextResponse.json({ error: "Project Memory is empty. Please synthesize memory first." }, { status: 400 });
    }

    const payload = `Initial Idea: ${project.initialIdea}\n\nProject Memory:\n${JSON.stringify(project.memory, null, 2)}`;

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
      systemInstruction: REQUIREMENTS_SYSTEM_PROMPT,
      temperature: 0.1,
      useSearch: false,
      providers
    });

    let cleanJsonStr = aiResponse.text.trim();
    if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    let requirements;
    try {
        requirements = JSON.parse(cleanJsonStr);
    } catch(e) {
        console.error("Failed to parse Requirements JSON", aiResponse.text);
        throw new Error("AI failed to return valid JSON requirements.");
    }

    // Bump version and revoke any prior confirmation when regenerating
    const nextVersion = (project.requirementsVersion || 0) + 1;

    await updateProject(projectId, userId, {
       requirements,
       requirementsVersion: nextVersion,
       requirementsConfirmed: false,
       requirementsConfirmedAt: null
    });

    return NextResponse.json({ requirements, requirementsVersion: nextVersion });
  } catch (error) {
    console.error("Requirements API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
