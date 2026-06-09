import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { AuditExplorerClient } from "@/components/AuditExplorerClient";

export default async function AuditPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.role || !hasPermission(session.user.role, "audit.read")) {
    return (
      <main className="px-4 sm:px-6 lg:px-8">
        <div className="vault-shell page-stack">
          <section className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8">
            <div className="space-y-5 paper-copy">
              <p className="section-kicker">
                <span className="h-2.5 w-2.5 bg-(--shadow)" />
                Audit explorer
              </p>
              <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-foreground sm:text-7xl">
                Audit access required.
              </h1>
              <Link
                href="/dashboard"
                className="brutal-button brutal-button--ghost"
              >
                Back to dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack">
        <header className="brutal-panel brutal-panel--paper motion-rise p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-5 paper-copy">
              <p className="section-kicker">
                <span className="h-2.5 w-2.5 bg-(--shadow)" />
                Evidence trail
              </p>
              <div className="space-y-3">
                <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-foreground sm:text-7xl">
                  Audit events.
                </h1>
                <p className="max-w-2xl text-base leading-8 paper-muted sm:text-lg">
                  Review tenant-scoped actions across records, workflow,
                  governance, and administration.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="brutal-button brutal-button--ghost"
            >
              Back to records
            </Link>
          </div>
        </header>

        <AuditExplorerClient />
      </div>
    </main>
  );
}
