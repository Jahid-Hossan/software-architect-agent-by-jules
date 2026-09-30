import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getMessages } from "@/lib/firebase/db";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let email;
    let userId;
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const messages = await getMessages(projectId, userId);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error("Messages API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
