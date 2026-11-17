import { auth } from "./firebase";
export type InvitationInput = { email: string; schoolId: string; role: "school_admin" | "teacher" | "student"; language: "kk" | "ru"; displayName?: string; grade?: string; className?: string; subject?: string };
export type InvitationResult = { invitationId: string; inviteUrl: string; emailSent: boolean; expiresInHours: number };
export async function createInvitation(input: InvitationInput): Promise<InvitationResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");
  const idToken = await user.getIdToken();
  const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + idToken }, body: JSON.stringify(input) });
  const data = await response.json() as InvitationResult & { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not create invitation");
  return data;
}
