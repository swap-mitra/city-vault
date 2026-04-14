import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VaultDashboardClient } from "@/components/VaultDashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack">
        <header className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div className="space-y-5 paper-copy">
              <div className="section-kicker">
                <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                Active vault
              </div>
              <div className="space-y-3">
                <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                  Own the file flow.
                </h1>
                <p className="max-w-xl text-base leading-8 paper-muted sm:text-lg">
                  Upload, inspect, search, and clean up from one place.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="brutal-panel bg-[color-mix(in_oklch,var(--paper)_18%,var(--surface-1))] p-5 text-[var(--ink)]">
                <p className="metric-label">Signed in</p>
                <p className="mt-2 break-all text-lg font-bold leading-7">
                  {session.user.email}
                </p>
              </div>

              <div className="brutal-panel bg-[color-mix(in_oklch,var(--paper)_12%,var(--surface-1))] p-5 text-[var(--ink)]">
                <p className="metric-label">Tenant context</p>
                {session.user.organizationId && session.user.workspaceId && session.user.role ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-lg font-bold leading-7">
                      {session.user.organizationName}
                    </p>
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

              <div className="flex flex-wrap gap-3">
                <form action="/api/auth/signout" method="post" className="w-full sm:w-auto">
                  <button type="submit" className="brutal-button brutal-button--ghost w-full sm:w-auto">
                    Sign out
                  </button>
                </form>
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
