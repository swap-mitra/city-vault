"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch (error) {
      console.error(error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create a private vault for your own IPFS file history."
      description="Registration stays simple. Once inside, you can upload supported files, track metadata, and remove entries without cross-user leakage."
      accentLabel="Account creation with scoped file ownership"
      footerPrompt="Already have an account?"
      footerHref="/login"
      footerLabel="Sign in"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Create your account
          </h2>
          <p className="text-sm leading-7 text-slate-300">
            Start with a single sign-in and keep the rest operational.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Name
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-blue-400/40 focus:outline-none"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-blue-400/40 focus:outline-none"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-blue-400/40 focus:outline-none"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Must be at least 8 characters
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-blue-500 py-3 text-sm font-medium text-white shadow-[0_0_40px_rgba(79,140,255,0.25)] hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              By creating an account, you accept the standard usage and privacy
              terms for this workspace.
            </p>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}