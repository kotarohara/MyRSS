import { Handlers, PageProps } from "$fresh/server.ts";
import { db, Feed } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import { rssFetcher } from "../utils/rss.ts";

interface FeedsPageData {
  user: { id: string; username: string; email: string };
  userFeeds: Feed[];
  allFeeds: Feed[];
  error?: string;
  success?: string;
}

export const handler: Handlers<FeedsPageData> = {
  async GET(req, ctx) {
    const sessionId = getSessionCookie(req);
    if (!sessionId) {
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const user = await authService.getUserFromSession(sessionId);
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const subscriptions = await db.getUserSubscriptions(user.id);
    const userFeeds: Feed[] = [];

    for (const subscription of subscriptions) {
      const feed = await db.getFeedById(subscription.feedId);
      if (feed) {
        userFeeds.push(feed);
      }
    }

    const allFeeds = await db.getAllFeeds();

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      userFeeds,
      allFeeds,
    });
  },

  async POST(req, ctx) {
    const sessionId = getSessionCookie(req);
    if (!sessionId) {
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const user = await authService.getUserFromSession(sessionId);
    if (!user) {
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const form = await req.formData();
    const action = form.get("action")?.toString();
    const feedUrl = form.get("feedUrl")?.toString();

    if (action === "add" && feedUrl) {
      try {
        // Check if feed already exists
        let feed = await db.getFeedByUrl(feedUrl);

        if (!feed) {
          // Validate and fetch the RSS feed
          const isValid = await rssFetcher.validateFeedUrl(feedUrl);
          if (!isValid) {
            throw new Error("Invalid RSS feed URL");
          }

          const rssData = await rssFetcher.fetchFeed(feedUrl);

          // Create new feed
          feed = await db.createFeed({
            url: feedUrl,
            title: rssData.title,
            description: rssData.description,
          });
        }

        // Subscribe user to the feed
        await db.createSubscription({
          userId: user.id,
          feedId: feed.id,
          createdAt: new Date(),
        });

        const subscriptions = await db.getUserSubscriptions(user.id);
        const userFeeds: Feed[] = [];

        for (const subscription of subscriptions) {
          const subscribedFeed = await db.getFeedById(subscription.feedId);
          if (subscribedFeed) {
            userFeeds.push(subscribedFeed);
          }
        }

        const allFeeds = await db.getAllFeeds();

        return ctx.render({
          user: { id: user.id, username: user.username, email: user.email },
          userFeeds,
          allFeeds,
          success: "Successfully subscribed to feed!",
        });
      } catch (error) {
        const subscriptions = await db.getUserSubscriptions(user.id);
        const userFeeds: Feed[] = [];

        for (const subscription of subscriptions) {
          const subscribedFeed = await db.getFeedById(subscription.feedId);
          if (subscribedFeed) {
            userFeeds.push(subscribedFeed);
          }
        }

        const allFeeds = await db.getAllFeeds();

        return ctx.render({
          user: { id: user.id, username: user.username, email: user.email },
          userFeeds,
          allFeeds,
          error: `Failed to add feed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }

    if (action === "unsubscribe") {
      const feedId = form.get("feedId")?.toString();
      if (feedId) {
        try {
          await db.deleteSubscription(user.id, feedId);

          const subscriptions = await db.getUserSubscriptions(user.id);
          const userFeeds: Feed[] = [];

          for (const subscription of subscriptions) {
            const subscribedFeed = await db.getFeedById(subscription.feedId);
            if (subscribedFeed) {
              userFeeds.push(subscribedFeed);
            }
          }

          const allFeeds = await db.getAllFeeds();

          return ctx.render({
            user: { id: user.id, username: user.username, email: user.email },
            userFeeds,
            allFeeds,
            success: "Successfully unsubscribed from feed!",
          });
        } catch (_error) {
          const subscriptions = await db.getUserSubscriptions(user.id);
          const userFeeds: Feed[] = [];

          for (const subscription of subscriptions) {
            const subscribedFeed = await db.getFeedById(subscription.feedId);
            if (subscribedFeed) {
              userFeeds.push(subscribedFeed);
            }
          }

          const allFeeds = await db.getAllFeeds();

          return ctx.render({
            user: { id: user.id, username: user.username, email: user.email },
            userFeeds,
            allFeeds,
            error: "Failed to unsubscribe from feed",
          });
        }
      }
    }

    return new Response("", {
      status: 302,
      headers: { Location: "/feeds" },
    });
  },
};

export default function FeedsPage({ data }: PageProps<FeedsPageData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-8">
          <div class="md:flex md:items-center md:justify-between">
            <div class="min-w-0 flex-1">
              <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                RSS Feeds
              </h2>
            </div>
            <div class="mt-4 flex md:ml-4 md:mt-0">
              <a
                href="/"
                class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Back to Dashboard
              </a>
            </div>
          </div>

          {data.error && (
            <div class="mt-4 rounded-md bg-red-50 p-4">
              <div class="text-sm text-red-700">{data.error}</div>
            </div>
          )}

          {data.success && (
            <div class="mt-4 rounded-md bg-green-50 p-4">
              <div class="text-sm text-green-700">{data.success}</div>
            </div>
          )}

          <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Add Feed Form */}
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Add New Feed
                </h3>
                <form method="POST" class="space-y-4">
                  <input type="hidden" name="action" value="add" />
                  <div>
                    <label
                      htmlFor="feedUrl"
                      class="block text-sm font-medium text-gray-700"
                    >
                      RSS Feed URL
                    </label>
                    <input
                      type="url"
                      name="feedUrl"
                      id="feedUrl"
                      required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="https://example.com/feed.xml"
                    />
                  </div>
                  <button
                    type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Subscribe to Feed
                  </button>
                </form>
              </div>
            </div>

            {/* Subscribed Feeds */}
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Your Subscriptions ({data.userFeeds.length})
                </h3>
                {data.userFeeds.length === 0
                  ? (
                    <p class="text-gray-500 text-sm">
                      No subscriptions yet. Add a feed to get started!
                    </p>
                  )
                  : (
                    <div class="space-y-3">
                      {data.userFeeds.map((feed) => (
                        <div
                          key={feed.id}
                          class="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                        >
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                              {feed.title}
                            </p>
                            <p class="text-sm text-gray-500 truncate">
                              {feed.url}
                            </p>
                          </div>
                          <form method="POST" class="ml-3">
                            <input
                              type="hidden"
                              name="action"
                              value="unsubscribe"
                            />
                            <input
                              type="hidden"
                              name="feedId"
                              value={feed.id}
                            />
                            <button
                              type="submit"
                              class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Unsubscribe
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* All Available Feeds */}
          {data.allFeeds.length > 0 && (
            <div class="mt-8 bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  All Available Feeds ({data.allFeeds.length})
                </h3>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.allFeeds.map((feed) => {
                    const isSubscribed = data.userFeeds.some((userFeed) =>
                      userFeed.id === feed.id
                    );
                    return (
                      <div
                        key={feed.id}
                        class="border border-gray-200 rounded-md p-4"
                      >
                        <h4 class="text-sm font-medium text-gray-900 truncate">
                          {feed.title}
                        </h4>
                        <p class="mt-1 text-xs text-gray-500 truncate">
                          {feed.description}
                        </p>
                        <p class="mt-1 text-xs text-gray-400 truncate">
                          {feed.url}
                        </p>
                        {!isSubscribed && (
                          <form method="POST" class="mt-3">
                            <input type="hidden" name="action" value="add" />
                            <input
                              type="hidden"
                              name="feedUrl"
                              value={feed.url}
                            />
                            <button
                              type="submit"
                              class="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Subscribe
                            </button>
                          </form>
                        )}
                        {isSubscribed && (
                          <div class="mt-3 w-full inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                            Subscribed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
