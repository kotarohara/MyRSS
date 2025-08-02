import { Handlers } from "$fresh/server.ts";
import { db } from "../../../../db.ts";
import { authService, getSessionCookie } from "../../../../utils/auth.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const sessionId = getSessionCookie(req);
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await authService.getUserFromSession(sessionId);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: followingId } = ctx.params;

    if (user.id === followingId) {
      return new Response(JSON.stringify({ error: "Cannot follow yourself" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user to follow exists
    const userToFollow = await db.getUserById(followingId);
    if (!userToFollow) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if already following
    const existingFollow = await db.getFollow(user.id, followingId);
    if (existingFollow) {
      return new Response(
        JSON.stringify({ error: "Already following this user" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create follow relationship
    await db.createFollow({
      followerId: user.id,
      followingId,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async DELETE(req, ctx) {
    const sessionId = getSessionCookie(req);
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await authService.getUserFromSession(sessionId);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: followingId } = ctx.params;

    // Check if currently following
    const existingFollow = await db.getFollow(user.id, followingId);
    if (!existingFollow) {
      return new Response(
        JSON.stringify({ error: "Not following this user" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Remove follow relationship
    await db.deleteFollow(user.id, followingId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
