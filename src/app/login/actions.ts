"use server";

export async function checkEmailAllowed(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase() ?? "";
  const submitted = email.trim().toLowerCase();

  if (!allowed) {
    return { ok: false, error: "Server is missing ALLOWED_EMAIL configuration." };
  }
  if (submitted !== allowed) {
    return {
      ok: false,
      error: "Not authorized. This app is restricted to a single user.",
    };
  }
  return { ok: true };
}
