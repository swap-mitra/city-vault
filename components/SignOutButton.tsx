"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export function SignOutButton() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsConfirming(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirming, isSubmitting]);

  const handleSignOut = async () => {
    setIsSubmitting(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="brutal-button brutal-button--ghost w-full sm:w-auto"
      >
        Sign out
      </button>

      {isConfirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_oklch,var(--shadow)_72%,transparent)] px-4 py-6 backdrop-blur-[2px]"
          onClick={() => {
            if (!isSubmitting) {
              setIsConfirming(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className="brutal-panel brutal-panel--paper w-full max-w-lg p-6 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-6 paper-copy">
              <div className="space-y-3">
                <p className="section-kicker">
                  <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                  Session control
                </p>
                <div className="space-y-3">
                  <h2
                    id="signout-title"
                    className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl"
                  >
                    Sign out.
                  </h2>
                  <p className="text-sm leading-7 paper-muted sm:text-base">
                    End the current admin session and return to the login screen. Any unsaved
                    record actions on this page will be lost.
                  </p>
                </div>
              </div>

              <div className="brutal-callout">
                <p className="metric-label">Confirmation</p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                  Review, governance, and record detail screens can be reopened after signing back
                  in with the same tenant membership.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="brutal-button brutal-button--ghost"
                >
                  Stay signed in
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSubmitting}
                  className="brutal-button brutal-button--danger"
                >
                  {isSubmitting ? "Signing out" : "Confirm sign out"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
