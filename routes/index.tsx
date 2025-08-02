import { Handlers, PageProps } from "$fresh/server.ts";
import { Article, db, Feed } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import ArticleCard from "../components/ArticleCard.tsx";

interface DashboardData {
  user: { id: string; username: string; email: string };
  userFeeds: Feed[];
  articles: (Article & { feedTitle: string })[];
  totalArticles: number;
}

export const handler: Handlers<DashboardData> = {
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
    const articles: (Article & { feedTitle: string })[] = [];

    for (const subscription of subscriptions) {
      const feed = await db.getFeedById(subscription.feedId);
      if (feed) {
        userFeeds.push(feed);
        const feedArticles = await db.getArticlesByFeedId(feed.id);
        for (const article of feedArticles) {
          articles.push({ ...article, feedTitle: feed.title });
        }
      }
    }

    // Sort articles by published date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    // Limit to latest 50 articles for dashboard
    const limitedArticles = articles.slice(0, 50);

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      userFeeds,
      articles: limitedArticles,
      totalArticles: articles.length,
    });
  },
};

export default function Dashboard({ data }: PageProps<DashboardData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">RSS Reader</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-500">
                Hello, {data.user.username}
              </span>
              <a
                href="/search"
                class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Search
              </a>
              <a
                href="/feeds"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Manage Feeds
              </a>
              <a
                href="/api/auth/logout"
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div class="lg:col-span-1">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Your Feeds ({data.userFeeds.length})
                </h3>
                {data.userFeeds.length === 0
                  ? (
                    <div class="text-center">
                      <p class="text-gray-500 text-sm mb-4">
                        No feeds subscribed yet.
                      </p>
                      <a
                        href="/feeds"
                        class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Add Your First Feed
                      </a>
                    </div>
                  )
                  : (
                    <div class="space-y-3">
                      {data.userFeeds.map((feed) => (
                        <div
                          key={feed.id}
                          class="p-3 border border-gray-200 rounded-md"
                        >
                          <p class="text-sm font-medium text-gray-900 truncate">
                            {feed.title}
                          </p>
                          <p class="text-xs text-gray-500 truncate">
                            {feed.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div class="lg:col-span-3">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex justify-between items-center mb-6">
                  <h2 class="text-xl font-semibold text-gray-900">
                    Latest Articles
                  </h2>
                  <span class="text-sm text-gray-500">
                    {data.totalArticles} total articles
                  </span>
                </div>

                {data.articles.length === 0
                  ? (
                    <div class="text-center py-12">
                      <svg
                        class="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                      <h3 class="mt-2 text-sm font-medium text-gray-900">
                        No articles
                      </h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Subscribe to feeds to see articles here.
                      </p>
                      <div class="mt-6">
                        <a
                          href="/feeds"
                          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Add Feed
                        </a>
                      </div>
                    </div>
                  )
                  : (
                    <div class="space-y-6">
                      {data.articles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
