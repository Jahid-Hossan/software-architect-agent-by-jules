import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { executeAiRequest } from "@/lib/ai/routing";
import { addMessage, getProject } from "@/lib/firebase/db";

const INTERVIEW_SYSTEM_PROMPT = `You are a strict, focused Software Architect conducting a dynamic interview to define project requirements.

Your goal is to understand the user's idea and guide them through critical architectural decisions (e.g., frontend frameworks, database types, auth providers, hosting, specific features).

RULES:
1. Ask exactly ONE focused question at a time. Do not overwhelm the user.
2. Adapt to previous answers.
3. You must output your response in valid JSON format matching the schema below.
4. Provide 2-3 logical options for the user to choose from when appropriate, along with a trade-off or recommendation note.

JSON OUTPUT SCHEMA:
{
  "message": "The main conversational text or question.",
  "options": [
    {
      "label": "Option Title (e.g., React)",
      "description": "Brief description of the option.",
      "tradeOff": "Why choose this? (e.g., Fast ecosystem, but steep learning curve)",
      "isRecommended": boolean
    }
  ]
}

If no options are needed for the current message, you can leave the "options" array empty. Do NOT include markdown blocks (\`\`\`json) in your response, just the raw JSON string.`;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let email, userId;
    try {
      const adminAuth = getAdminAuth();
      if (!adminAuth) throw new Error("Firebase Admin not configured");

      const decodedToken = await adminAuth.verifyIdToken(token);
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
    const { messages, projectId, aiSettings } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'user' && projectId && projectId !== 'new') {
       try {
           await addMessage(projectId, userId, 'user', latestMessage.content);
       } catch (dbErr) {
           console.error("[Chat API] Warning: Could not persist user message.", dbErr);
       }
    }

    let systemInstruction = INTERVIEW_SYSTEM_PROMPT;
    if (projectId && projectId !== 'new') {
       try {
          const projectState = await getProject(projectId, userId);
          if (projectState?.initialIdea) {
             systemInstruction += `\n\nPROJECT CONTEXT: The user initially stated: "${projectState.initialIdea}"`;
          }
       } catch(e) {}
    }

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
      temperature: 0.2,
      useSearch: false,
      providers
    });

    let cleanJsonStr = aiResponse.text.trim();
    if (cleanJsonStr.startsWith("```json")) {
        cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJsonStr.startsWith("```")) {
        cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsedResponse;
    try {
        parsedResponse = JSON.parse(cleanJsonStr);
    } catch(e) {
        console.error("Failed to parse AI JSON response. Raw output:", aiResponse.text);
        parsedResponse = { message: aiResponse.text, options: [] };
    }

    if (projectId && projectId !== 'new') {
       try {
           await addMessage(projectId, userId, 'model', parsedResponse.message, { options: parsedResponse.options });
       } catch (dbErr) {
           console.error("[Chat API] Warning: Could not persist assistant message.", dbErr);
       }
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
