import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          City Vault
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Securely store and retrieve files using IPFS with metadata backed by
          Neon Postgres.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
