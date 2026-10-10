import { createOperatorSession, requireOperatorSession, requireSameOrigin, revokeOperatorSession, sessionCookie, verifyOperatorToken } from "@/services/server/operator-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("token" in body) || typeof body.token !== "string" || !verifyOperatorToken(body.token)) {
      return Response.json({ error: "Invalid workspace access token" }, { status: 401 });
    }
    const session = createOperatorSession();
    return Response.json({ authenticated: true, expiresAt: session.expiresAt }, {
      headers: { "Set-Cookie": sessionCookie(session.token, new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" },
    });
  } catch { return Response.json({ error: "Session request was rejected" }, { status: 400 }); }
}

export async function GET(request: Request) {
  try {
    const principal = requireOperatorSession(request);
    return Response.json({ authenticated: true, principal }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ authenticated: false }, { status: 401 }); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    revokeOperatorSession(request);
    return Response.json({ authenticated: false }, { headers: { "Set-Cookie": "settlbox_operator=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" } });
  } catch { return Response.json({ error: "Session request was rejected" }, { status: 400 }); }
}
