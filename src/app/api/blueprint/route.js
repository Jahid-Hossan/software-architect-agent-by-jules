import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { executeAiRequest } from "@/lib/ai/routing";

if (!getApps().length) {
  try {
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
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
    const { projectId, requirementsHash, aiSettings } = body;

    const systemInstruction = `You are an Expert Software Architect.
Your task is to generate a comprehensive, highly detailed software blueprint based on confirmed requirements.

You MUST follow this exact 17-point structure:
1. Project overview, goals, scope, and exclusions.
2. User journeys and success criteria.
3. Pages, navigation, components, and UI states.
4. Technology choices with reasons.
5. System architecture and module responsibilities.
6. Data model, relationships, validation, and persistence.
7. API endpoints and integration contracts where relevant.
8. Authentication, authorization, security, and privacy.
9. Error handling, recovery, accessibility, and performance.
10. SEO and analytics where relevant.
11. Folder structure and environment configuration.
12. Implementation phases and ordered tasks. (Give tasks unique IDs and valid dependencies).
13. Tests and measurable acceptance criteria.
14. Deployment, monitoring, backup, and maintenance guidance.
15. Risks, research limitations, and cost assumptions.
16. Definition of done.
17. A complete coding-agent implementation prompt. (Must be understandable without original conversation, include full scope, architecture, contracts, tasks, etc.).

If a section is not applicable, use "not applicable" with a reason.
Format the output in clean Markdown.`;

    const providers = [];
    if (aiSettings?.routing) {
      const { routing, providers: providerConfigs } = aiSettings;

      const mapRouteToProvider = (routeConfig) => {
        if (!routeConfig || routeConfig.provider === 'none') return null;

        const type = routeConfig.provider;
        const conf = providerConfigs?.[type] || {};

        return {
          type,
          model: routeConfig.model,
          apiKey: conf.apiKey,
          baseUrl: conf.baseUrl
        };
      };

      const primary = mapRouteToProvider(routing.primary);
      if (primary) providers.push(primary);

      const fallback = mapRouteToProvider(routing.fallback);
      if (fallback) providers.push(fallback);
    }

    const aiResponse = await executeAiRequest({
      messages: [{ role: 'user', content: "Generate the blueprint for the confirmed requirements (Mock requirements provided in context)." }],
      systemInstruction,
      temperature: 0.2,
      useSearch: false,
      providers
    });

    return NextResponse.json({ blueprint: aiResponse.text });

  } catch (error) {
    console.error("Blueprint API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
