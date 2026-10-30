/** Admin sign-in: one password (ADMIN_PASSWORD, set in Vercel). The cookie holds an HMAC of it, never the password. */
export const ADMIN_COOKIE = "kurean_admin";

const enc = new TextEncoder();

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The cookie value for the current password; changing ADMIN_PASSWORD signs everyone out. */
export async function adminToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 10) return null;
  return hmacHex(pw, "kurean-admin-v1");
}

export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAdminToken(value: string | undefined): Promise<boolean> {
  const token = await adminToken();
  return Boolean(token && value && sameString(value, token));
}

export async function passwordMatches(input: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 10) return false;
  // Compare HMACs so the comparison takes the same time whatever the input length.
  const [a, b] = await Promise.all([hmacHex("kurean-login", input), hmacHex("kurean-login", pw)]);
  return sameString(a, b);
}
