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

type Caller = { uid: string; email: string; profile: Record<string, any> };
async function callerProfile(request: Request, token: string, env: Env): Promise<Caller> {
  const bearer = request.headers.get("authorization") || "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!idToken) throw new Error("UNAUTHENTICATED");
  const authUser = await lookupUser(idToken, env);
  const profileDoc = await getDoc(token, "users/" + authUser.localId);
  if (!profileDoc) throw new Error("PROFILE_NOT_FOUND");
  return { uid: authUser.localId, email: authUser.email || "", profile: docData(profileDoc) };
}
async function collectionDocs(token: string, path: string): Promise<any[]> {
  const response = await firestore(token, path + "?pageSize=200");
  return (response.documents || []).map((document: any) => ({
    id: document.name.split("/").pop(),
    ...docData(document)
  }));
}
const cleanAnswer = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();
function publicQuestion(question: Record<string, any>) {
  const { answer, correctAnswer, solution, explanation, ...safe } = question;
  return safe;
}
async function createOlympiadQuestion(token: string, olympiadId: string, input: Record<string, any>, caller: Caller) {
  const olympiadDoc = await getDoc(token, "olympiads/" + olympiadId);
  if (!olympiadDoc) throw new Error("OLYMPIAD_NOT_FOUND");
  const olympiad = docData(olympiadDoc);
  if (olympiad.status !== "draft") throw new Error("QUESTIONS_LOCKED");
  if (caller.profile.role === "teacher" && caller.profile.schoolId !== olympiad.schoolId) throw new Error("FORBIDDEN");
  if (!["teacher", "super_admin"].includes(String(caller.profile.role))) throw new Error("FORBIDDEN");
  const prompt = String(input.prompt || "").trim();
  const type = input.type === "single_choice" ? "single_choice" : "short_answer";
  const answer = String(input.answer || "").trim();
  const points = Math.max(1, Math.min(100, Number(input.points) || 1));
  const options = Array.isArray(input.options) ? input.options.slice(0, 8).map((option: any, index: number) => ({
    value: String(option.value ?? String.fromCharCode(65 + index)).trim(),
    label: String(option.label ?? option.value ?? "").trim()
  })).filter((option: any) => option.value && option.label) : [];
  if (prompt.length < 3 || !answer) throw new Error("INVALID_QUESTION");
  if (type === "single_choice" && (options.length < 2 || !options.some((option: any) => option.value === answer))) throw new Error("INVALID_OPTIONS_OR_ANSWER");
  const id = crypto.randomUUID();
  const question = { prompt, type, options: type === "single_choice" ? options : [], answer, points, order: Number(input.order) || Date.now(), createdBy: caller.uid, createdAt: new Date().toISOString() };
  await firestore(token, "olympiads/" + olympiadId + "/questions?documentId=" + id, { method: "POST", body: JSON.stringify({ fields: fields(question) }) });
  await patchDoc(token, "olympiads/" + olympiadId, { questionCount: (Number(olympiad.questionCount) || 0) + 1, updatedAt: new Date().toISOString() });
  return { id, ...publicQuestion(question) };
}
async function createAttempt(token: string, olympiadId: string, caller: Caller) {
  if (caller.profile.role !== "student") throw new Error("FORBIDDEN");
  if (!caller.profile.schoolId) throw new Error("SCHOOL_REQUIRED");
  const schoolDoc = await getDoc(token, "schools/" + caller.profile.schoolId);
  if (!schoolDoc || docData(schoolDoc).status !== "active") throw new Error("SCHOOL_INACTIVE");
  const olympiadDoc = await getDoc(token, "olympiads/" + olympiadId);
  if (!olympiadDoc) throw new Error("OLYMPIAD_NOT_FOUND");
  const olympiad = docData(olympiadDoc);
  if (olympiad.status !== "published") throw new Error("OLYMPIAD_NOT_OPEN");
  if (olympiad.schoolId && olympiad.schoolId !== caller.profile.schoolId) throw new Error("FORBIDDEN");
  if (olympiad.grade && caller.profile.grade && Number(olympiad.grade) !== Number(caller.profile.grade)) throw new Error("GRADE_MISMATCH");
  const now = Date.now();
  const startAt = olympiad.startDate ? new Date(olympiad.startDate).getTime() : 0;
  if (Number.isFinite(startAt) && startAt > now) throw new Error("OLYMPIAD_NOT_STARTED");
  const attemptPath = "olympiads/" + olympiadId + "/attempts/" + caller.uid;
  const previous = await getDoc(token, attemptPath);
  const questionRows = await collectionDocs(token, "olympiads/" + olympiadId + "/questions");
  const questions = questionRows.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map(publicQuestion);
  if (!questions.length) throw new Error("NO_QUESTIONS");
  if (previous) {
    const old = docData(previous);
    if (old.status === "submitted") {
      const resultDoc = await getDoc(token, "olympiads/" + olympiadId + "/results/" + caller.uid);
      return { completedResult: resultDoc ? docData(resultDoc) : null, attemptId: caller.uid, expiresAt: old.expiresAt, questions: [], olympiad: { id: olympiadId, title: olympiad.title, duration: olympiad.duration } };
    }
    if (old.status !== "in_progress") throw new Error("ATTEMPT_NOT_ACTIVE");
    const remaining = new Date(old.expiresAt).getTime() - now;
    if (remaining <= 0) {
      const completedResult = await submitAttempt(token, olympiadId, old.answers || {}, caller);
      return { completedResult, attemptId: caller.uid, expiresAt: old.expiresAt, questions: [], olympiad: { id: olympiadId, title: olympiad.title, duration: olympiad.duration } };
    }
    return { attemptId: caller.uid, expiresAt: old.expiresAt, savedAnswers: old.answers || {}, questions, olympiad: { id: olympiadId, title: olympiad.title, duration: olympiad.duration } };
  }
  const duration = Math.max(1, Math.min(240, Number(olympiad.duration) || 60));
  const expiresAt = new Date(now + duration * 60_000).toISOString();
  const attempt = { studentUid: caller.uid, studentName: caller.profile.displayName || caller.email, schoolId: caller.profile.schoolId, status: "in_progress", startedAt: new Date(now).toISOString(), expiresAt, answers: {}, questionIds: questions.map(q => q.id) };
  await firestore(token, "olympiads/" + olympiadId + "/attempts?documentId=" + caller.uid, { method: "POST", body: JSON.stringify({ fields: fields(attempt) }) });
  return { attemptId: caller.uid, expiresAt, questions, olympiad: { id: olympiadId, title: olympiad.title, duration } };
}
async function saveAttemptAnswers(token: string, olympiadId: string, answers: Record<string, unknown>, caller: Caller) {
  if (caller.profile.role !== "student") throw new Error("FORBIDDEN");
  const attemptPath = "olympiads/" + olympiadId + "/attempts/" + caller.uid;
  const attemptDoc = await getDoc(token, attemptPath);
  if (!attemptDoc) throw new Error("ATTEMPT_NOT_FOUND");
  const attempt = docData(attemptDoc);
  if (attempt.status !== "in_progress") throw new Error("ATTEMPT_NOT_ACTIVE");
  if (Date.now() > new Date(attempt.expiresAt).getTime()) throw new Error("ATTEMPT_EXPIRED");
  const allowed = new Set<string>(Array.isArray(attempt.questionIds) ? attempt.questionIds : []);
  const merged: Record<string, string> = { ...(attempt.answers || {}) };
  for (const [questionId, value] of Object.entries(answers || {}).slice(0, 100)) {
    if (allowed.has(questionId)) merged[questionId] = String(value ?? "").slice(0, 1000);
  }
  await patchDoc(token, attemptPath, { answers: merged, updatedAt: new Date().toISOString() });
  return { saved: true, savedCount: Object.keys(merged).length };
}
async function submitAttempt(token: string, olympiadId: string, answers: Record<string, unknown>, caller: Caller) {
  if (caller.profile.role !== "student") throw new Error("FORBIDDEN");
  const attemptPath = "olympiads/" + olympiadId + "/attempts/" + caller.uid;
  const attemptDoc = await getDoc(token, attemptPath);
  if (!attemptDoc) throw new Error("ATTEMPT_NOT_FOUND");
  const attempt = docData(attemptDoc);
  if (attempt.status === "submitted") {
    const existingResult = await getDoc(token, "olympiads/" + olympiadId + "/results/" + caller.uid);
    return existingResult ? docData(existingResult) : { score: attempt.score || 0, maxScore: attempt.maxScore || 0, certificateSerial: attempt.certificateSerial || "" };
  }
  if (attempt.status !== "in_progress") throw new Error("ATTEMPT_NOT_ACTIVE");
  const resultPath = "olympiads/" + olympiadId + "/results/" + caller.uid;
  const alreadySaved = await getDoc(token, resultPath);
  if (alreadySaved) {
    const savedResult = docData(alreadySaved);
    if (savedResult.certificateSerial) {
      const certificatePath = "certificates/" + savedResult.certificateSerial;
      const certificateDoc = await getDoc(token, certificatePath);
      if (!certificateDoc) {
        const certificate = { serial: savedResult.certificateSerial, studentUid: caller.uid, studentName: savedResult.studentName, schoolId: savedResult.schoolId, olympiadId, olympiadTitle: savedResult.olympiadTitle, subject: savedResult.subject, grade: savedResult.grade, score: savedResult.score, maxScore: savedResult.maxScore, percentage: savedResult.percentage, issuedAt: savedResult.submittedAt, status: "issued" };
        await firestore(token, "certificates?documentId=" + savedResult.certificateSerial, { method: "POST", body: JSON.stringify({ fields: fields(certificate) }) });
      }
    }
    await patchDoc(token, attemptPath, { status: "submitted", submittedAt: savedResult.submittedAt, score: savedResult.score, maxScore: savedResult.maxScore, certificateSerial: savedResult.certificateSerial || "" });
    return savedResult;
  }
  const olympiadDoc = await getDoc(token, "olympiads/" + olympiadId);
  if (!olympiadDoc) throw new Error("OLYMPIAD_NOT_FOUND");
  const olympiad = docData(olympiadDoc);
  const questionRows = await collectionDocs(token, "olympiads/" + olympiadId + "/questions");
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  const details: Record<string, any> = {};
  const submitted = new Date().toISOString();
  const expired = Date.now() > new Date(attempt.expiresAt).getTime();
  for (const question of questionRows) {
    const points = Math.max(1, Number(question.points) || 1);
    maxScore += points;
    const given = cleanAnswer(expired ? attempt.answers?.[question.id] : (answers?.[question.id] ?? attempt.answers?.[question.id]));
    const correct = cleanAnswer(question.answer);
    const isCorrect = !!given && given === correct;
    if (isCorrect) { score += points; correctCount += 1; }
    details[question.id] = { answer: String(answers?.[question.id] ?? "").slice(0, 1000), correct: isCorrect, points: isCorrect ? points : 0 };
  }
  const percentage = maxScore ? Math.round(score / maxScore * 10000) / 100 : 0;
  const serial = "OLY-" + new Date().getFullYear() + "-" + crypto.randomUUID().replace(/-/g, "").toUpperCase();
  const studentName = String(caller.profile.displayName || caller.email || "Оқушы");
  const result = { olympiadId, olympiadTitle: olympiad.title || "", subject: olympiad.subject || "", grade: olympiad.grade || "", studentUid: caller.uid, studentName, schoolId: caller.profile.schoolId || "", score, maxScore, percentage, correctCount, totalQuestions: questionRows.length, submittedAt: submitted, status: "verified", certificateSerial: serial };
  const certificate = { serial, studentUid: caller.uid, studentName, schoolId: caller.profile.schoolId || "", olympiadId, olympiadTitle: olympiad.title || "", subject: olympiad.subject || "", grade: olympiad.grade || "", score, maxScore, percentage, issuedAt: submitted, status: "issued" };
  await firestore(token, "olympiads/" + olympiadId + "/results?documentId=" + caller.uid, { method: "POST", body: JSON.stringify({ fields: fields(result) }) });
  await firestore(token, "certificates?documentId=" + serial, { method: "POST", body: JSON.stringify({ fields: fields(certificate) }) });
  await patchDoc(token, attemptPath, { status: "submitted", submittedAt: submitted, score, maxScore, answers: details, certificateSerial: serial, expired });
  return result;
}
async function handleOlympiadPost(path: string, request: Request, body: any, token: string, env: Env) {
  const caller = await callerProfile(request, token, env);
  if (path === "/api/teacher/olympiad") {
    if (caller.profile.role !== "teacher" || !caller.profile.schoolId) return fail("Teacher account required", 403);
    const title = String(body.title || "").trim();
    if (title.length < 3) return fail("Olympiad title is required");
    const schoolDoc = await getDoc(token, "schools/" + caller.profile.schoolId);
    if (!schoolDoc || docData(schoolDoc).status !== "active") return fail("School is not active", 403);
    const id = crypto.randomUUID();
    const olympiad = { title, subject: String(body.subject || "Математика"), grade: Number(body.grade) || 5, duration: Math.max(1, Math.min(240, Number(body.duration) || 60)), startDate: String(body.startDate || ""), schoolId: caller.profile.schoolId, createdBy: caller.uid, createdByRole: "teacher", questionCount: 0, status: "draft", createdAt: new Date().toISOString() };
    await firestore(token, "olympiads?documentId=" + id, { method: "POST", body: JSON.stringify({ fields: fields(olympiad) }) });
    return json({ id, ...olympiad });
  }
  if (path === "/api/teacher/question" || path === "/api/admin/question") {
    const allowed = path === "/api/admin/question" ? caller.profile.role === "super_admin" : caller.profile.role === "teacher";
    if (!allowed) return fail("Not allowed", 403);
    try { return json(await createOlympiadQuestion(token, String(body.olympiadId || ""), body, caller), 201); }
    catch (error) { throw error; }
  }
  if (path === "/api/olympiad/start") {
    try { return json(await createAttempt(token, String(body.olympiadId || ""), caller)); }
    catch (error) { throw error; }
  }
  if (path === "/api/olympiad/save") {
    try { return json(await saveAttemptAnswers(token, String(body.olympiadId || ""), body.answers || {}, caller)); }
    catch (error) { throw error; }
  }
  if (path === "/api/olympiad/submit") {
    try { return json(await submitAttempt(token, String(body.olympiadId || ""), body.answers || {}, caller)); }
    catch (error) { throw error; }
  }
  if (path === "/api/student/history") {
    if (caller.profile.role !== "student") return fail("Student account required", 403);
    const olympiads = await collectionDocs(token, "olympiads");
    const history = [];
    for (const olympiad of olympiads) {
      const resultDoc = await getDoc(token, "olympiads/" + olympiad.id + "/results/" + caller.uid);
      if (resultDoc) history.push(docData(resultDoc));
    }
    return json({ history: history.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))) });
  }
  if (path === "/api/admin/analytics") {
    if (caller.profile.role !== "super_admin") return fail("Super Admin only", 403);
    const olympiads = await collectionDocs(token, "olympiads");
    let results: any[] = [];
    for (const olympiad of olympiads) {
      const rows = await collectionDocs(token, "olympiads/" + olympiad.id + "/results");
      results = results.concat(rows.map(row => ({ ...row, olympiadId: olympiad.id, olympiadTitle: olympiad.title || "" })));
    }
    const schools = await collectionDocs(token, "schools");
    const sum = results.reduce((value, row) => value + Number(row.percentage || 0), 0);
    const top = [...results].sort((a, b) => Number(b.percentage) - Number(a.percentage) || String(a.submittedAt).localeCompare(String(b.submittedAt))).slice(0, 10);
    const subjects: Record<string, number> = {};
    for (const row of results) subjects[String(row.subject || "Басқа")] = (subjects[String(row.subject || "Басқа")] || 0) + 1;
    return json({
      schools: schools.length,
      olympiads: olympiads.length,
      publishedOlympiads: olympiads.filter(item => item.status === "published").length,
      archivedOlympiads: olympiads.filter(item => item.status === "archived").length,
      totalParticipants: results.length,
      averagePercentage: results.length ? Math.round(sum / results.length * 10) / 10 : 0,
      activeSchools: schools.filter(item => item.status === "active").length,
      subjects,
      topParticipants: top.map((row, index) => ({ rank: index + 1, studentName: row.studentName, olympiadTitle: row.olympiadTitle, subject: row.subject, percentage: row.percentage, score: row.score, maxScore: row.maxScore }))
    });
  }
  if (path === "/api/olympiad/leaderboard") {
    const olympiadId = String(body.olympiadId || "");
    const olympiadDoc = await getDoc(token, "olympiads/" + olympiadId);
    if (!olympiadDoc) return fail("OLYMPIAD_NOT_FOUND", 404);
    const olympiad = docData(olympiadDoc);
    if (olympiad.schoolId && caller.profile.role !== "super_admin" && caller.profile.schoolId !== olympiad.schoolId) return fail("FORBIDDEN", 403);
    const rows = await collectionDocs(token, "olympiads/" + olympiadId + "/results");
    rows.sort((a, b) => Number(b.percentage) - Number(a.percentage) || String(a.submittedAt).localeCompare(String(b.submittedAt)));
    return json({ rows: rows.slice(0, 100).map((row, index) => ({ rank: index + 1, studentName: row.studentName, schoolId: row.schoolId, score: row.score, maxScore: row.maxScore, percentage: row.percentage, submittedAt: row.submittedAt })) });
  }
  return fail("Not found", 404);
}

