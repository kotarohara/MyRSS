import { useSignal } from "@preact/signals";

interface LikeButtonProps {
  articleId: string;
  initialLiked: boolean;
  initialCount: number;
  userId?: string;
}

export default function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  userId,
}: LikeButtonProps) {
  const liked = useSignal(initialLiked);
  const count = useSignal(initialCount);
  const loading = useSignal(false);

  const handleLike = async () => {
    if (!userId || loading.value) return;

    loading.value = true;
    const newLiked = !liked.value;

    // Optimistic update
    liked.value = newLiked;
    count.value += newLiked ? 1 : -1;

    try {
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ liked: newLiked }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        liked.value = !newLiked;
        count.value += newLiked ? -1 : 1;
        console.error("Failed to update like");
      }
    } catch (error) {
      // Revert optimistic update on error
      liked.value = !newLiked;
      count.value += newLiked ? -1 : 1;
      console.error("Error updating like:", error);
    } finally {
      loading.value = false;
    }
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
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span class="text-sm">{count.value}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={loading.value}
      class={`flex items-center space-x-1 transition-colors ${
        liked.value
          ? "text-red-500 hover:text-red-600"
          : "text-gray-500 hover:text-red-500"
      } ${loading.value ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <svg
        class="w-5 h-5"
        fill={liked.value ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span class="text-sm">{count.value}</span>
    </button>
  );
}
