"use client";

import { useCallback, useEffect, useState } from "react";
import { FileList } from "@/components/FileList";
import { FileUpload } from "@/components/FileUpload";
import type { VaultNotice } from "@/vault-ui";

function noticeClasses(type: VaultNotice["type"]) {
  if (type === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (type === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-200";
}

export function VaultDashboardClient() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [notice, setNotice] = useState<VaultNotice | null>(null);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleUploaded = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const handleNotice = useCallback((nextNotice: VaultNotice) => {
    setNotice(nextNotice);
  }, []);

  return (
    <div className="space-y-8">
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${noticeClasses(
            notice.type
          )}`}
        >
          {notice.message}
        </div>
      )}

      <FileUpload onUploaded={handleUploaded} onNotice={handleNotice} />
      <FileList refreshToken={refreshToken} onNotice={handleNotice} />
    </div>
  );
}