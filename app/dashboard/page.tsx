import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VaultDashboardClient } from "@/components/VaultDashboardClient";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack">
        <header className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_23rem] xl:items-start">
            <div className="space-y-8 paper-copy">
              <div className="space-y-5">
                <div className="section-kicker">
                  <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                  Active records workspace
                </div>
                <div className="space-y-4">
                  <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                    Own the record trail.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 paper-muted sm:text-lg">
                    Create records, route them through review, and manage retention and holds from
                    one workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="brutal-callout">
                  <p className="metric-label">Versioned archive</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                    Every record keeps an ordered version trail instead of raw one-off uploads.
                  </p>
                </div>
                <div className="brutal-callout">
                  <p className="metric-label">Review ready</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                    Draft, review, approval, and archive flow now run from the same dashboard.
                  </p>
                </div>
                <div className="brutal-callout">
                  <p className="metric-label">Governed state</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                    Retention rules, legal holds, and disposition are available per record.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:sticky xl:top-6">
              <div className="brutal-panel bg-[color-mix(in_oklch,var(--paper)_18%,var(--surface-1))] p-5 text-[var(--ink)]">
                <p className="metric-label">Signed in</p>
                <p className="mt-2 break-all text-lg font-bold leading-7">{session.user.email}</p>
              </div>

              <div className="brutal-panel bg-[color-mix(in_oklch,var(--paper)_12%,var(--surface-1))] p-5 text-[var(--ink)]">
                <p className="metric-label">Tenant context</p>
                {session.user.organizationId && session.user.workspaceId && session.user.role ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-lg font-bold leading-7">{session.user.organizationName}</p>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--ink)]/72">
                      {session.user.workspaceName} / {session.user.role.replaceAll("_", " ")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="text-lg font-bold leading-7">Legacy personal mode</p>
                    <p className="text-sm leading-6 text-[var(--ink)]/72">
                      This account is authenticated without an organization membership yet. The
                      current file workspace remains available while tenant migration rolls out.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Link href="/dashboard/review" className="brutal-button brutal-button--ghost w-full justify-between">
                  <span>Review queue</span>
                  <span aria-hidden="true">/</span>
                </Link>
                <Link
                  href="/dashboard/governance"
                  className="brutal-button brutal-button--ghost w-full justify-between"
                >
                  <span>Governance queue</span>
                  <span aria-hidden="true">/</span>
                </Link>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        <section className="motion-rise" style={{ animationDelay: "80ms" }}>
          <VaultDashboardClient />
        </section>
      </div>
    </main>
  );
}
