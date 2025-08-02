import { FreshContext } from "$fresh/server.ts";
import { authService, setSessionCookie } from "../../../utils/auth.ts";

export async function handler(
  req: Request,
  _ctx: FreshContext,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return new Response(
        JSON.stringify({ error: "Username/email and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { user, session } = await authService.login(
      usernameOrEmail,
      password,
    );

    const responseData = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": setSessionCookie(session.id),
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
