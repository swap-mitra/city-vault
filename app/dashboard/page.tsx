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
    <main className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Logged in as {session.user.email}
          </p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="px-3 py-2 text-sm rounded border border-slate-600"
          >
            Sign out
          </button>
        </form>
      </header>

      <FileUpload />
      <FileList />
    </main>
  );
}
