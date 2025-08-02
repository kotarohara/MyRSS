import { FreshContext } from "$fresh/server.ts";
import {
  authService,
  clearSessionCookie,
  getSessionCookie,
} from "../../../utils/auth.ts";

export async function handler(
  req: Request,
  _ctx: FreshContext,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sessionId = getSessionCookie(req);

  if (sessionId) {
    try {
      await authService.logout(sessionId);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  return new Response(
    JSON.stringify({ message: "Logged out successfully" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}
