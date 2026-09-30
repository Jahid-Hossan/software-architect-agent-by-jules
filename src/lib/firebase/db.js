import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  try {
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  } catch (error) {
    console.error("Firebase Admin initialization error in db.js", error);
  }
}

export const dbAdmin = getFirestore();

export const PIPELINE_STAGES = {
  INTERVIEW: 'INTERVIEW',
  TECHNOLOGY: 'TECHNOLOGY',
  REVIEW: 'REVIEW',
  BLUEPRINT: 'BLUEPRINT',
  CODING_PROMPT: 'CODING_PROMPT',
};

export async function createProject(userId, title = "New Project") {
  const projectRef = dbAdmin.collection("projects").doc();
  const now = FieldValue.serverTimestamp();

  await projectRef.set({
    title,
    ownerId: userId,
    status: PIPELINE_STAGES.INTERVIEW,
    createdAt: now,
    updatedAt: now,
    metadata: {}
  });

  return projectRef.id;
}

export async function getProjects(userId) {
  const snapshot = await dbAdmin.collection("projects")
    .where("ownerId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map(doc => {
     const data = doc.data();
     return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString()
     };
  });
}

export async function getProject(projectId, userId) {
  const doc = await dbAdmin.collection("projects").doc(projectId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (data.ownerId !== userId) throw new Error("Unauthorized");

  return {
     id: doc.id,
     ...data,
     createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
     updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString()
  };
}

export async function updateProject(projectId, userId, updates) {
  await getProject(projectId, userId); // check auth

  const updateData = { ...updates, updatedAt: FieldValue.serverTimestamp() };
  await dbAdmin.collection("projects").doc(projectId).update(updateData);
  return { success: true };
}

export async function deleteProject(projectId, userId) {
  await getProject(projectId, userId); // check auth

  // Note: in a real production app you'd batch delete the subcollection (messages) first
  // but for this MVP, deleting the doc hides it.
  await dbAdmin.collection("projects").doc(projectId).delete();
  return { success: true };
}

export async function addMessage(projectId, userId, role, content) {
  try {
    await getProject(projectId, userId);

    console.log(`[Chat DB] Saving ${role} message for project: ${projectId}`);
    const messageRef = dbAdmin.collection("projects").doc(projectId).collection("messages").doc();
    await messageRef.set({
      role,
      content,
      timestamp: FieldValue.serverTimestamp()
    });

    await dbAdmin.collection("projects").doc(projectId).update({
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`[Chat DB] ${role} message saved successfully.`);
    return messageRef.id;
  } catch (error) {
    console.error('[Chat DB Error] Failed to persist message:', error);
    throw error;
  }
}

export async function getMessages(projectId, userId) {
  try {
    await getProject(projectId, userId);

    const snapshot = await dbAdmin.collection("projects")
      .doc(projectId)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Chat DB Error] Failed to fetch messages:', error);
    throw error;
  }
}
