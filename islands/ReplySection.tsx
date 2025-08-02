import { useSignal } from "@preact/signals";

interface Reply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  username: string;
}

interface ReplySectionProps {
  articleId: string;
  initialReplies: Reply[];
  initialCount: number;
  userId?: string;
}

export default function ReplySection({
  articleId,
  initialReplies,
  initialCount,
  userId,
}: ReplySectionProps) {
  const replies = useSignal<Reply[]>(initialReplies);
  const count = useSignal(initialCount);
  const loading = useSignal(false);
  const submitting = useSignal(false);
  const expanded = useSignal(false);
  const newReply = useSignal("");

  const loadReplies = async () => {
    if (loading.value) return;

    loading.value = true;
    try {
      const response = await fetch(`/api/articles/${articleId}/replies`);
      if (response.ok) {
        const data = await response.json();
        replies.value = data.replies;
        count.value = data.count;
      }
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      loading.value = false;
    }
  };

  const submitReply = async () => {
    if (!userId || !newReply.value.trim() || submitting.value) return;

    submitting.value = true;
    try {
      const response = await fetch(`/api/articles/${articleId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newReply.value.trim(),
        }),
      });

      if (response.ok) {
        newReply.value = "";
        await loadReplies(); // Reload replies to get the new one
      } else {
        console.error("Failed to submit reply");
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      submitting.value = false;
    }
  };

  const toggleExpanded = () => {
    expanded.value = !expanded.value;
    if (expanded.value && replies.value.length === 0) {
      loadReplies();
    }
  };

  return (
    <div class="border-t border-gray-200 pt-4">
      <button
        type="button"
        onClick={toggleExpanded}
        class="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span class="text-sm">
          {count.value} {count.value === 1 ? "reply" : "replies"}
        </span>
        <svg
          class={`w-4 h-4 transition-transform ${
            expanded.value ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded.value && (
        <div class="mt-4 space-y-4">
          {/* Reply form */}
          {userId && (
            <div class="space-y-2">
              <textarea
                value={newReply.value}
                onInput={(e) =>
                  newReply.value = (e.target as HTMLTextAreaElement).value}
                placeholder="Write a reply..."
                class="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={!newReply.value.trim() || submitting.value}
                  class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting.value ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          )}

          {/* Replies list */}
          {loading.value
            ? (
              <div class="text-center py-4 text-gray-500">
                Loading replies...
              </div>
            )
            : replies.value.length > 0
            ? (
              <div class="space-y-3">
                {replies.value.map((reply) => (
                  <div key={reply.id} class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-sm text-indigo-600">
                        {reply.username}
                      </span>
                      <time class="text-xs text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(reply.createdAt))}
                      </time>
                    </div>
                    <p class="text-gray-700 text-sm whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )
            : (
              <div class="text-center py-4 text-gray-500">
                {userId
                  ? "No replies yet. Be the first to reply!"
                  : "No replies yet."}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
