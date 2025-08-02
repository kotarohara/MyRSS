import { Handlers, PageProps } from "$fresh/server.ts";
import { Article, db, Retweet, User } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import SocialArticleCard from "../components/SocialArticleCard.tsx";

interface SocialFeedItem {
  type: "article" | "retweet";
  article: Article & {
    feedTitle: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    userLiked: boolean;
    userRetweeted: boolean;
  };
  retweet?: Retweet & { user: User };
  timestamp: Date;
}

interface SocialFeedData {
  user: { id: string; username: string; email: string };
  feedItems: SocialFeedItem[];
  following: User[];
  popularArticles: (Article & {
    feedTitle: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    userLiked: boolean;
    userRetweeted: boolean;
  })[];
}

export const handler: Handlers<SocialFeedData> = {
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

    // Get users the current user is following
    const followingRelations = await db.getUserFollowing(user.id);
    const following: User[] = [];
    for (const relation of followingRelations) {
      const followedUser = await db.getUserById(relation.followingId);
      if (followedUser) following.push(followedUser);
    }

    // Get articles from subscribed feeds
    const subscriptions = await db.getUserSubscriptions(user.id);
    const feedItems: SocialFeedItem[] = [];

    for (const subscription of subscriptions) {
      const feed = await db.getFeedById(subscription.feedId);
      if (feed) {
        const articles = await db.getArticlesByFeedId(feed.id);
        for (const article of articles.slice(0, 10)) { // Limit articles per feed
          const [likes, retweets, replies, userLike, userRetweet] =
            await Promise.all([
              db.getArticleLikes(article.id),
              db.getArticleRetweets(article.id),
              db.getArticleReplies(article.id),
              db.getUserLike(user.id, article.id),
              db.getUserRetweet(user.id, article.id),
            ]);

          feedItems.push({
            type: "article",
            article: {
              ...article,
              feedTitle: feed.title,
              likeCount: likes.length,
              retweetCount: retweets.length,
              replyCount: replies.length,
              userLiked: !!userLike,
              userRetweeted: !!userRetweet,
            },
            timestamp: article.publishedAt,
          });
        }
      }
    }

    // Get retweets from followed users
    for (const followedUser of following) {
      const allArticles = await db.getAllArticles();
      for (const article of allArticles.slice(0, 50)) {
        const userRetweet = await db.getUserRetweet(
          followedUser.id,
          article.id,
        );
        if (userRetweet) {
          const feed = await db.getFeedById(article.feedId);
          if (feed) {
            const [
              likes,
              retweets,
              replies,
              currentUserLike,
              currentUserRetweet,
            ] = await Promise.all([
              db.getArticleLikes(article.id),
              db.getArticleRetweets(article.id),
              db.getArticleReplies(article.id),
              db.getUserLike(user.id, article.id),
              db.getUserRetweet(user.id, article.id),
            ]);

            feedItems.push({
              type: "retweet",
              article: {
                ...article,
                feedTitle: feed.title,
                likeCount: likes.length,
                retweetCount: retweets.length,
                replyCount: replies.length,
                userLiked: !!currentUserLike,
                userRetweeted: !!currentUserRetweet,
              },
              retweet: {
                ...userRetweet,
                user: followedUser,
              },
              timestamp: userRetweet.createdAt,
            });
          }
        }
      }
    }

    // Sort feed items by timestamp
    feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Get popular articles (most liked/retweeted in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allArticles = await db.getAllArticles();
    const popularArticles = [];

    for (const article of allArticles.filter((a) => a.publishedAt > weekAgo)) {
      const feed = await db.getFeedById(article.feedId);
      if (feed) {
        const [likes, retweets, replies, userLike, userRetweet] = await Promise
          .all([
            db.getArticleLikes(article.id),
            db.getArticleRetweets(article.id),
            db.getArticleReplies(article.id),
            db.getUserLike(user.id, article.id),
            db.getUserRetweet(user.id, article.id),
          ]);

        const socialScore = likes.length * 2 + retweets.length * 3 +
          replies.length;
        if (socialScore > 0) {
          popularArticles.push({
            ...article,
            feedTitle: feed.title,
            likeCount: likes.length,
            retweetCount: retweets.length,
            replyCount: replies.length,
            userLiked: !!userLike,
            userRetweeted: !!userRetweet,
            socialScore,
          });
        }
      }
    }

    popularArticles.sort((a, b) => b.socialScore - a.socialScore);

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      feedItems: feedItems.slice(0, 50), // Limit feed items
      following,
      popularArticles: popularArticles.slice(0, 10),
    });
  },
};

