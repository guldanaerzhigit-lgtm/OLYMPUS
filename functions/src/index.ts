import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();
const resendApiKey = defineSecret("RESEND_API_KEY");
const appBaseUrl = defineString("APP_BASE_URL");
const emailFrom = defineString("EMAIL_FROM");

type Role = "school_admin" | "teacher" | "student";
const allowedRoles: Role[] = ["school_admin", "teacher", "student"];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const createRoleInvitation = onCall(
  { secrets: [resendApiKey], cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (!callerSnap.exists) throw new HttpsError("permission-denied", "User profile is missing.");
    const caller = callerSnap.data()!;
    const role = String(request.data?.role || "") as Role;
    const email = String(request.data?.email || "").trim().toLowerCase();
    const schoolId = String(request.data?.schoolId || "").trim();
    const language = request.data?.language === "ru" ? "ru" : "kk";
    const displayName = String(request.data?.displayName || "").trim();
    const grade = String(request.data?.grade || "").trim();
    const className = String(request.data?.className || "").trim();
    const subject = String(request.data?.subject || "").trim();

    if (!allowedRoles.includes(role)) throw new HttpsError("invalid-argument", "Unsupported role.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid email.");
    if (!schoolId) throw new HttpsError("invalid-argument", "School is required.");

    const callerRole = String(caller.role || "");
    const canInvite =
      (callerRole === "super_admin" && role === "school_admin") ||
      (callerRole === "school_admin" && caller.schoolId === schoolId && (role === "teacher" || role === "student"));
    if (!canInvite) throw new HttpsError("permission-denied", "You cannot invite this role.");

    const schoolSnap = await db.doc(`schools/${schoolId}`).get();
    if (!schoolSnap.exists || schoolSnap.data()?.status !== "active") {
      throw new HttpsError("failed-precondition", "School is not active.");
    }

    const token = randomBytes(32).toString("hex");
    const inviteRef = db.collection("invitations").doc();
    const expiresAt = Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 72);
    await inviteRef.set({
      email, role, schoolId, tokenHash: hashToken(token), status: "pending",
      createdBy: request.auth.uid, createdAt: FieldValue.serverTimestamp(), expiresAt,
      language, displayName, grade, className, subject
    });

    const baseUrl = appBaseUrl.value().replace(/\/$/, "");
    if (!/^https:\/\//.test(baseUrl)) {
      await inviteRef.delete();
      throw new HttpsError("failed-precondition", "Set APP_BASE_URL to your HTTPS website URL.");
    }
    const inviteUrl = `${baseUrl}/register-invite?token=${token}`;
    let emailSent = false;
    const apiKey = resendApiKey.value();
    if (apiKey) {
      const isRu = language === "ru";
      const subjectLine = isRu ? "Приглашение в OLYMPUS" : "OLYMPUS платформасына шақыру";
      const html = isRu
        ? `<p>Вас пригласили в OLYMPUS в роли <b>${role}</b>.</p><p><a href="${inviteUrl}">Принять приглашение и создать аккаунт</a></p><p>Ссылка действует 72 часа.</p>`
        : `<p>Сізді OLYMPUS платформасына <b>${role}</b> рөлімен шақырды.</p><p><a href="${inviteUrl}">Шақыруды қабылдап, аккаунт ашу</a></p><p>Сілтеме 72 сағат жарамды.</p>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: emailFrom.value(), to: [email], subject: subjectLine, html })
      });
      if (!response.ok) {
        const body = await response.text();
        await inviteRef.delete();
        throw new HttpsError("internal", `Email provider error: ${body.slice(0, 300)}`);
      }
      emailSent = true;
    }
    return { invitationId: inviteRef.id, inviteUrl, emailSent, expiresInHours: 72 };
  }
);

export const completeInviteRegistration = onCall(async (request) => {
  const token = String(request.data?.token || "");
  const displayName = String(request.data?.displayName || "").trim();
  const password = String(request.data?.password || "");
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new HttpsError("invalid-argument", "Invalid invitation link.");
  if (displayName.length < 2) throw new HttpsError("invalid-argument", "Enter your full name.");
  if (password.length < 8) throw new HttpsError("invalid-argument", "Password must contain at least 8 characters.");

  const inviteQuery = await db.collection("invitations").where("tokenHash", "==", hashToken(token)).limit(1).get();
  if (inviteQuery.empty) throw new HttpsError("not-found", "Invitation not found or already used.");
  const inviteRef = inviteQuery.docs[0].ref;
  const invite = inviteQuery.docs[0].data();
  if (invite.status !== "pending" || !(invite.expiresAt instanceof Timestamp) || invite.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError("failed-precondition", "Invitation has expired or was already used.");
  }

  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    const data = snap.data();
    if (!snap.exists || data?.status !== "pending" || !(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() < Date.now()) {
      throw new HttpsError("failed-precondition", "Invitation has expired or was already used.");
    }
    tx.update(inviteRef, { status: "processing", processingAt: FieldValue.serverTimestamp() });
    return data;
  });

  let createdUid = "";
  try {
    const user = await getAuth().createUser({
      email: String(claim.email),
      password,
      displayName
    });
    createdUid = user.uid;
    const role = String(claim.role) as Role;
    await getAuth().setCustomUserClaims(user.uid, { role, schoolId: claim.schoolId });
    await db.doc(`users/${user.uid}`).set({
      displayName, email: String(claim.email), role, schoolId: String(claim.schoolId),
      grade: String(claim.grade || ""), className: String(claim.className || ""),
      subject: String(claim.subject || ""), invitationId: inviteRef.id,
      createdAt: FieldValue.serverTimestamp()
    });
    await inviteRef.update({ status: "accepted", acceptedAt: FieldValue.serverTimestamp(), acceptedUid: user.uid });
    return { uid: user.uid, email: user.email, role };
  } catch (error) {
    if (createdUid) {
      await getAuth().deleteUser(createdUid).catch(() => undefined);
      await db.doc(`users/${createdUid}`).delete().catch(() => undefined);
    }
    await inviteRef.update({ status: "pending", processingAt: FieldValue.delete() }).catch(() => undefined);
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists. Sign in to the existing account or contact the school administrator.");
    }
    throw new HttpsError("internal", "Could not create the account. Please try again.");
  }
});