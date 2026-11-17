import { auth } from "./firebase";

export async function apiPost<T = any>(path: string, payload: Record<string, unknown> = {}): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Жүйеге қайта кіріңіз.");
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + idToken },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(data.error || "REQUEST_FAILED");
    const messages: Record<string, string> = {
      UNAUTHENTICATED: "Сессия аяқталды. Қайта кіріңіз.",
      OLYMPIAD_NOT_OPEN: "Бұл олимпиада қазір қолжетімді емес.",
      OLYMPIAD_NOT_STARTED: "Олимпиада басталу уақыты әлі келген жоқ.",
      NO_QUESTIONS: "Олимпиадаға сұрақтар енгізілмеген.",
      ATTEMPT_ALREADY_SUBMITTED: "Сіз бұл олимпиаданы тапсырып қойдыңыз.",
      ATTEMPT_EXPIRED: "Тестілеу уақыты аяқталған.",
      QUESTIONS_LOCKED: "Жарияланған олимпиаданың сұрақтарын өзгертуге болмайды.",
      SCHOOL_INACTIVE: "Мектеп аккаунты белсенді емес."
    };
    throw new Error(messages[code] || code);
  }
  return data as T;
}

export async function apiGetPublic<T = any>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data.error || "REQUEST_FAILED"));
  return data as T;
}
