"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">Error: {error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </main>
  );
}
