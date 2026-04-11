import Link from "next/link";

const highlights = [
  "Scoped file ownership and search",
  "Pinned IPFS storage with controlled unpin flow",
  "Neon-backed metadata with credential auth",
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-between gap-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-slate-950/60 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">City Vault</p>
              <p className="text-xs text-slate-400">IPFS file workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-blue-400/40 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8 py-10">
            <div className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
              Secure personal storage
            </div>

            <div className="max-w-3xl space-y-6">
              <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                Store files with a calmer, faster IPFS workflow.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                City Vault gives you one place to upload, search, inspect, and
                remove pinned files without leaking ownership metadata across
                users.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-blue-500 px-6 py-3 text-sm font-medium text-white shadow-[0_0_40px_rgba(79,140,255,0.35)] hover:bg-blue-400"
              >
                Start with your vault
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
              >
                Open existing workspace
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_32px_90px_rgba(2,6,23,0.6)] backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                <span>Workspace preview</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Latest upload</p>
                    <p className="mt-1 text-lg font-medium text-white">
                      city-archive.zip
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-200/80">
                      CID
                    </p>
                    <p className="mt-1 text-sm font-medium text-blue-100">
                      bafy...
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Files
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">28</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Storage
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      184 MB
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Search
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      Instant
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Scoped delete handling
                    </p>
                    <p className="text-sm text-slate-400">
                      Unpins only when the CID has no remaining references.
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                    Safe
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Toast-only feedback
                    </p>
                    <p className="text-sm text-slate-400">
                      Upload and delete responses stay out of the layout flow.
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                    Focused
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for direct file operations, not dashboard clutter.</p>
          <p>
            Designed and developed by{" "}
            <a
              href="https://www.linkedin.com/in/swapnilmitra/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white"
            >
              Swapnil Mitra
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}