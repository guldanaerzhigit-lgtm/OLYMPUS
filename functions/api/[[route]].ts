type Env = {
  FIREBASE_SERVICE_ACCOUNT: string;
  FIREBASE_API_KEY: string;
  APP_BASE_URL: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};
type Ctx = { request: Request; env: Env };
const PROJECT = "olympus-4444e";
const API = "https://identitytoolkit.googleapis.com/v1";
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (message: string, status = 400) => json({ error: message }, status);
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const enc = (value: string) => new TextEncoder().encode(value);
const decodePem = (pem: string) => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")), c => c.charCodeAt(0));
async function accessToken(env: Env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(enc(JSON.stringify({ iss: sa.client_email, sub: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit" })));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey("pkcs8", decodePem(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc(unsigned)));
  const jwt = unsigned + "." + b64url(sig);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const data = await response.json() as { access_token?: string };
  if (!response.ok || !data.access_token) throw new Error("Google service authorization failed");
  return data.access_token;
}
function fsValue(v: unknown): unknown {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, fsValue(x)])) } };
  return { nullValue: null };
}
function fsDecode(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsDecode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fsDecode(x)]));
  return null;
}
function fields(data: Record<string, unknown>) { return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsValue(v)])); }
function docData(doc: any) { return Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, fsDecode(v)])); }
async function firestore(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(DB + "/" + path, { ...init, headers: { authorization: "Bearer " + token, "content-type": "application/json", ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error?.message || "Firestore request failed");
  return body as any;
}
async function getDoc(token: string, path: string) {
  const res = await fetch(DB + "/" + path, { headers: { authorization: "Bearer " + token } });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error("Could not read Firestore document");
  return data as any;
}
async function patchDoc(token: string, path: string, data: Record<string, unknown>) {
  return firestore(token, path + "?updateMask.fieldPaths=" + Object.keys(data).map(encodeURIComponent).join("&updateMask.fieldPaths="), { method: "PATCH", body: JSON.stringify({ fields: fields(data) }) });
}
async function lookupUser(idToken: string, env: Env) {
  const res = await fetch(`${API}/accounts:lookup?key=${env.FIREBASE_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  const data = await res.json() as any;
  if (!res.ok || !data.users?.[0]) throw new Error("UNAUTHENTICATED");
  return data.users[0] as { localId: string; email: string };
}
async function sha(value: string) { return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc(value)))); }
async function sendInvite(env: Env, email: string, role: string, url: string, language: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  const ru = language === "ru";
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject: ru ? "Приглашение в OLYMPUS" : "OLYMPUS платформасына шақыру", html: ru ? `<p>Вас пригласили в OLYMPUS в роли <b>${role}</b>.</p><p><a href="${url}">Принять приглашение и создать аккаунт</a></p><p>Ссылка действует 72 часа.</p>` : `<p>Сізді OLYMPUS платформасына <b>${role}</b> рөлімен шақырды.</p><p><a href="${url}">Шақыруды қабылдап, аккаунт ашу</a></p><p>Сілтеме 72 сағат жарамды.</p>` }) });
  if (!res.ok) throw new Error("Email provider error");
  return true;
}
export async function onRequestPost({ request, env }: Ctx) {
  try {
    const body = await request.json() as any;
    const token = await accessToken(env);
    if (new URL(request.url).pathname === "/api/invitations") {
      const bearer = request.headers.get("authorization") || "";
      const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
      if (!idToken) return fail("Sign in required", 401);
      const callerAuth = await lookupUser(idToken, env);
      const callerDoc = await getDoc(token, "users/" + callerAuth.localId);
      if (!callerDoc) return fail("User profile not found", 403);
      const caller = docData(callerDoc);
      const role = String(body.role || "");
      const email = String(body.email || "").trim().toLowerCase();
      const schoolId = String(body.schoolId || "").trim();
      const language = body.language === "ru" ? "ru" : "kk";
      if (!["school_admin", "teacher", "student"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !schoolId) return fail("Invalid invitation details");
      const allowed = (caller.role === "super_admin" && role === "school_admin") || (caller.role === "school_admin" && caller.schoolId === schoolId && ["teacher", "student"].includes(role));
      if (!allowed) return fail("You cannot invite this role", 403);
      const schoolDoc = await getDoc(token, "schools/" + schoolId);
      if (!schoolDoc || docData(schoolDoc).status !== "active") return fail("School is not active", 400);
      const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x => x.toString(16).padStart(2, "0")).join("");
      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      const invite = { email, role, schoolId, tokenHash: await sha(rawToken), status: "pending", createdBy: callerAuth.localId, createdAt: new Date().toISOString(), expiresAt, language, displayName: String(body.displayName || ""), grade: String(body.grade || ""), className: String(body.className || ""), subject: String(body.subject || "") };
      await firestore(token, "invitations?documentId=" + id, { method: "POST", body: JSON.stringify({ fields: fields(invite) }) });
      const inviteUrl = env.APP_BASE_URL.replace(/\/$/, "") + "/register-invite?token=" + rawToken;
      let emailSent = false;
      try { emailSent = await sendInvite(env, email, role, inviteUrl, language); } catch { emailSent = false; }
      return json({ invitationId: id, inviteUrl, emailSent, expiresInHours: 72 });
    }
    if (new URL(request.url).pathname === "/api/register-invite") {
      const raw = String(body.token || "");
      const displayName = String(body.displayName || "").trim();
      const password = String(body.password || "");
      if (!/^[a-f0-9]{64}$/i.test(raw) || displayName.length < 2 || password.length < 8) return fail("Invalid registration details");
      const query = { structuredQuery: { from: [{ collectionId: "invitations" }], where: { fieldFilter: { field: { fieldPath: "tokenHash" }, op: "EQUAL", value: fsValue(await sha(raw)) } }, limit: 1 } };
      const found = await firestore(token, ":runQuery", { method: "POST", body: JSON.stringify(query) });
      const row = (found as any[]).find(x => x.document)?.document;
      if (!row) return fail("Invitation not found or already used", 404);
      const invite = docData(row);
      if (invite.status !== "pending" || !invite.expiresAt || new Date(invite.expiresAt).getTime() < Date.now()) return fail("Invitation expired or already used", 410);
      const invitePath = "invitations/" + row.name.split("/").pop();
      await patchDoc(token, invitePath, { status: "processing", processingAt: new Date().toISOString() });
      let uid = "";
      try {
        const create = await fetch(`${API}/accounts:signUp?key=${env.FIREBASE_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: invite.email, password, returnSecureToken: true }) });
        const created = await create.json() as any;
        if (!create.ok || !created.localId) throw new Error(created.error?.message || "Could not create Firebase account");
        uid = created.localId;
        const authUpdate = await fetch(`${API}/accounts:update`, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ role: invite.role, schoolId: invite.schoolId }), returnSecureToken: false }) });
        if (!authUpdate.ok) throw new Error("Could not assign account role");
        await firestore(token, "users?documentId=" + uid, { method: "POST", body: JSON.stringify({ fields: fields({ displayName, email: invite.email, role: invite.role, schoolId: invite.schoolId, grade: invite.grade || "", className: invite.className || "", subject: invite.subject || "", invitationId: invitePath.split("/").pop(), createdAt: new Date().toISOString() }) }) });
        await patchDoc(token, invitePath, { status: "accepted", acceptedAt: new Date().toISOString(), acceptedUid: uid });
        return json({ uid, email: invite.email, role: invite.role });
      } catch (error) {
        if (uid) await fetch(`${API}/accounts:delete`, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ localId: uid }) }).catch(() => undefined);
        await patchDoc(token, invitePath, { status: "pending" }).catch(() => undefined);
        throw error;
      }
    }
    return fail("Not found", 404);
  } catch (error) {
    const message = String((error as Error).message || error);
    if (message === "UNAUTHENTICATED") return fail("Sign in required", 401);
    return fail(message.includes("EMAIL_EXISTS") ? "An account with this email already exists" : "Server error: " + message, 500);
  }
}
