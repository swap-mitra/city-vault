"use client";

import { Suspense, type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <AuthShell
      eyebrow="Access"
      title="Open your vault and get moving."
      description="Sign back in to upload, search, inspect, and delete IPFS-backed files with scoped ownership rules."
      accentLabel="Credential sign-in with a direct, high-contrast workspace"
      footerPrompt="Need an account instead?"
      footerHref="/register"
      footerLabel="Create one"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Welcome back
          </h2>
          <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
            Pick up the file flow exactly where you left it.
          </p>
        </div>

        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                Email
              </label>
              <input
                className="brutal-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                Password
              </label>
              <input
                className="brutal-input"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && <div className="brutal-callout brutal-callout--error text-sm font-semibold leading-7">{error}</div>}

            <button type="submit" disabled={loading} className="brutal-button w-full">
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="brutal-panel px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
            Loading
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
