import { Handlers, PageProps } from "$fresh/server.ts";
import { db, User } from "../db.ts";
import { authService, getSessionCookie } from "../utils/auth.ts";
import FollowButton from "../islands/FollowButton.tsx";

interface UsersData {
  user: { id: string; username: string; email: string };
  allUsers: (User & {
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
  })[];
}

export const handler: Handlers<UsersData> = {
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

    // Get all users except current user
    const allUsers = await db.getAllUsers();
    const otherUsers = allUsers.filter((u) => u.id !== user.id);

    // Get follow status and counts for each user
    const usersWithData = await Promise.all(
      otherUsers.map(async (otherUser) => {
        const [isFollowing, followers, following] = await Promise.all([
          db.getFollow(user.id, otherUser.id),
          db.getUserFollowers(otherUser.id),
          db.getUserFollowing(otherUser.id),
        ]);

        return {
          ...otherUser,
          isFollowing: !!isFollowing,
          followerCount: followers.length,
          followingCount: following.length,
        };
      }),
    );

    return ctx.render({
      user: { id: user.id, username: user.username, email: user.email },
      allUsers: usersWithData,
    });
  },
};

export default function Users({ data }: PageProps<UsersData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center space-x-8">
              <h1 class="text-2xl font-bold text-gray-900">Discover Users</h1>
              <nav class="flex space-x-4">
                <a href="/" class="text-gray-500 hover:text-gray-700">Home</a>
                <a href="/social" class="text-gray-500 hover:text-gray-700">
                  Social
                </a>
                <a href="/feeds" class="text-gray-500 hover:text-gray-700">
                  Feeds
                </a>
                <a href="/users" class="text-indigo-600 font-medium">Users</a>
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

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-6">All Users</h2>

            {data.allUsers.length === 0
              ? (
                <div class="text-center py-12">
                  <p class="text-gray-500">No other users found.</p>
                </div>
              )
              : (
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {data.allUsers.map((user) => (
                    <div key={user.id} class="bg-gray-50 rounded-lg p-6">
                      <div class="flex items-center justify-between mb-4">
                        <div>
                          <h3 class="text-lg font-medium text-gray-900">
                            {user.username}
                          </h3>
                          <p class="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      <div class="flex justify-between text-sm text-gray-500 mb-4">
                        <span>{user.followerCount} followers</span>
                        <span>{user.followingCount} following</span>
                      </div>

                      <div class="flex justify-center">
                        <FollowButton
                          userId={user.id}
                          isFollowing={user.isFollowing}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
