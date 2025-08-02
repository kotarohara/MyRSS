import { FreshContext } from "$fresh/server.ts";
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

export default function RegisterPage() {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <a
            href="/login"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            sign in to your existing account
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form class="space-y-6" action="#" method="POST" id="registerForm">
            <div>
              <label
                for="username"
                class="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="3-20 characters, letters, numbers, and underscores only"
                />
              </div>
            </div>

            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
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
                  placeholder="At least 6 characters"
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
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>

      <script>
        {`
          document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = document.getElementById('submitButton');
            const errorMessage = document.getElementById('error-message');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Creating account...';
            errorMessage.classList.add('hidden');
            
            try {
              const formData = new FormData(e.target);
              const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  username: formData.get('username'),
                  email: formData.get('email'),
                  password: formData.get('password'),
                }),
              });
              
              const data = await response.json();
              
              if (response.ok) {
                window.location.href = '/';
              } else {
                errorMessage.textContent = data.error || 'Registration failed';
                errorMessage.classList.remove('hidden');
              }
            } catch (error) {
              errorMessage.textContent = 'Network error. Please try again.';
              errorMessage.classList.remove('hidden');
            } finally {
              submitButton.disabled = false;
              submitButton.textContent = 'Create account';
            }
          });
        `}
      </script>
    </div>
  );
}
