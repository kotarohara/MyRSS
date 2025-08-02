import { Handlers, PageProps } from "$fresh/server.ts";
import { Article, db } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import ArticleCard from "../components/ArticleCard.tsx";

interface SearchPageData {
  user: { id: string; username: string; email: string };
  query: string;
  articles: (Article & { feedTitle: string })[];
  totalResults: number;
}

export const handler: Handlers<SearchPageData> = {
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

    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";

    const articles: (Article & { feedTitle: string })[] = [];

    if (query.trim()) {
      // Get user's subscribed feeds
      const subscriptions = await db.getUserSubscriptions(user.id);
      const searchTerm = query.toLowerCase();

      for (const subscription of subscriptions) {
        const feed = await db.getFeedById(subscription.feedId);
        if (feed) {
          const feedArticles = await db.getArticlesByFeedId(feed.id);

          // Filter articles that match the search query
          const matchingArticles = feedArticles.filter((article) =>
            article.title.toLowerCase().includes(searchTerm) ||
            article.content.toLowerCase().includes(searchTerm)
          );

          for (const article of matchingArticles) {
            articles.push({ ...article, feedTitle: feed.title });
          }
        }
      }

      // Sort by relevance (title matches first, then by date)
      articles.sort((a, b) => {
        const aInTitle = a.title.toLowerCase().includes(searchTerm);
        const bInTitle = b.title.toLowerCase().includes(searchTerm);

        if (aInTitle && !bInTitle) return -1;
        if (!aInTitle && bInTitle) return 1;

        return b.publishedAt.getTime() - a.publishedAt.getTime();
      });
    }

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      query,
      articles,
      totalResults: articles.length,
    });
  },
};

export default function SearchPage({ data }: PageProps<SearchPageData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <a
                href="/"
                class="text-2xl font-bold text-gray-900 hover:text-indigo-600"
              >
                RSS Reader
              </a>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-500">
                Hello, {data.user.username}
              </span>
              <a
                href="/feeds"
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Manage Feeds
              </a>
              <button
                onclick="handleLogout()"
                class="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div class="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div class="px-4 py-5 sm:p-6">
            <h1 class="text-2xl font-bold text-gray-900 mb-4">
              Search Articles
            </h1>
            <form method="GET" class="flex space-x-2">
              <input
                type="text"
                name="q"
                value={data.query}
                placeholder="Search articles..."
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Search Results */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            {data.query
              ? (
                <>
                  <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold text-gray-900">
                      Search Results for "{data.query}"
                    </h2>
                    <span class="text-sm text-gray-500">
                      {data.totalResults}{" "}
                      result{data.totalResults !== 1 ? "s" : ""}
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
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">
                          No results found
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">
                          Try searching with different keywords or check if
                          you're subscribed to feeds.
                        </p>
                        <div class="mt-6">
                          <a
                            href="/feeds"
                            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Manage Feeds
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
                </>
              )
              : (
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">
                    Enter a search term
                  </h3>
                  <p class="mt-1 text-sm text-gray-500">
                    Search through all articles from your subscribed feeds.
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div class="mt-8 flex justify-center">
          <a
            href="/"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              class="mr-2 -ml-1 w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clip-rule="evenodd"
              />
            </svg>
            Back to Dashboard
          </a>
        </div>
      </div>

      <script>
        {`
          async function handleLogout() {
            try {
              const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                window.location.href = '/login';
              } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.');
              }
            } catch (error) {
              console.error('Network error during logout:', error);
              alert('Network error. Please try again.');
            }
          }
        `}
      </script>
    </div>
  );
}
