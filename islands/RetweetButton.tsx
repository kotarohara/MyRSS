import { useSignal } from "@preact/signals";

interface RetweetButtonProps {
  articleId: string;
  initialRetweeted: boolean;
  initialCount: number;
  userId?: string;
}

export default function RetweetButton({
  articleId,
  initialRetweeted,
  initialCount,
  userId,
}: RetweetButtonProps) {
  const retweeted = useSignal(initialRetweeted);
  const count = useSignal(initialCount);
  const loading = useSignal(false);
  const showModal = useSignal(false);
  const comment = useSignal("");

  const handleRetweet = async (withComment = false) => {
    if (!userId || loading.value) return;

    if (!retweeted.value && withComment) {
      showModal.value = true;
      return;
    }

    loading.value = true;
    const newRetweeted = !retweeted.value;

    // Optimistic update
    retweeted.value = newRetweeted;
    count.value += newRetweeted ? 1 : -1;

    try {
      const response = await fetch(`/api/articles/${articleId}/retweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retweeted: newRetweeted,
          comment: newRetweeted ? comment.value : undefined,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        retweeted.value = !newRetweeted;
        count.value += newRetweeted ? -1 : 1;
        console.error("Failed to update retweet");
      } else {
        comment.value = "";
        showModal.value = false;
      }
    } catch (error) {
      // Revert optimistic update on error
      retweeted.value = !newRetweeted;
      count.value += newRetweeted ? -1 : 1;
      console.error("Error updating retweet:", error);
    } finally {
      loading.value = false;
    }
  };

  const handleModalSubmit = () => {
    handleRetweet(false);
  };

  if (!userId) {
    return (
      <div class="flex items-center space-x-1 text-gray-500">
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span class="text-sm">{count.value}</span>
      </div>
    );
  }

  return (
    <>
      <div class="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => handleRetweet(false)}
          disabled={loading.value}
          class={`flex items-center space-x-1 transition-colors ${
            retweeted.value
              ? "text-green-500 hover:text-green-600"
              : "text-gray-500 hover:text-green-500"
          } ${loading.value ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg
            class="w-5 h-5"
            fill={retweeted.value ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="text-sm">{count.value}</span>
        </button>

        {!retweeted.value && (
          <button
            type="button"
            onClick={() => handleRetweet(true)}
            disabled={loading.value}
            class="text-gray-400 hover:text-green-500 transition-colors"
            title="Retweet with comment"
          >
            <svg
              class="w-4 h-4"
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
          </button>
        )}
      </div>

      {showModal.value && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold mb-4">Retweet with comment</h3>
            <textarea
              value={comment.value}
              onInput={(e) =>
                comment.value = (e.target as HTMLTextAreaElement).value}
              placeholder="Add a comment..."
              class="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
            />
            <div class="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  showModal.value = false;
                  comment.value = "";
                }}
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={loading.value}
                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading.value ? "Retweeting..." : "Retweet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
