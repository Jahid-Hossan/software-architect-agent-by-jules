import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  try {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export async function GET(request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const email = decodedToken.email;

    const ownerStatus = await isOwner(email);

    return NextResponse.json({ isOwner: ownerStatus });
  } catch (error) {
    console.error("Token verification failed", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
