import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function GET(request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error("Firebase Admin not configured");

    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email;

    const ownerStatus = await isOwner(email);

    return NextResponse.json({ isOwner: ownerStatus });
  } catch (error) {
    console.error("Token verification failed", error);
    return NextResponse.json({ error: "Invalid token or config" }, { status: 401 });
  }
}
