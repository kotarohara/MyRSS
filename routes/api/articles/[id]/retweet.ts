import { Handlers } from "$fresh/server.ts";
import { db } from "../../../../db.ts";
import { authService, getSessionCookie } from "../../../../utils/auth.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const sessionId = getSessionCookie(req);
    if (!sessionId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await authService.getUserFromSession(sessionId);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const articleId = ctx.params.id;
    if (!articleId) {
      return new Response("Article ID required", { status: 400 });
    }

    try {
      const body = await req.json();
      const { retweeted, comment } = body;

      if (typeof retweeted !== "boolean") {
        return new Response("Invalid request body", { status: 400 });
      }

      // Check if article exists
      const article = await db.getArticleById(articleId);
      if (!article) {
        return new Response("Article not found", { status: 404 });
      }

      if (retweeted) {
        // Create retweet
        await db.createRetweet({
          userId: user.id,
          articleId,
          comment: comment || undefined,
          createdAt: new Date(),
        });
      } else {
        // Remove retweet
        await db.deleteRetweet(user.id, articleId);
      }

      // Get updated retweet count
      const retweets = await db.getArticleRetweets(articleId);
      const retweetCount = retweets.length;

      return new Response(
        JSON.stringify({
          retweeted,
          count: retweetCount,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error handling retweet:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
