import Link from "next/link";

const highlights = [
  {
    label: "Ownership",
    value: "Per-user control",
    detail: "Every file view and delete action stays scoped to the active vault owner.",
  },
  {
    label: "Storage",
    value: "Pinned on IPFS",
    detail: "Uploads land on decentralized storage while metadata stays queryable in one place.",
  },
  {
    label: "Cleanup",
    value: "No blind unpin",
    detail: "Shared references survive until the last vault record disappears.",
  },
];

const boardRows = [
  "UPLOAD / select local file",
  "TRACK / keep filename, type, size, timestamp",
  "SEARCH / hit slash and filter instantly",
  "DELETE / remove record, unpin only when safe",
];

export default function HomePage() {
  return (
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack">
        <header className="brutal-panel motion-rise px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center border-[3px] border-[var(--line)] bg-[var(--accent)] text-[var(--shadow)] shadow-[6px_6px_0_var(--shadow)]">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                  />
                </svg>
              </div>
              <div>
                <p className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                  City Vault
                </p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Decentralized file operations with an urban edge
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="brutal-button brutal-button--ghost">
                Log in
              </Link>
              <Link href="/register" className="brutal-button brutal-button--signal">
                Create account
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <article className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8" style={{ animationDelay: "60ms" }}>
            <div className="space-y-6">
              <div className="section-kicker">
                <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                Built for people who move files with intent
              </div>

              <div className="space-y-5">
                <h1 className="display-headline max-w-4xl text-[var(--ink)]">
                  Kill the sleepy storage dashboard.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--shadow)]/88 sm:text-lg">
                  City Vault turns IPFS file handling into a sharp, high-contrast workspace.
                  Upload, inspect, search, and remove files without drifting through generic cards,
                  weak hierarchy, or enterprise wallpaper.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="brutal-button min-w-48">
                  Open your vault
                </Link>
                <Link href="/login" className="brutal-button brutal-button--ghost min-w-48">
                  Resume session
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="brutal-metric bg-[color-mix(in_oklch,var(--paper)_25%,var(--surface-1))] text-[var(--shadow)]">
                    <p className="metric-label text-[color-mix(in_oklch,var(--shadow)_70%,var(--paper))]">
                      {item.label}
                    </p>
                    <p className="display-font text-3xl leading-none tracking-[0.08em] uppercase">
                      {item.value}
                    </p>
                    <p className="text-sm leading-6 text-[var(--shadow)]/82">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            <article className="brutal-panel brutal-panel--accent brutal-grid motion-rise p-6 sm:p-8" style={{ animationDelay: "120ms" }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--paper)]">
                    Workspace preview
                  </p>
                  <h2 className="mt-2 text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                    Upload.
                    <br />
                    Track.
                    <br />
                    Move.
                  </h2>
                </div>
                <span className="brutal-chip bg-[var(--paper)] text-[var(--shadow)]">Active</span>
              </div>

              <div className="mt-8 space-y-3">
                {boardRows.map((row, index) => (
                  <div
                    key={row}
                    className="flex items-center justify-between border-[3px] border-[var(--line)] bg-[color-mix(in_oklch,var(--surface-0)_82%,black)] px-4 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]"
                  >
                    <span>{row}</span>
                    <span className="display-font text-3xl leading-none text-[var(--accent)]">
                      0{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="brutal-panel motion-rise p-5" style={{ animationDelay: "180ms" }}>
                <p className="metric-label">Status</p>
                <p className="display-font mt-2 text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
                  Scoped
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Files belong to the logged-in user, not the whole room.
                </p>
              </article>

              <article className="brutal-panel motion-rise p-5" style={{ animationDelay: "220ms" }}>
                <p className="metric-label">Rhythm</p>
                <p className="display-font mt-2 text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
                  Fast
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Search, copy CIDs, and clean up entries without leaving the page.
                </p>
              </article>
            </div>
          </div>
        </section>

        <footer className="brutal-panel motion-rise flex flex-col gap-4 px-5 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "260ms" }}>
          <p>Dark-first, hard-edged, and built for actual file movement.</p>
          <p>
            Designed and developed by{" "}
            <a
              href="https://www.linkedin.com/in/swapnilmitra/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink)] underline decoration-[3px] underline-offset-4"
            >
              Swapnil Mitra
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
