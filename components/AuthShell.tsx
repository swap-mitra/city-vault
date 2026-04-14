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

const utilityPoints = ["Private ownership", "Direct CID access", "Safe cleanup"];

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
    <main className="px-4 sm:px-6 lg:px-8">
      <div className="vault-shell page-stack justify-center">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <section className="brutal-panel brutal-panel--paper brutal-grid motion-rise flex flex-col justify-between gap-10 p-6 sm:p-8">
            <div className="space-y-8 paper-copy">
              <Link href="/" className="flex w-fit items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center border-[3px] border-[var(--shadow)] bg-[var(--accent)] text-[var(--shadow)] shadow-[6px_6px_0_var(--shadow)]">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                    City Vault
                  </p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.18em] paper-muted">
                    IPFS workspace
                  </p>
                </div>
              </Link>

              <div className="space-y-5">
                <p className="section-kicker">
                  <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                  {eyebrow}
                </p>
                <div className="space-y-3">
                  <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                    {title}
                  </h1>
                  <p className="max-w-xl text-base leading-8 paper-muted sm:text-lg">
                    {description}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {utilityPoints.map((point) => (
                  <div key={point} className="brutal-metric bg-[color-mix(in_oklch,var(--paper)_18%,var(--surface-1))] text-[var(--ink)]">
                    <p className="text-sm font-bold leading-6">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="brutal-panel bg-[color-mix(in_oklch,var(--paper)_18%,var(--surface-1))] p-5 text-[var(--ink)]">
              <p className="metric-label">Core idea</p>
              <p className="mt-3 text-base font-bold leading-7 paper-muted">{accentLabel}</p>
            </div>
          </section>

          <section className="brutal-panel motion-rise flex items-center bg-[color-mix(in_oklch,var(--surface-0)_92%,black)] p-6 sm:p-8" style={{ animationDelay: "90ms" }}>
            <div className="w-full space-y-6">
              {children}
              <div className="border-t-[3px] border-[var(--line)] pt-5 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {footerPrompt}{" "}
                <Link href={footerHref} className="text-[var(--accent)] underline decoration-[3px] underline-offset-4">
                  {footerLabel}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
