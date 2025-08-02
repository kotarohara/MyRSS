import { Handlers, PageProps } from "$fresh/server.ts";
import { Article, db, Feed } from "../../db.ts";
import { authService, getSessionCookie } from "../../utils/auth.ts";

interface ArticlePageData {
  user: { id: string; username: string; email: string };
  article: Article;
  feed: Feed;
}

export const handler: Handlers<ArticlePageData> = {
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

    const articleId = ctx.params.id;

    const article = await db.getArticleById(articleId);
    if (!article) {
      return new Response("Article not found", { status: 404 });
    }

    const feed = await db.getFeedById(article.feedId);
    if (!feed) {
      return new Response("Feed not found", { status: 404 });
    }

    // Check if user is subscribed to this feed
    const subscriptions = await db.getUserSubscriptions(user.id);
    const isSubscribed = subscriptions.some((sub) => sub.feedId === feed.id);

    if (!isSubscribed) {
      return new Response("Access denied: Not subscribed to this feed", {
        status: 403,
      });
    }

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      article,
      feed,
    });
  },
};

function sanitizeHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

export default function ArticlePage({ data }: PageProps<ArticlePageData>) {
  const sanitizedContent = sanitizeHtml(data.article.content);

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav class="flex mb-8" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 md:space-x-3">
            <li class="inline-flex items-center">
              <a
                href="/"
                class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </a>
            </li>
            <li>
              <div class="flex items-center">
                <svg
                  class="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <span class="ml-1 text-sm font-medium text-gray-500">
                  {data.feed.title}
                </span>
              </div>
            </li>
            <li aria-current="page">
              <div class="flex items-center">
                <svg
                  class="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <span class="ml-1 text-sm font-medium text-gray-500">
                  Article
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Article */}
        <article class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-6 py-8">
            {/* Article Header */}
            <div class="border-b border-gray-200 pb-6 mb-6">
              <div class="flex items-center text-sm text-gray-500 mb-3">
                <span class="font-medium text-indigo-600">
                  {data.feed.title}
                </span>
                <span class="mx-2">•</span>
                <time dateTime={data.article.publishedAt.toISOString()}>
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(data.article.publishedAt)}
                </time>
              </div>

              <h1 class="text-3xl font-bold text-gray-900 leading-tight mb-4">
                {data.article.title}
              </h1>

              <div class="flex items-center justify-between">
                <a
                  href={data.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Read Original Article
                  <svg
                    class="ml-2 -mr-1 w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Article Content */}
            <div class="prose prose-lg max-w-none">
              {sanitizedContent
                ? <div>{sanitizedContent}</div>
                : <p class="text-gray-500 italic">No content available</p>}
            </div>

            {/* Article Footer */}
            <div class="border-t border-gray-200 pt-6 mt-8">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500">
                  Article ID: {data.article.id}
                </div>
                <div class="flex items-center space-x-4">
                  <button
                    type="button"
                    class="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    class="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Bookmark
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Navigation */}
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
    </div>
  );
}
