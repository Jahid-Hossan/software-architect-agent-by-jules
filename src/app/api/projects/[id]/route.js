import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getProject, updateProject, deleteProject } from "@/lib/firebase/db";
import { FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  try { initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }); } catch (e) {}
}

async function authenticate(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.split("Bearer ")[1];
  const decodedToken = await getAuth().verifyIdToken(token);
  if (!(await isOwner(decodedToken.email))) throw new Error("Forbidden");
  return decodedToken.uid;
}

export async function GET(request, { params }) {
  try {
    const userId = await authenticate(request);
    const { id } = params;
    const project = await getProject(id, userId);
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const userId = await authenticate(request);
    const { id } = params;
    const updates = await request.json();

    // Convert string dates to Firestore Timestamps if necessary (like requirementsConfirmedAt)
    if (updates.requirementsConfirmedAt === 'NOW') {
       updates.requirementsConfirmedAt = FieldValue.serverTimestamp();
    } else if (updates.requirementsConfirmedAt === null) {
       updates.requirementsConfirmedAt = null;
    }

    await updateProject(id, userId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await authenticate(request);
    const { id } = params;

    await deleteProject(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
}
