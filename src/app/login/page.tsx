import { login } from "@/app/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const showError = searchParams?.error === "invalid";

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-forest text-4xl font-bold text-center">BacklinkPilot</h1>
        <p className="text-gray-500 text-center mt-2">Sign in to continue</p>

        <form action={login} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-forest mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-forest focus:outline-none focus:ring-2 focus:ring-jade focus:border-jade"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-jade text-white font-semibold py-2.5 hover:bg-forest transition-colors"
          >
            Sign In
          </button>

          {showError && (
            <p className="text-red-600 text-sm text-center" role="alert">
              Incorrect password. Try again.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
