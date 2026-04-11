"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VaultNotice } from "@/vault-ui";

type FileRecord = {
  id: string;
  filename: string;
  cid: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

type FileListProps = {
  refreshToken?: number;
  onNotice?: (notice: VaultNotice) => void;
};

export function FileList({ refreshToken = 0, onNotice }: FileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [confirmingCid, setConfirmingCid] = useState<string | null>(null);
  const [deletingCid, setDeletingCid] = useState<string | null>(null);

  const trimmedSearch = useMemo(() => search.trim(), [search]);

  const loadFiles = useCallback(
    async (query?: string, signal?: AbortSignal) => {
      setLoading(true);
      setListError(null);

      try {
        const url = query
          ? `/api/files?filename=${encodeURIComponent(query)}`
          : "/api/files";
        const res = await fetch(url, {
          signal,
          cache: "no-store",
        });
        const data = (await res.json()) as FileRecord[] & { error?: string };

        if (!res.ok) {
          const message = data.error || "Failed to load files.";
          setListError(message);
          onNotice?.({ type: "error", message });
          return;
        }

        setFiles(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load files.";
        setListError(message);
        onNotice?.({ type: "error", message });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [onNotice]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadFiles(trimmedSearch || undefined, controller.signal);
    }, trimmedSearch ? 300 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadFiles, trimmedSearch, refreshToken]);

  const handleDelete = async (file: FileRecord) => {
    setDeletingCid(file.cid);

    try {
      const res = await fetch(`/api/files/${file.cid}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        const message = data.error || "Failed to delete file.";
        onNotice?.({ type: "error", message });
        return;
      }

      setConfirmingCid(null);
      onNotice?.({
        type: "success",
        message: data.message || `${file.filename} deleted successfully.`,
      });
      await loadFiles(trimmedSearch || undefined);
    } finally {
      setDeletingCid(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
  };

  const emptyStateTitle = trimmedSearch
    ? `No files match "${trimmedSearch}"`
    : "No files uploaded yet";
  const emptyStateDescription = trimmedSearch
    ? "Try another filename or clear the search to view your full vault."
    : "Upload your first file to get started.";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-100 hover:text-slate-200 transition-colors group"
        >
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${
              isCollapsed ? "-rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          Your Files
        </button>
        <span className="text-sm text-slate-500">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                placeholder="Search files by name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 backdrop-blur-sm px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={() => {
                if (trimmedSearch) {
                  setSearch("");
                } else {
                  void loadFiles(undefined);
                }
              }}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-all border border-slate-700"
            >
              {trimmedSearch ? "Clear" : "Refresh"}
            </button>
          </div>

          {listError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {listError}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}

          {!loading && files.length === 0 && !listError && (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <svg
                className="mx-auto h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-sm text-slate-300">{emptyStateTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{emptyStateDescription}</p>
              {trimmedSearch && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 inline-flex rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="space-y-3">
              {files.map((file) => {
                const isConfirming = confirmingCid === file.cid;
                const isDeleting = deletingCid === file.cid;

                return (
                  <div
                    key={file.id}
                    className="group border border-slate-800 rounded-xl p-4 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 hover:bg-slate-800/50 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0">
                            <svg
                              className="h-5 w-5 text-slate-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-200 truncate">
                              {file.filename}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                              <span>|</span>
                              <span>{file.mimeType || "unknown"}</span>
                              <span>|</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 break-all font-mono pl-8">
                          {file.cid}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={file.gatewayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5"
                        >
                          View
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>

                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmingCid(file.cid)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 hover:border-red-800 transition-all"
                          >
                            Delete
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void handleDelete(file)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmingCid(null)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}