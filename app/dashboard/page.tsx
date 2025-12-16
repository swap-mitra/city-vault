import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-100">
                City Vault Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                Logged in as{" "}
                <span className="text-slate-300 font-medium">
                  {session.user.email}
                </span>
              </p>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 hover:bg-slate-800 transition-all"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="space-y-8">
          <FileUpload />
          <FileList />
        </div>
      </div>
    </div>
  );
}
