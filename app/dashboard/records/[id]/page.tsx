import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { RecordDetailClient } from "@/components/RecordDetailClient";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack">
        <header className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div className="space-y-5 paper-copy">
              <div className="section-kicker">
                <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                Versioned record
              </div>
              <div className="space-y-3">
                <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                  Inspect the trail.
                </h1>
                <p className="max-w-xl text-base leading-8 paper-muted sm:text-lg">
                  Review metadata, upload the next version, and keep the record history intact.
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
                <p className="metric-label">Active tenant</p>
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
                  <p className="mt-2 text-sm leading-6 text-[var(--ink)]/72">
                    Legacy personal mode
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="motion-rise" style={{ animationDelay: "80ms" }}>
          <RecordDetailClient recordId={id} />
        </section>
      </div>
    </main>
  );
}
