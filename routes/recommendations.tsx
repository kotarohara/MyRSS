import { Handlers, PageProps } from "$fresh/server.ts";
import { Article, db } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import SocialArticleCard from "../components/SocialArticleCard.tsx";

interface RecommendationItem {
  article: Article & {
    feedTitle: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    userLiked: boolean;
    userRetweeted: boolean;
  };
  score: number;
  reason: string;
}

interface RecommendationsData {
  user: { id: string; username: string; email: string };
  recommendations: RecommendationItem[];
  readHistory: Array<{
    article: Article;
    feedTitle: string;
    readAt: Date;
  }>;
}

export const handler: Handlers<RecommendationsData> = {
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

    // Get recommendations via API
    const recommendationsResponse = await fetch(
      `${req.url.split("/recommendations")[0]}/api/recommendations`,
      {
        headers: { Cookie: req.headers.get("Cookie") || "" },
      },
    );

    let recommendations: RecommendationItem[] = [];
    if (recommendationsResponse.ok) {
      const rawRecommendations = await recommendationsResponse.json();

      // Enrich recommendations with social data
      recommendations = await Promise.all(
        rawRecommendations.map(
          async (
            rec: {
              article: Article;
              score: number;
              reason: string;
              feedTitle: string;
            },
          ) => {
            const [likes, retweets, replies, userLike, userRetweet] =
              await Promise.all([
                db.getArticleLikes(rec.article.id),
                db.getArticleRetweets(rec.article.id),
                db.getArticleReplies(rec.article.id),
                db.getUserLike(user.id, rec.article.id),
                db.getUserRetweet(user.id, rec.article.id),
              ]);

            return {
              article: {
                ...rec.article,
                feedTitle: rec.feedTitle,
                likeCount: likes.length,
                retweetCount: retweets.length,
                replyCount: replies.length,
                userLiked: !!userLike,
                userRetweeted: !!userRetweet,
              },
              score: rec.score,
              reason: rec.reason,
            };
          },
        ),
      );
    }

    // Get recent read history
    const readHistory = await db.getUserReadHistory(user.id);
    const recentReadHistory = await Promise.all(
      readHistory.slice(0, 10).map(async (history) => {
        const article = await db.getArticleById(history.articleId);
        const feed = article ? await db.getFeedById(article.feedId) : null;
        return {
          article: article!,
          feedTitle: feed?.title || "Unknown Feed",
          readAt: history.readAt,
        };
      }),
    );

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      recommendations: recommendations.slice(0, 15),
      readHistory: recentReadHistory.filter((h) => h.article),
    });
  },
};

export default function Recommendations(
  { data }: PageProps<RecommendationsData>,
) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center space-x-8">
              <h1 class="text-2xl font-bold text-gray-900">Recommendations</h1>
              <nav class="flex space-x-4">
                <a href="/" class="text-gray-500 hover:text-gray-700">Home</a>
                <a href="/social" class="text-gray-500 hover:text-gray-700">
                  Social
                </a>
                <a href="/feeds" class="text-gray-500 hover:text-gray-700">
                  Feeds
                </a>
                <a href="/users" class="text-gray-500 hover:text-gray-700">
                  Users
                </a>
                <a href="/recommendations" class="text-indigo-600 font-medium">
                  Recommendations
                </a>
              </nav>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-500">
                Hello, {data.user.username}
              </span>
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

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div class="lg:col-span-1">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Recent Reads
                </h3>
                {data.readHistory.length === 0
                  ? <p class="text-gray-500 text-sm">No reading history yet.</p>
                  : (
                    <div class="space-y-3">
                      {data.readHistory.slice(0, 5).map((item) => (
                        <div
                          key={item.article.id}
                          class="p-3 border border-gray-200 rounded-md"
                        >
                          <a href={`/article/${item.article.id}`} class="block">
                            <p class="text-sm font-medium text-gray-900 line-clamp-2 hover:text-indigo-600">
                              {item.article.title}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                              {item.feedTitle}
                            </p>
                            <p class="text-xs text-gray-400 mt-1">
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(item.readAt)}
                            </p>
                          </a>
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
                <h2 class="text-xl font-semibold text-gray-900 mb-6">
                  Recommended for You
                </h2>

                {data.recommendations.length === 0
                  ? (
                    <div class="text-center py-12">
                      <svg
                        class="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <h3 class="mt-2 text-sm font-medium text-gray-900">
                        No recommendations yet
                      </h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Read more articles and interact with content to get
                        personalized recommendations.
                      </p>
                    </div>
                  )
                  : (
                    <div class="space-y-8">
                      {data.recommendations.map((recommendation) => (
                        <div
                          key={recommendation.article.id}
                          class="border-b border-gray-200 pb-6 last:border-b-0"
                        >
                          <div class="flex items-center mb-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {recommendation.reason}
                            </span>
                            <span class="ml-2 text-xs text-gray-500">
                              Score: {recommendation.score}
                            </span>
                          </div>
                          <SocialArticleCard
                            article={recommendation.article}
                            userId={data.user.id}
                            likeCount={recommendation.article.likeCount}
                            retweetCount={recommendation.article.retweetCount}
                            replyCount={recommendation.article.replyCount}
                            userLiked={recommendation.article.userLiked}
                            userRetweeted={recommendation.article.userRetweeted}
                          />
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
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