export async function onRequestPost({ request, env }: Ctx) {
  try {
    const body = await request.json() as any;
    const token = await accessToken(env);
    const route = new URL(request.url).pathname;
    if (route.startsWith("/api/teacher/") || route.startsWith("/api/admin/") || route.startsWith("/api/olympiad/") || route === "/api/student/history") {
      return await handleOlympiadPost(route, request, body, token, env);
    }
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
    if (["PROFILE_NOT_FOUND", "FORBIDDEN"].includes(message)) return fail(message, 403);
    if (message === "OLYMPIAD_NOT_FOUND" || message === "ATTEMPT_NOT_FOUND") return fail(message, 404);
    if (["OLYMPIAD_NOT_OPEN", "OLYMPIAD_NOT_STARTED", "ATTEMPT_ALREADY_SUBMITTED", "ATTEMPT_EXPIRED", "ATTEMPT_NOT_ACTIVE", "QUESTIONS_LOCKED", "NO_QUESTIONS"].includes(message)) return fail(message, 409);
    if (["SCHOOL_INACTIVE", "SCHOOL_REQUIRED", "GRADE_MISMATCH"].includes(message)) return fail(message, 403);
    if (["INVALID_QUESTION", "INVALID_OPTIONS_OR_ANSWER"].includes(message)) return fail(message, 400);
    return fail(message.includes("EMAIL_EXISTS") ? "An account with this email already exists" : "Server error: " + message, 500);
  }
}


export async function onRequestGet({ request, env }: Ctx) {
  try {
    const route = new URL(request.url);
    if (route.pathname === "/api/certificates/verify") {
      const serial = String(route.searchParams.get("serial") || "").trim();
      if (!serial || serial.length > 80) return fail("Certificate serial is required", 400);
      const token = await accessToken(env);
      const certificate = await getDoc(token, "certificates/" + encodeURIComponent(serial));
      if (!certificate) return fail("Certificate not found", 404);
      const data = docData(certificate);
      return json({ valid: data.status === "issued", serial: data.serial, studentName: data.studentName, olympiadTitle: data.olympiadTitle, subject: data.subject, grade: data.grade, score: data.score, maxScore: data.maxScore, percentage: data.percentage, issuedAt: data.issuedAt });
    }
    return fail("Not found", 404);
  } catch (error) {
    return fail(String((error as Error).message || error), 500);
  }
}
