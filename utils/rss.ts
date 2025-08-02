export interface RSSItem {
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  guid: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  url: string;
  items: RSSItem[];
}

export class RSSParser {
  private sanitizeContent(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim();
  }

  private parseDate(dateString: string): Date {
    if (!dateString) return new Date();

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }

  parseFeed(feedContent: string): RSSFeed {
    try {
      // Basic XML parsing using regex
      const isAtom = feedContent.includes("<feed");
      const isRSS = feedContent.includes("<rss") ||
        feedContent.includes("<channel>");

      if (!isAtom && !isRSS) {
        throw new Error("Not a valid RSS or Atom feed");
      }

      let title = "";
      let description = "";
      let url = "";
      const items: RSSItem[] = [];

      if (isRSS) {
        // Extract channel info
        const channelMatch = feedContent.match(
          /<channel[^>]*>([\s\S]*?)<\/channel>/i,
        );
        if (channelMatch) {
          const channelContent = channelMatch[1];

          // Extract title
          const titleMatch = channelContent.match(
            /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([^<]+)<\/title>/i,
          );
          if (titleMatch) {
            title = titleMatch[1] || titleMatch[2] || "";
          }

          // Extract description
          const descMatch = channelContent.match(
            /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([^<]+)<\/description>/i,
          );
          if (descMatch) {
            description = descMatch[1] || descMatch[2] || "";
          }

          // Extract link
          const linkMatch = channelContent.match(/<link>([^<]+)<\/link>/i);
          if (linkMatch) {
            url = linkMatch[1] || "";
          }
        }

        // Extract items
        const itemMatches = feedContent.matchAll(/<item>([\s\S]*?)<\/item>/gi);
        for (const match of itemMatches) {
          const itemContent = match[1];

          // Extract item title
          const itemTitleMatch = itemContent.match(
            /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([^<]+)<\/title>/i,
          );
          const itemTitle = itemTitleMatch
            ? (itemTitleMatch[1] || itemTitleMatch[2] || "")
            : "";

          // Extract item description/content
          const itemDescMatch = itemContent.match(
            /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([^<]+)<\/description>/i,
          );
          const itemContent2 = itemDescMatch
            ? (itemDescMatch[1] || itemDescMatch[2] || "")
            : "";

          // Extract item link
          const itemLinkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
          const itemUrl = itemLinkMatch ? itemLinkMatch[1] : "";

          // Extract guid
          const guidMatch = itemContent.match(/<guid[^>]*>([^<]+)<\/guid>/i);
          const guid = guidMatch ? guidMatch[1] : itemUrl;

          // Extract pubDate
          const pubDateMatch = itemContent.match(
            /<pubDate>([^<]+)<\/pubDate>/i,
          );
          const publishedAt = pubDateMatch
            ? this.parseDate(pubDateMatch[1])
            : new Date();

          if (itemTitle && itemUrl) {
            items.push({
              title: this.sanitizeContent(itemTitle),
              content: this.sanitizeContent(itemContent2),
              url: itemUrl.trim(),
              publishedAt,
              guid: guid.trim(),
            });
          }
        }
      } else if (isAtom) {
        // Handle Atom feeds
        const feedMatch = feedContent.match(/<feed[^>]*>([\s\S]*)<\/feed>/i);
        if (feedMatch) {
          const feedEl = feedMatch[1];

          // Extract title
          const titleMatch = feedEl.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1] || "";
          }

          // Extract subtitle (description)
          const subtitleMatch = feedEl.match(
            /<subtitle[^>]*>([^<]+)<\/subtitle>/i,
          );
          if (subtitleMatch) {
            description = subtitleMatch[1] || "";
          }

          // Extract link
          const linkMatch = feedEl.match(/<link[^>]*href="([^"]+)"[^>]*\/>/i);
          if (linkMatch) {
            url = linkMatch[1] || "";
          }
        }

