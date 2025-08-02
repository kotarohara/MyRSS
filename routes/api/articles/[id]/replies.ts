import { Handlers } from "$fresh/server.ts";
import { db } from "../../../../db.ts";
import { authService, getSessionCookie } from "../../../../utils/auth.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const articleId = ctx.params.id;
    if (!articleId) {
      return new Response("Article ID required", { status: 400 });
    }

    try {
      // Check if article exists
      const article = await db.getArticleById(articleId);
      if (!article) {
        return new Response("Article not found", { status: 404 });
      }

      // Get replies
      const replies = await db.getArticleReplies(articleId);

      // Get user info for each reply
      const repliesWithUsers = await Promise.all(
        replies.map(async (reply) => {
          const user = await db.getUserById(reply.userId);
          return {
            id: reply.id,
            userId: reply.userId,
            content: reply.content,
            createdAt: reply.createdAt.toISOString(),
            username: user?.username || "Unknown",
          };
        }),
      );

      return new Response(
        JSON.stringify({
          replies: repliesWithUsers,
          count: replies.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching replies:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },

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
      const { content } = body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return new Response("Reply content is required", { status: 400 });
      }

      if (content.length > 1000) {
        return new Response("Reply content too long (max 1000 characters)", {
          status: 400,
        });
      }

      // Check if article exists
      const article = await db.getArticleById(articleId);
      if (!article) {
        return new Response("Article not found", { status: 404 });
      }

      // Create reply
      const reply = await db.createReply({
        userId: user.id,
        articleId,
        content: content.trim(),
      });

      // Get updated reply count
      const replies = await db.getArticleReplies(articleId);

      return new Response(
        JSON.stringify({
          reply: {
            id: reply.id,
            userId: reply.userId,
            content: reply.content,
            createdAt: reply.createdAt.toISOString(),
            username: user.username,
          },
          count: replies.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error creating reply:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
