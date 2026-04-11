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
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-300" />
                Active vault
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Manage uploads, ownership, and pinned storage in one workspace.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Your files stay scoped to your account. Upload, inspect, copy
                  CIDs, and remove entries without breaking shared references.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                Signed in as <span className="font-medium text-white">{session.user.email}</span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <VaultDashboardClient />
        </div>
      </div>
    </div>
  );
}