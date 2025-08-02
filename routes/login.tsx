import { FreshContext, PageProps } from "$fresh/server.ts";
import {
  authMiddleware,
  AuthState,
  requireGuest,
} from "../utils/middleware.ts";

export const handler = [
  authMiddleware,
  requireGuest(async (_req: Request, ctx: FreshContext<AuthState>) => {
    return await ctx.render();
  }),
];

export default function LoginPage(props: PageProps) {
  const url = new URL(props.url);
  const redirect = url.searchParams.get("redirect") || "/";

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <a
            href="/register"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            create a new account
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form class="space-y-6" action="#" method="POST" id="loginForm">
            <div>
              <label
                for="usernameOrEmail"
                class="block text-sm font-medium text-gray-700"
              >
                Username or Email
              </label>
              <div class="mt-1">
                <input
                  id="usernameOrEmail"
                  name="usernameOrEmail"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div id="error-message" class="text-red-600 text-sm hidden"></div>

            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                id="submitButton"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>

      <script>
        {`
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = document.getElementById('submitButton');
            const errorMessage = document.getElementById('error-message');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Signing in...';
            errorMessage.classList.add('hidden');
            
            try {
              const formData = new FormData(e.target);
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  usernameOrEmail: formData.get('usernameOrEmail'),
                  password: formData.get('password'),
                }),
              });
              
              const data = await response.json();
              
              if (response.ok) {
                window.location.href = '${redirect}';
              } else {
                errorMessage.textContent = data.error || 'Login failed';
                errorMessage.classList.remove('hidden');
              }
            } catch (error) {
              errorMessage.textContent = 'Network error. Please try again.';
              errorMessage.classList.remove('hidden');
            } finally {
              submitButton.disabled = false;
              submitButton.textContent = 'Sign in';
            }
          });
        `}
      </script>
    </div>
  );
}
