import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getProjects, createProject } from "@/lib/firebase/db";

async function authenticate(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.split("Bearer ")[1];

  const adminAuth = getAdminAuth();
  if (!adminAuth) throw new Error("Firebase Admin not configured");

  const decodedToken = await adminAuth.verifyIdToken(token);
  if (!(await isOwner(decodedToken.email))) throw new Error("Forbidden");
  return decodedToken.uid;
}

export async function GET(request) {
  try {
    const userId = await authenticate(request);
    const projects = await getProjects(userId);
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
}

export async function POST(request) {
  try {
    const userId = await authenticate(request);
    const body = await request.json();
    const projectId = await createProject(userId, body.title || "New Project", body.initialIdea || "");
    return NextResponse.json({ projectId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
}
