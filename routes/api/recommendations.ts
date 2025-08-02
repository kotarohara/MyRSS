import { Handlers } from "$fresh/server.ts";
import { db } from "../../db.ts";
import { authService, getSessionCookie } from "../../utils/auth.ts";

export const handler: Handlers = {
  async GET(req) {
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

    try {
      // Simple recommendation algorithm based on:
      // 1. Articles from feeds the user hasn't read but others have liked
      // 2. Articles similar to ones the user has liked (based on feed)
      // 3. Popular articles the user hasn't read

      const recommendations = [];

      // Get user's read history and likes
      const [readHistory] = await Promise.all([
        db.getUserReadHistory(user.id),
      ]);

      const readArticleIds = new Set(readHistory.map((h) => h.articleId));
      const allArticles = await db.getAllArticles();

      // Get articles user has liked to find similar content
      const likedArticles = [];
      for (const article of allArticles) {
        const userLike = await db.getUserLike(user.id, article.id);
        if (userLike) {
          likedArticles.push(article);
        }
      }

      const likedFeedIds = new Set(likedArticles.map((a) => a.feedId));

      // Recommendation 1: Articles from feeds similar to liked ones that user hasn't read
      for (const article of allArticles) {
        if (readArticleIds.has(article.id)) continue;

        if (likedFeedIds.has(article.feedId)) {
          const [likes, retweets] = await Promise.all([
            db.getArticleLikes(article.id),
            db.getArticleRetweets(article.id),
          ]);

          const score = likes.length + retweets.length * 2;
          if (score > 0) {
            recommendations.push({
              article,
              score: score + 10, // Bonus for being from liked feed
              reason: "Similar to articles you've liked",
            });
          }
        }
      }

      // Recommendation 2: Popular articles from the last week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      for (const article of allArticles) {
        if (readArticleIds.has(article.id)) continue;
        if (article.publishedAt < weekAgo) continue;

        const [likes, retweets, replies] = await Promise.all([
          db.getArticleLikes(article.id),
          db.getArticleRetweets(article.id),
          db.getArticleReplies(article.id),
        ]);

        const score = likes.length * 2 + retweets.length * 3 + replies.length;
        if (score >= 2) { // Minimum threshold for popularity
          recommendations.push({
            article,
            score,
            reason: "Popular this week",
          });
        }
      }

      // Sort by score and limit results
      recommendations.sort((a, b) => b.score - a.score);
      const topRecommendations = recommendations.slice(0, 20);

      // Add feed titles
      const enrichedRecommendations = await Promise.all(
        topRecommendations.map(async (rec) => {
          const feed = await db.getFeedById(rec.article.feedId);
          return {
            ...rec,
            feedTitle: feed?.title || "Unknown Feed",
          };
        }),
      );

      return new Response(JSON.stringify(enrichedRecommendations), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate recommendations" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
