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
    return "border-emerald-400/30 bg-slate-950/90 text-emerald-100 shadow-[0_18px_40px_rgba(16,185,129,0.18)]";
  }

  if (type === "error") {
    return "border-red-400/30 bg-slate-950/90 text-red-100 shadow-[0_18px_40px_rgba(248,113,113,0.18)]";
  }

  return "border-blue-400/30 bg-slate-950/90 text-blue-100 shadow-[0_18px_40px_rgba(79,140,255,0.18)]";
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
      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${noticeClasses(
              toast.type
            )}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <FileUpload onUploaded={handleUploaded} onNotice={handleNotice} />
        <FileList refreshToken={refreshToken} onNotice={handleNotice} />
      </div>
    </>
  );
}