        // Extract entries
        const entryMatches = feedContent.matchAll(
          /<entry>([\s\S]*?)<\/entry>/gi,
        );
        for (const match of entryMatches) {
          const entryContent = match[1];

          // Extract entry title
          const entryTitleMatch = entryContent.match(
            /<title[^>]*>([^<]+)<\/title>/i,
          );
          const entryTitle = entryTitleMatch ? entryTitleMatch[1] : "";

          // Extract entry content/summary
          const contentMatch = entryContent.match(
            /<content[^>]*>([\s\S]*?)<\/content>|<summary[^>]*>([\s\S]*?)<\/summary>/i,
          );
          const entryContent2 = contentMatch
            ? (contentMatch[1] || contentMatch[2] || "")
            : "";

          // Extract entry link
          const linkMatch = entryContent.match(
            /<link[^>]*href="([^"]+)"[^>]*\/>/i,
          );
          const entryUrl = linkMatch ? linkMatch[1] : "";

          // Extract id (guid)
          const idMatch = entryContent.match(/<id>([^<]+)<\/id>/i);
          const guid = idMatch ? idMatch[1] : entryUrl;

          // Extract published/updated date
          const dateMatch = entryContent.match(
            /<published>([^<]+)<\/published>|<updated>([^<]+)<\/updated>/i,
          );
          const publishedAt = dateMatch
            ? this.parseDate(dateMatch[1] || dateMatch[2])
            : new Date();

          if (entryTitle && entryUrl) {
            items.push({
              title: this.sanitizeContent(entryTitle),
              content: this.sanitizeContent(entryContent2),
              url: entryUrl.trim(),
              publishedAt,
              guid: guid.trim(),
            });
          }
        }
      }

      return {
        title: this.sanitizeContent(title || "Unknown Feed"),
        description: this.sanitizeContent(description || ""),
        url: url.trim(),
        items,
      };
    } catch (error) {
      throw new Error(`RSS parsing failed: ${(error as Error).message}`);
    }
  }
}

export class RSSFetcher {
  private parser = new RSSParser();

  async fetchFeed(feedUrl: string): Promise<RSSFeed> {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "MyRSS Reader/1.0",
          "Accept":
            "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("xml") && !contentType.includes("rss") &&
        !contentType.includes("atom")
      ) {
        console.warn(`Unexpected content type: ${contentType}`);
      }

      const feedContent = await response.text();

      if (!feedContent.trim()) {
        throw new Error("Empty feed content");
      }

      return this.parser.parseFeed(feedContent);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to fetch feed");
      }

      if ((error as Error).name === "AbortError") {
        throw new Error("Request timeout: Feed took too long to respond");
      }

      throw error;
    }
  }

  async validateFeedUrl(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);

      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return false;
      }

      await this.fetchFeed(url);
      return true;
    } catch (error) {
      console.error(`Feed validation failed for ${url}:`, error);
      return false;
    }
  }

  async discoverFeeds(websiteUrl: string): Promise<string[]> {
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          "User-Agent": "MyRSS Reader/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const document = parser.parseFromString(html, "text/html");

      const feedUrls: string[] = [];

      const linkElements = document.querySelectorAll(
        'link[type="application/rss+xml"], link[type="application/atom+xml"]',
      );

      for (let i = 0; i < linkElements.length; i++) {
        const link = linkElements[i];
        const href = link.getAttribute("href");
        if (href) {
          try {
            const feedUrl = new URL(href, websiteUrl).toString();
            feedUrls.push(feedUrl);
          } catch {
            // Invalid URL, skip
          }
        }
      }

      const commonFeedPaths = [
        "/feed",
        "/rss",
        "/atom.xml",
        "/rss.xml",
        "/feed.xml",
      ];

      for (const path of commonFeedPaths) {
        try {
          const feedUrl = new URL(path, websiteUrl).toString();
          if (await this.validateFeedUrl(feedUrl)) {
            feedUrls.push(feedUrl);
          }
        } catch {
          // Feed doesn't exist or is invalid
        }
      }

      return [...new Set(feedUrls)];
    } catch (error) {
      throw new Error(`Feed discovery failed: ${(error as Error).message}`);
    }
  }
}

export const rssFetcher = new RSSFetcher();
