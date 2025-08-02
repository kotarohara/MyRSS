import { Handlers } from "$fresh/server.ts";
import { db } from "../../../../db.ts";
import { authService, getSessionCookie } from "../../../../utils/auth.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    try {
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

      const feedId = ctx.params.id;

      if (!feedId) {
        return new Response(JSON.stringify({ error: "Feed ID is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if feed exists
      const feed = await db.getFeedById(feedId);
      if (!feed) {
        return new Response(JSON.stringify({ error: "Feed not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if user is subscribed
      const subscriptions = await db.getUserSubscriptions(user.id);
      const isSubscribed = subscriptions.some((sub) => sub.feedId === feedId);

      if (!isSubscribed) {
        return new Response(
          JSON.stringify({ error: "Not subscribed to this feed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Unsubscribe user from the feed
      await db.deleteSubscription(user.id, feedId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Successfully unsubscribed from feed",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Unsubscribe error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Failed to unsubscribe from feed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
