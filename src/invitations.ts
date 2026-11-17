import { auth } from "./firebase";

export type InvitationInput = {
  email: string;
  schoolId: string;
  role: "school_admin" | "teacher" | "student";
  language: "kk" | "ru";
  displayName?: string;
  grade?: string;
  className?: string;
  subject?: string;
};
export type InvitationResult = {
  invitationId: string;
  inviteUrl: string;
  emailSent: boolean;
  expiresInHours: number;
};

export async function createInvitation(input: InvitationInput): Promise<InvitationResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");

  const idToken = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + idToken,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Серверге қосылу мүмкін болмады. Cloudflare Pages deployment күйін тексеріңіз.");
  }

  const raw = await response.text();
  let data: (InvitationResult & { error?: string }) | null = null;
  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as InvitationResult & { error?: string };
    } catch {
      throw new Error(
        `API JSON емес жауап қайтарды (HTTP ${response.status}). Жауап: ${raw.slice(0, 180)}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Шақыру API қатесі (HTTP ${response.status}).`);
  }
  if (!data) {
    throw new Error(
      `Шақыру API бос жауап қайтарды (HTTP ${response.status}). Cloudflare Pages Functions іске қосылғанын тексеру керек.`
    );
  }
  if (!data.inviteUrl || !data.invitationId) {
    throw new Error("API жауабында шақыру сілтемесі жоқ. Cloudflare Functions логын тексеріңіз.");
  }
  return data;
}
