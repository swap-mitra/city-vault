"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatFileSize } from "@/upload-validation";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [confirmingCid, setConfirmingCid] = useState<string | null>(null);
  const [deletingCid, setDeletingCid] = useState<string | null>(null);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedSearch = useMemo(() => search.trim(), [search]);
  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.fileSize, 0),
    [files]
  );
  const latestUpload = useMemo(() => {
    if (files.length === 0) {
      return null;
    }

    return [...files].sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
    )[0];
  }, [files]);
  const imageCount = useMemo(
    () => files.filter((file) => file.mimeType?.startsWith("image/")).length,
    [files]
  );

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const handleCopyCid = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      setCopiedCid(cid);
      onNotice?.({ type: "success", message: "CID copied to clipboard." });
      window.setTimeout(() => {
        setCopiedCid((current) => (current === cid ? null : current));
      }, 1800);
    } catch {
      onNotice?.({ type: "error", message: "Failed to copy CID." });
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
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">
              Files
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Search and manage the files currently pinned to your vault.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Use <span className="rounded border border-white/10 px-1.5 py-0.5 text-xs text-slate-200">/</span>{" "}
              to focus search. Delete removes the database entry and only unpins
              when no remaining vault reference exists.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Total files
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{files.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Storage
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatFileSize(totalBytes)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Images
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{imageCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Latest upload
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {latestUpload ? formatDate(latestUpload.uploadedAt) : "None yet"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-white/20 hover:bg-white/5 lg:self-auto"
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
          {isCollapsed ? "Expand list" : "Collapse list"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-8 flex gap-3">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                placeholder="Search files by name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 pl-11 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-400/40 focus:outline-none"
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
                  d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
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
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
            >
              {trimmedSearch ? "Clear" : "Refresh"}
            </button>
          </div>

          {listError && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {listError}
            </div>
          )}

          {loading && (
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 items-start gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-white/8" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-48 rounded-full bg-white/8" />
                        <div className="h-3 w-64 rounded-full bg-white/8" />
                        <div className="h-3 w-full rounded-full bg-white/8" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-10 w-20 rounded-full bg-white/8" />
                      <div className="h-10 w-20 rounded-full bg-white/8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && files.length === 0 && !listError && (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
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
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
                />
              </svg>
              <p className="mt-4 text-sm text-slate-300">{emptyStateTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{emptyStateDescription}</p>
              {trimmedSearch && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/5"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="mt-6 space-y-3">
              {files.map((file) => {
                const isConfirming = confirmingCid === file.cid;
                const isDeleting = deletingCid === file.cid;

                return (
                  <div
                    key={file.id}
                    className="group rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-slate-300">
                            {renderFileGlyph(file.mimeType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-base font-medium text-white">
                              {file.filename}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>{file.mimeType || "unknown"}</span>
                              <span>•</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="min-w-0 break-all font-mono text-xs text-slate-400">
                              {file.cid}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleCopyCid(file.cid)}
                              className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
                            >
                              {copiedCid === file.cid ? "Copied" : "Copy CID"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <a
                          href={file.gatewayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
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
                              d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>

                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmingCid(file.cid)}
                            className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-200 hover:border-red-400/30 hover:bg-red-500/15"
                          >
                            Delete
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => void handleDelete(file)}
                              disabled={isDeleting}
                              className="rounded-full bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmingCid(null)}
                              disabled={isDeleting}
                              className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
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
    </section>
  );
}

function renderFileGlyph(mimeType: string | null) {
  if (mimeType?.startsWith("image/")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4 16 8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-2 6H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2ZM8.5 9.5h.01"
        />
      </svg>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7 3h6l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 0v4h4M8.5 13h2.25a1.25 1.25 0 1 0 0-2.5H8.5V13Zm0 0v2.5m4.25-5v5h1.5a1.5 1.5 0 0 0 0-3h-1.5m0 0V10.5M18 10.5h-2v5"
        />
      </svg>
    );
  }

  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 0v4h4M10 8h2m-2 3h2m-2 3h2m-2 3h4"
        />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
      />
    </svg>
  );
}