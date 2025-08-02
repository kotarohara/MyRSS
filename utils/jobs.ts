import { db } from "../db.ts";
import { rssFetcher } from "./rss.ts";

export class FeedUpdateService {
  private updateInterval: number;
  private isRunning = false;
  private intervalId?: number;

  constructor(updateInterval = 30 * 60 * 1000) { // 30 minutes default
    this.updateInterval = updateInterval;
  }

  async updateAllFeeds(): Promise<void> {
    console.log("Starting feed update job...");

    try {
      const feeds = await db.getAllFeeds();
      console.log(`Found ${feeds.length} feeds to update`);

      for (const feed of feeds) {
        try {
          await this.updateFeed(feed.id);
          console.log(`Successfully updated feed: ${feed.title}`);
        } catch (error) {
          console.error(
            `Failed to update feed ${feed.title}:`,
            (error as Error).message,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Feed update job completed");
    } catch (error) {
      console.error("Feed update job failed:", error);
    }
  }

  async updateFeed(feedId: string): Promise<void> {
    const feed = await db.getFeedById(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    try {
      const rssFeed = await rssFetcher.fetchFeed(feed.url);

      let newArticlesCount = 0;

      for (const item of rssFeed.items) {
        const existingArticle = await db.getArticleByGuid(item.guid);

        if (!existingArticle) {
          await db.createArticle({
            feedId: feed.id,
            title: item.title,
            content: item.content,
            url: item.url,
            publishedAt: item.publishedAt,
            guid: item.guid,
          });
          newArticlesCount++;
        }
      }

      const updatedFeed = {
        ...feed,
        title: rssFeed.title || feed.title,
        description: rssFeed.description || feed.description,
        lastFetched: new Date(),
      };

      await db.updateFeed(updatedFeed);

      console.log(
        `Added ${newArticlesCount} new articles for feed: ${feed.title}`,
      );
    } catch (error) {
      console.error(
        `Error updating feed ${feed.title}:`,
        (error as Error).message,
      );
      throw error;
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log("Feed update service is already running");
      return;
    }

    console.log(
      `Starting feed update service with ${
        this.updateInterval / 1000
      }s interval`,
    );
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.updateAllFeeds().catch((error) => {
        console.error("Scheduled feed update failed:", error);
      });
    }, this.updateInterval);

    this.updateAllFeeds().catch((error) => {
      console.error("Initial feed update failed:", error);
    });
  }

  stop(): void {
    if (!this.isRunning) {
      console.log("Feed update service is not running");
      return;
    }

    console.log("Stopping feed update service");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  getStatus(): { isRunning: boolean; updateInterval: number } {
    return {
      isRunning: this.isRunning,
      updateInterval: this.updateInterval,
    };
  }
}

export const feedUpdateService = new FeedUpdateService();
