import { Handlers } from "$fresh/server.ts";
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

      const { websiteUrl } = await req.json();

      if (!websiteUrl || typeof websiteUrl !== "string") {
        return new Response(
          JSON.stringify({ error: "Website URL is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      try {
        // Validate URL format
        new URL(websiteUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid URL format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const feedUrls = await rssFetcher.discoverFeeds(websiteUrl);

      return new Response(
        JSON.stringify({
          success: true,
          feedUrls,
          message: `Found ${feedUrls.length} feed(s)`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Feed discovery error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Failed to discover feeds",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
