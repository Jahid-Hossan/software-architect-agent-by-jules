import "server-only";

export async function isOwner(email) {
  if (!email) return false;

  const allowedEmailsStr = process.env.ALLOWED_EMAILS || "";
  const allowedEmails = allowedEmailsStr.split(",").map(e => e.trim().toLowerCase());

  return allowedEmails.includes(email.toLowerCase());
}
