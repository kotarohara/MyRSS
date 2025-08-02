import { useState } from "preact/hooks";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
}

export default function FollowButton(
  { userId, isFollowing }: FollowButtonProps,
) {
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  async function toggleFollow() {
    setLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: following ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setFollowing(!following);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to toggle follow");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to toggle follow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      class={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        following
          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={toggleFollow}
      disabled={loading}
    >
      {loading
        ? (following ? "Unfollowing..." : "Following...")
        : (following ? "Unfollow" : "Follow")}
    </button>
  );
}