export default function SocialFeed({ data }: PageProps<SocialFeedData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center space-x-8">
              <h1 class="text-2xl font-bold text-gray-900">Social Feed</h1>
              <nav class="flex space-x-4">
                <a href="/" class="text-gray-500 hover:text-gray-700">Home</a>
                <a href="/social" class="text-indigo-600 font-medium">Social</a>
                <a href="/feeds" class="text-gray-500 hover:text-gray-700">
                  Feeds
                </a>
                <a href="/search" class="text-gray-500 hover:text-gray-700">
                  Search
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
          <div class="lg:col-span-1 space-y-6">
            {/* Following */}
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Following ({data.following.length})
                </h3>
                {data.following.length === 0
                  ? (
                    <p class="text-gray-500 text-sm">
                      Find users to follow to see their activity in your feed.
                    </p>
                  )
                  : (
                    <div class="space-y-3">
                      {data.following.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          class="flex items-center justify-between"
                        >
                          <span class="text-sm font-medium text-gray-900">
                            {user.username}
                          </span>
                        </div>
                      ))}
                      {data.following.length > 5 && (
                        <p class="text-xs text-gray-500">
                          and {data.following.length - 5} more...
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Popular This Week */}
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Popular This Week
                </h3>
                {data.popularArticles.length === 0
                  ? (
                    <p class="text-gray-500 text-sm">
                      No popular articles this week.
                    </p>
                  )
                  : (
                    <div class="space-y-3">
                      {data.popularArticles.slice(0, 3).map((article) => (
                        <div
                          key={article.id}
                          class="p-3 border border-gray-200 rounded-md"
                        >
                          <a href={`/article/${article.id}`} class="block">
                            <p class="text-sm font-medium text-gray-900 line-clamp-2 hover:text-indigo-600">
                              {article.title}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                              {article.likeCount} likes, {article.retweetCount}
                              {" "}
                              retweets
                            </p>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div class="lg:col-span-3">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6">
                  Social Timeline
                </h2>

                {data.feedItems.length === 0
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
                          d="M17 20h5v-2a3 3 0 00-5.196-2.196M13 8.5A2.5 2.5 0 1115.5 6M7 8h10l4 8H3l4-8z"
                        />
                      </svg>
                      <h3 class="mt-2 text-sm font-medium text-gray-900">
                        No social activity
                      </h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Follow users and subscribe to feeds to see activity
                        here.
                      </p>
                    </div>
                  )
                  : (
                    <div class="space-y-6">
                      {data.feedItems.map((item, index) => (
                        <div key={`${item.type}-${item.article.id}-${index}`}>
                          {item.type === "retweet" && item.retweet && (
                            <div class="flex items-center mb-2 text-sm text-gray-500">
                              <svg
                                class="w-4 h-4 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              {item.retweet.user.username} retweeted
                              {item.retweet.comment && (
                                <span class="ml-2 text-gray-700">
                                  "{item.retweet.comment}"
                                </span>
                              )}
                            </div>
                          )}
                          <SocialArticleCard
                            article={item.article}
                            userId={data.user.id}
                            likeCount={item.article.likeCount}
                            retweetCount={item.article.retweetCount}
                            replyCount={item.article.replyCount}
                            userLiked={item.article.userLiked}
                            userRetweeted={item.article.userRetweeted}
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
