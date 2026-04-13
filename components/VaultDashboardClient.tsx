"use client";

import { useCallback, useState } from "react";
import { FileList } from "@/components/FileList";
import { FileUpload } from "@/components/FileUpload";
import type { VaultNotice } from "@/vault-ui";

type ToastNotice = VaultNotice & {
  id: number;
};

function noticeClasses(type: VaultNotice["type"]) {
  if (type === "success") {
    return "border-[var(--success)] bg-[color-mix(in_oklch,var(--success)_18%,var(--surface-0))] text-[var(--ink)]";
  }

  if (type === "error") {
    return "border-[var(--danger)] bg-[color-mix(in_oklch,var(--danger)_20%,var(--surface-0))] text-[var(--ink)]";
  }

  return "border-[var(--signal)] bg-[color-mix(in_oklch,var(--signal)_20%,var(--surface-0))] text-[var(--ink)]";
}

export function VaultDashboardClient() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const handleUploaded = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const handleNotice = useCallback((notice: VaultNotice) => {
    const nextToast: ToastNotice = {
      ...notice,
      id: Date.now() + Math.floor(Math.random() * 1000),
    };

    setToasts((current) => [...current, nextToast]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== nextToast.id));
    }, 4000);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto border-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] shadow-[8px_8px_0_var(--shadow)] ${noticeClasses(
              toast.type
            )}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <FileUpload onUploaded={handleUploaded} onNotice={handleNotice} />
        <FileList refreshToken={refreshToken} onNotice={handleNotice} />
      </div>
    </>
  );
}
