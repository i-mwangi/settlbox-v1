import { verifyWorkspacePassword } from "@/services/server/password-login";
import { createOperatorSession, requireSameOrigin, sessionCookie } from "@/services/server/operator-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 4096) throw new Error("Sign-in request is too large");
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("email" in input) || !("password" in input)) throw new Error("Email and password are required");
    if (!verifyWorkspacePassword(input.email, input.password, "workspace")) return Response.json({ error: "Invalid email or password" }, { status: 401 });
    const session = createOperatorSession();
    return Response.json({ authenticated: true, expiresAt: session.expiresAt }, { headers: { "Set-Cookie": sessionCookie(session.token, new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sign-in failed" }, { status: 400 });
  }
}
