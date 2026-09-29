import "server-only";
import * as admin from "firebase-admin";

// Ensure Firebase Admin is initialized
if (!admin.apps?.length) {
  try {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error in db.js", error);
  }
}

export const dbAdmin = admin.firestore();

export async function createProject(userId, title = "New Project") {
  const projectRef = dbAdmin.collection("projects").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await projectRef.set({
    title,
    ownerId: userId,
    status: "INTERVIEWING",
    createdAt: now,
    updatedAt: now,
    confirmedSnapshotId: null
  });

  return projectRef.id;
}

export async function getProjects(userId) {
  const snapshot = await dbAdmin.collection("projects")
    .where("ownerId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getProject(projectId, userId) {
  const doc = await dbAdmin.collection("projects").doc(projectId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (data.ownerId !== userId) throw new Error("Unauthorized");

  return { id: doc.id, ...data };
}

export async function addMessage(projectId, userId, role, content) {
  await getProject(projectId, userId);

  const messageRef = dbAdmin.collection("projects").doc(projectId).collection("messages").doc();
  await messageRef.set({
    role,
    content,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await dbAdmin.collection("projects").doc(projectId).update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return messageRef.id;
}
