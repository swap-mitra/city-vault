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
    return "border-emerald-500/30 bg-slate-900/95 text-emerald-200";
  }

  if (type === "error") {
    return "border-red-500/30 bg-slate-900/95 text-red-200";
  }

  return "border-blue-500/30 bg-slate-900/95 text-blue-200";
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
      <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${noticeClasses(
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