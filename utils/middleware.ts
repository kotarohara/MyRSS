import { FreshContext } from "$fresh/server.ts";
import { authService, getSessionCookie } from "./auth.ts";
import { User } from "../db.ts";

export interface AuthState {
  user: User | null;
}

export async function authMiddleware(
  req: Request,
  ctx: FreshContext<AuthState>,
): Promise<Response> {
  const sessionId = getSessionCookie(req);
  let user: User | null = null;

  if (sessionId) {
    try {
      user = await authService.getUserFromSession(sessionId);
    } catch (error) {
      console.error("Error getting user from session:", error);
    }
  }

  ctx.state.user = user;
  return await ctx.next();
}

export function requireAuth(
  handler: (
    req: Request,
    ctx: FreshContext<AuthState>,
  ) => Promise<Response> | Response,
) {
  return async (req: Request, ctx: FreshContext<AuthState>) => {
    if (!ctx.state.user) {
      const url = new URL(req.url);
      const redirectUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    return await handler(req, ctx);
  };
}

export function requireGuest(
  handler: (
    req: Request,
    ctx: FreshContext<AuthState>,
  ) => Promise<Response> | Response,
) {
  return async (req: Request, ctx: FreshContext<AuthState>) => {
    if (ctx.state.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    return await handler(req, ctx);
  };
}
