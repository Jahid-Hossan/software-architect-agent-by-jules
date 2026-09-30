import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./admin";

export const PIPELINE_STAGES = {
  IDEA: 'IDEA',
  INTERVIEW: 'INTERVIEW',
  MEMORY: 'MEMORY',
  REVIEW: 'REVIEW',
  BLUEPRINT: 'BLUEPRINT',
  PROMPT: 'PROMPT',
};

export async function createProject(userId, title = "New Project", initialIdea = "") {
  const adminDb = getAdminDb();
  const projectRef = adminDb.collection("projects").doc();
  const now = FieldValue.serverTimestamp();

  await projectRef.set({
    title,
    ownerId: userId,
    status: PIPELINE_STAGES.IDEA,
    initialIdea,
    createdAt: now,
    updatedAt: now,

    memory: {
       userDecisions: [],
       recommendations: [],
       assumptions: [],
       exclusions: [],
       researchFindings: [],
       unresolvedQuestions: [],
       scopeConflicts: []
    },
    requirements: null,
    requirementsVersion: 0,
    requirementsConfirmed: false,
    requirementsConfirmedAt: null,

    blueprint: null,
    blueprintRequirementsVersion: null,

    codingPrompt: null,
    codingPromptRequirementsVersion: null
  });

  return projectRef.id;
}

export async function getProjects(userId) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("projects")
    .where("ownerId", "==", userId)
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map(doc => {
     const data = doc.data();
     return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        requirementsConfirmedAt: data.requirementsConfirmedAt?.toDate().toISOString() || null
     };
  });
}

export async function getProject(projectId, userId) {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection("projects").doc(projectId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (data.ownerId !== userId) throw new Error("Unauthorized");

  return {
     id: doc.id,
     ...data,
     createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
     updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
     requirementsConfirmedAt: data.requirementsConfirmedAt?.toDate().toISOString() || null
  };
}

export async function updateProject(projectId, userId, updates) {
  await getProject(projectId, userId);
  const adminDb = getAdminDb();
  const updateData = { ...updates, updatedAt: FieldValue.serverTimestamp() };
  await adminDb.collection("projects").doc(projectId).update(updateData);
  return { success: true };
}

export async function deleteProject(projectId, userId) {
  await getProject(projectId, userId);
  const adminDb = getAdminDb();
  await adminDb.collection("projects").doc(projectId).delete();
  return { success: true };
}

export async function addMessage(projectId, userId, role, content, metadata = null) {
  try {
    await getProject(projectId, userId);
    const adminDb = getAdminDb();
    const messageRef = adminDb.collection("projects").doc(projectId).collection("messages").doc();
    const data = {
      role,
      content,
      timestamp: FieldValue.serverTimestamp()
    };
    if (metadata) data.metadata = metadata;

    await messageRef.set(data);
    await adminDb.collection("projects").doc(projectId).update({ updatedAt: FieldValue.serverTimestamp() });

    return messageRef.id;
  } catch (error) {
    console.error('[Chat DB Error] Failed to persist message:', error);
    throw error;
  }
}

export async function getMessages(projectId, userId) {
  try {
    await getProject(projectId, userId);
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("projects")
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
        metadata: data.metadata || null,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Chat DB Error] Failed to fetch messages:', error);
    throw error;
  }
}
