"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  eyebrow: string;
  accentLabel: string;
  children: ReactNode;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
};

const utilityPoints = [
  "Private file metadata scoped to your account",
  "Direct IPFS retrieval with pinned storage control",
  "Fast search and cleanup from a single workspace",
];

export function AuthShell({
  title,
  description,
  eyebrow,
  accentLabel,
  children,
  footerPrompt,
  footerHref,
  footerLabel,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(79,140,255,0.26),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(72,187,120,0.16),_transparent_24%)]" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_24px_80px_rgba(3,7,18,0.55)] backdrop-blur-xl sm:p-10 lg:p-12">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,rgba(15,23,42,0.96),rgba(15,23,42,0.7)_40%,rgba(30,41,59,0.55))]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

          <div className="space-y-10">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 transition hover:border-blue-400/40 hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                  />
                </svg>
              </span>
              City Vault
            </Link>

            <div className="max-w-xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300/80">
                {eyebrow}
              </p>
              <div className="space-y-4">
                <h1 className="max-w-lg text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-md text-base leading-7 text-slate-300 sm:text-lg">
                  {description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {utilityPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-400">
            <p>{accentLabel}</p>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              IPFS + Neon
            </div>
          </div>
        </section>

        <section className="relative flex items-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(3,7,18,0.55)] backdrop-blur-xl sm:p-8">
            {children}

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
              {footerPrompt}{" "}
              <Link
                href={footerHref}
                className="font-medium text-blue-300 transition hover:text-blue-200"
              >
                {footerLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}