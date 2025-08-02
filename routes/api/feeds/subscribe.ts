import { Handlers } from "$fresh/server.ts";
import { db } from "../../../db.ts";
import { authService, getSessionCookie } from "../../../utils/auth.ts";
import { rssFetcher } from "../../../utils/rss.ts";

export const handler: Handlers = {
  async POST(req) {
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

      const { feedUrl } = await req.json();

      if (!feedUrl || typeof feedUrl !== "string") {
        return new Response(JSON.stringify({ error: "Feed URL is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if feed already exists
      let feed = await db.getFeedByUrl(feedUrl);

      if (!feed) {
        // Validate and fetch the RSS feed
        try {
          const rssData = await rssFetcher.fetchFeed(feedUrl);

          // Create new feed
          feed = await db.createFeed({
            url: feedUrl,
            title: rssData.title,
            description: rssData.description,
          });
        } catch (fetchError) {
          return new Response(
            JSON.stringify({
              error: `Invalid RSS feed: ${
                fetchError instanceof Error
                  ? fetchError.message
                  : "Failed to parse feed"
              }`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Check if user is already subscribed
      const existingSubscription = await db.getUserSubscriptions(user.id);
      const isAlreadySubscribed = existingSubscription.some((sub) =>
        sub.feedId === feed!.id
      );

      if (isAlreadySubscribed) {
        return new Response(
          JSON.stringify({ error: "Already subscribed to this feed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Subscribe user to the feed
      await db.createSubscription({
        userId: user.id,
        feedId: feed.id,
        createdAt: new Date(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Successfully subscribed to feed",
          feed: {
            id: feed.id,
            title: feed.title,
            url: feed.url,
            description: feed.description,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Subscribe error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Failed to subscribe to feed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
