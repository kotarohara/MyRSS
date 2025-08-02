/// <reference lib="deno.unstable" />

export const kv = await Deno.openKv();

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Feed {
  id: string;
  url: string;
  title: string;
  description: string;
  lastFetched?: Date;
  createdAt: Date;
}

export interface Article {
  id: string;
  feedId: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  guid: string;
  createdAt: Date;
}

export interface Subscription {
  userId: string;
  feedId: string;
  createdAt: Date;
}

export interface Like {
  userId: string;
  articleId: string;
  createdAt: Date;
}

export interface Retweet {
  userId: string;
  articleId: string;
  comment?: string;
  createdAt: Date;
}

export interface Reply {
  id: string;
  userId: string;
  articleId: string;
  content: string;
  createdAt: Date;
}

export class Database {
  public kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = crypto.randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date(),
    };

    await this.kv.set(["user", id], newUser);
    await this.kv.set(["user_by_email", user.email], newUser);
    await this.kv.set(["user_by_username", user.username], newUser);

    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.kv.get<User>(["user", id]);
    return result.value;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.kv.get<User>(["user_by_email", email]);
    return result.value;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.kv.get<User>(["user_by_username", username]);
    return result.value;
  }

  async createFeed(feed: Omit<Feed, "id" | "createdAt">): Promise<Feed> {
    const id = crypto.randomUUID();
    const newFeed: Feed = {
      ...feed,
      id,
      createdAt: new Date(),
    };

    await this.kv.set(["feed", id], newFeed);
    await this.kv.set(["feed_by_url", feed.url], newFeed);

    return newFeed;
  }

  async getFeedById(id: string): Promise<Feed | null> {
    const result = await this.kv.get<Feed>(["feed", id]);
    return result.value;
  }

  async getFeedByUrl(url: string): Promise<Feed | null> {
    const result = await this.kv.get<Feed>(["feed_by_url", url]);
    return result.value;
  }

  async createArticle(
    article: Omit<Article, "id" | "createdAt">,
  ): Promise<Article> {
    const id = crypto.randomUUID();
    const newArticle: Article = {
      ...article,
      id,
      createdAt: new Date(),
    };

    await this.kv.set(["article", id], newArticle);
    await this.kv.set(["article_by_guid", article.guid], newArticle);
    await this.kv.set(["feed_articles", article.feedId, id], newArticle);

    return newArticle;
  }

  async getArticleById(id: string): Promise<Article | null> {
    const result = await this.kv.get<Article>(["article", id]);
    return result.value;
  }

  async getArticleByGuid(guid: string): Promise<Article | null> {
    const result = await this.kv.get<Article>(["article_by_guid", guid]);
    return result.value;
  }

  async getArticlesByFeedId(feedId: string): Promise<Article[]> {
    const articles: Article[] = [];
    const iter = this.kv.list<Article>({ prefix: ["feed_articles", feedId] });

    for await (const { value } of iter) {
      articles.push(value);
    }

    return articles.sort((a, b) =>
      b.publishedAt.getTime() - a.publishedAt.getTime()
    );
  }

  async createSubscription(subscription: Subscription): Promise<void> {
    await this.kv.set([
      "subscription",
      subscription.userId,
      subscription.feedId,
    ], subscription);
    await this.kv.set([
      "user_subscriptions",
      subscription.userId,
      subscription.feedId,
    ], subscription);
  }

  async deleteSubscription(userId: string, feedId: string): Promise<void> {
    await this.kv.delete(["subscription", userId, feedId]);
    await this.kv.delete(["user_subscriptions", userId, feedId]);
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const subscriptions: Subscription[] = [];
    const iter = this.kv.list<Subscription>({
      prefix: ["user_subscriptions", userId],
    });

    for await (const { value } of iter) {
      subscriptions.push(value);
    }

    return subscriptions;
  }

  async createLike(like: Like): Promise<void> {
    await this.kv.set(["like", like.userId, like.articleId], like);
    await this.kv.set(["article_likes", like.articleId, like.userId], like);
  }

  async deleteLike(userId: string, articleId: string): Promise<void> {
    await this.kv.delete(["like", userId, articleId]);
    await this.kv.delete(["article_likes", articleId, userId]);
  }

  async getUserLike(userId: string, articleId: string): Promise<Like | null> {
    const result = await this.kv.get<Like>(["like", userId, articleId]);
    return result.value;
  }

  async getArticleLikes(articleId: string): Promise<Like[]> {
    const likes: Like[] = [];
    const iter = this.kv.list<Like>({ prefix: ["article_likes", articleId] });

    for await (const { value } of iter) {
      likes.push(value);
    }

    return likes;
  }

  async createRetweet(retweet: Retweet): Promise<void> {
    await this.kv.set(["retweet", retweet.userId, retweet.articleId], retweet);
    await this.kv.set(
      ["article_retweets", retweet.articleId, retweet.userId],
      retweet,
    );
  }

  async deleteRetweet(userId: string, articleId: string): Promise<void> {
    await this.kv.delete(["retweet", userId, articleId]);
    await this.kv.delete(["article_retweets", articleId, userId]);
  }

  async getUserRetweet(
    userId: string,
    articleId: string,
  ): Promise<Retweet | null> {
    const result = await this.kv.get<Retweet>(["retweet", userId, articleId]);
    return result.value;
  }

  async getArticleRetweets(articleId: string): Promise<Retweet[]> {
    const retweets: Retweet[] = [];
    const iter = this.kv.list<Retweet>({
      prefix: ["article_retweets", articleId],
    });

    for await (const { value } of iter) {
      retweets.push(value);
    }

    return retweets;
  }

  async createReply(reply: Omit<Reply, "id" | "createdAt">): Promise<Reply> {
    const id = crypto.randomUUID();
    const newReply: Reply = {
      ...reply,
      id,
      createdAt: new Date(),
    };

    await this.kv.set(["reply", id], newReply);
    await this.kv.set(["article_replies", reply.articleId, id], newReply);

    return newReply;
  }

  async getReplyById(id: string): Promise<Reply | null> {
    const result = await this.kv.get<Reply>(["reply", id]);
    return result.value;
  }

  async getArticleReplies(articleId: string): Promise<Reply[]> {
    const replies: Reply[] = [];
    const iter = this.kv.list<Reply>({
      prefix: ["article_replies", articleId],
    });

    for await (const { value } of iter) {
      replies.push(value);
    }

    return replies.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async getAllFeeds(): Promise<Feed[]> {
    const feeds: Feed[] = [];
    const iter = this.kv.list<Feed>({ prefix: ["feed"] });

    for await (const { value } of iter) {
      if (value && typeof value === "object" && "id" in value) {
        feeds.push(value as Feed);
      }
    }

    return feeds;
  }

  async updateFeed(feed: Feed): Promise<void> {
    await this.kv.set(["feed", feed.id], feed);
    await this.kv.set(["feed_by_url", feed.url], feed);
  }
}

export const db = new Database(kv);
