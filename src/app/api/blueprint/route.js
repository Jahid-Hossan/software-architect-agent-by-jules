import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProject, updateProject } from "@/lib/firebase/db";
import { executeAiRequest } from "@/lib/ai/routing";

const BLUEPRINT_SYSTEM_PROMPT = `You are a Master Software Architect.
Your task is to generate a comprehensive, highly detailed software blueprint based on the strictly confirmed Requirements Specification.

You MUST output ONLY valid JSON matching this exact schema:
{
  "architectureAndSystem": {
    "overview": "String",
    "systemBoundaries": ["Boundary 1", "Boundary 2"],
    "moduleResponsibilities": ["Module 1: Does X", "Module 2: Does Y"],
    "directoryStructure": "String representation of folder structure"
  },
  "techStackAndRationale": [
    {
      "category": "String (e.g. Frontend, Database)",
      "technology": "String",
      "reason": "String",
      "alternativesConsidered": "String"
    }
  ],
  "dataEntitiesAndSchemas": [
    {
      "entity": "String (e.g. User)",
      "fields": ["id: UUID", "email: String"],
      "relationships": ["Has many Posts"]
    }
  ],
  "apisAndIntegrations": [
    {
      "method": "GET/POST/PUT/DELETE",
      "path": "String",
      "purpose": "String",
      "contract": "String"
    }
  ],
  "implementationTasks": [
    {
      "id": "String (e.g. TSK-001)",
      "title": "String",
      "phase": "String (e.g. Phase 1: Setup)",
      "dependencies": ["TSK-001", "None"],
      "description": "String",
      "acceptanceCriteria": ["Crit 1", "Crit 2"],
      "filesAffected": ["src/app/page.tsx"]
    }
  ],
  "definitionOfDone": {
    "testing": "String",
    "security": "String",
    "errorHandling": "String",
    "accessibility": "String",
    "productionReadiness": "String",
    "limitations": "String"
  }
}

Do NOT wrap the JSON in Markdown ticks (\`\`\`json). Return the raw JSON object.`;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];

    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error("Firebase Admin not configured");

    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!(await isOwner(decodedToken.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = decodedToken.uid;

    const { projectId, aiSettings } = await request.json();
    const project = await getProject(projectId, userId);

    if (!project?.requirementsConfirmed) {
       return NextResponse.json({ error: "Requirements must be explicitly confirmed before generating a blueprint." }, { status: 400 });
    }

    const payload = `Confirmed Requirements (Version ${project.requirementsVersion}):\n${JSON.stringify(project.requirements, null, 2)}`;

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
      systemInstruction: BLUEPRINT_SYSTEM_PROMPT,
      temperature: 0.1,
      useSearch: false,
      providers
    });

    let cleanJsonStr = aiResponse.text.trim();
    if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    let blueprint;
    try {
        blueprint = JSON.parse(cleanJsonStr);
    } catch(e) {
        console.error("Failed to parse Blueprint JSON", aiResponse.text);
        throw new Error("AI failed to return valid JSON blueprint structure.");
    }

    await updateProject(projectId, userId, {
       blueprint,
       blueprintRequirementsVersion: project.requirementsVersion
    });

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Blueprint API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
