import { Article } from "../db.ts";

interface ArticleCardProps {
  article: Article & { feedTitle: string };
}

function sanitizeText(html: string): string {
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

export default function ArticleCard({ article }: ArticleCardProps) {
  const cleanContent = sanitizeText(article.content);
  const excerpt = cleanContent.length > 200
    ? cleanContent.substring(0, 200) + "..."
    : cleanContent;

  return (
    <article class="border-b border-gray-200 pb-6 last:border-b-0">
      <div class="space-y-2">
        <div class="flex items-center text-sm text-gray-500">
          <span class="font-medium text-indigo-600">
            {article.feedTitle}
          </span>
          <span class="mx-2">•</span>
          <time dateTime={article.publishedAt.toISOString()}>
            {new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(article.publishedAt)}
          </time>
        </div>

        <h3 class="text-lg font-semibold text-gray-900 leading-6">
          <a
            href={`/article/${article.id}`}
            class="hover:text-indigo-600 transition-colors"
          >
            {article.title}
          </a>
        </h3>

        {excerpt && (
          <div class="text-gray-700 text-sm">
            {excerpt}
          </div>
        )}

        <div class="flex items-center justify-between">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Read original →
          </a>
          <a
            href={`/article/${article.id}`}
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            View details
          </a>
        </div>
      </div>
    </article>
  );
}
