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
      const { liked } = body;

      if (typeof liked !== "boolean") {
        return new Response("Invalid request body", { status: 400 });
      }

      // Check if article exists
      const article = await db.getArticleById(articleId);
      if (!article) {
        return new Response("Article not found", { status: 404 });
      }

      if (liked) {
        // Create like
        await db.createLike({
          userId: user.id,
          articleId,
          createdAt: new Date(),
        });
      } else {
        // Remove like
        await db.deleteLike(user.id, articleId);
      }

      // Get updated like count
      const likes = await db.getArticleLikes(articleId);
      const likeCount = likes.length;

      return new Response(
        JSON.stringify({
          liked,
          count: likeCount,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error handling like:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
