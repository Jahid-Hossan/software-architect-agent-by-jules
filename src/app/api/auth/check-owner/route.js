import { NextResponse } from "next/server";
import { isOwner } from "@/lib/firebase/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps?.length) {
  try {
    admin.initializeApp({
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    const ownerStatus = await isOwner(email);

    return NextResponse.json({ isOwner: ownerStatus });
  } catch (error) {
    console.error("Token verification failed", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
