"use client";

import { type FormEvent, useState } from "react";
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
      title="Build your own vault."
      description="Registration stays simple. Once you are inside, the workspace is ready for uploads, metadata tracking, and controlled cleanup."
      accentLabel="Account creation without the usual soft, generic onboarding shell"
      footerPrompt="Already registered?"
      footerHref="/login"
      footerLabel="Sign in"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Create account
          </h2>
          <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
            Start with a single login and let the rest stay operational.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              Name
            </label>
            <input
              className="brutal-input"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

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
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Minimum 8 characters
            </p>
          </div>

          {error && <div className="brutal-callout brutal-callout--error text-sm font-semibold leading-7">{error}</div>}

          <button type="submit" disabled={loading} className="brutal-button w-full">
            {loading ? "Creating account" : "Create account"}
          </button>

          <div className="brutal-callout text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            By creating an account, you accept the standard usage and privacy terms for this workspace.
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
