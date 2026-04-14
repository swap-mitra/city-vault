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
    ? "Try another filename."
    : "Upload your first file.";

  return (
    <section className="brutal-panel motion-rise overflow-hidden p-6 sm:p-8" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              File command center
            </p>
            <h2 className="display-font max-w-4xl text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
              Search. inspect. delete.
            </h2>
            <p className="max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Press <span className="brutal-chip mx-1 inline-flex align-middle">/</span> to search.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="brutal-metric">
              <p className="metric-label">Files</p>
              <p className="metric-value text-[var(--accent)]">{files.length}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Storage</p>
              <p className="metric-value text-[var(--signal)]">{formatFileSize(totalBytes)}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Images</p>
              <p className="metric-value text-[var(--success)]">{imageCount}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Latest</p>
              <p className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
                {latestUpload ? formatDate(latestUpload.uploadedAt) : "None"}
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => setIsCollapsed(!isCollapsed)} className="brutal-button brutal-button--ghost self-start lg:self-auto">
          {isCollapsed ? "Expand list" : "Collapse list"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                placeholder="Search files by name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="brutal-input pl-12"
              />
              <svg
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
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
              className="brutal-button brutal-button--ghost"
            >
              {trimmedSearch ? "Clear" : "Refresh"}
            </button>
          </div>

          {listError && (
            <div className="brutal-callout brutal-callout--error mt-4 text-sm font-semibold leading-7">
              {listError}
            </div>
          )}

          {loading && (
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="brutal-panel animate-pulse p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="space-y-3">
                      <div className="h-5 w-48 bg-white/10" />
                      <div className="h-4 w-64 bg-white/10" />
                      <div className="h-4 w-full bg-white/10" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-12 w-24 bg-white/10" />
                      <div className="h-12 w-24 bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && files.length === 0 && !listError && (
            <div className="brutal-panel brutal-grid mt-6 px-6 py-16 text-center">
              <p className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
                {emptyStateTitle}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {emptyStateDescription}
              </p>
              {trimmedSearch && (
                <div className="mt-6">
                  <button onClick={() => setSearch("")} className="brutal-button brutal-button--ghost">
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="mt-6 space-y-4">
              {files.map((file) => {
                const isConfirming = confirmingCid === file.cid;
                const isDeleting = deletingCid === file.cid;

                return (
                  <article key={file.id} className="brutal-panel p-5 transition-transform duration-200 hover:-translate-y-1">
                    <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[var(--line)] bg-[color-mix(in_oklch,var(--paper)_10%,var(--surface-1))] text-[var(--accent)] shadow-[4px_4px_0_var(--shadow)]">
                            {renderFileGlyph(file.mimeType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="display-font break-words text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                              {file.filename}
                            </h3>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] sm:gap-3">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>{file.mimeType || "unknown"}</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="brutal-callout">
                          <p className="metric-label">CID</p>
                          <p className="mt-2 break-all text-sm font-semibold leading-7 text-[var(--ink)]">
                            {file.cid}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 xl:max-w-[17rem] xl:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleCopyCid(file.cid)}
                          className="brutal-button brutal-button--ghost"
                        >
                          {copiedCid === file.cid ? "Copied" : "Copy CID"}
                        </button>

                        <a href={file.gatewayUrl} target="_blank" rel="noopener noreferrer" className="brutal-button brutal-button--signal">
                          View file
                        </a>

                        {!isConfirming ? (
                          <button onClick={() => setConfirmingCid(file.cid)} className="brutal-button brutal-button--danger">
                            Delete
                          </button>
                        ) : (
                          <div className="grid w-full gap-3">
                            <button
                              onClick={() => void handleDelete(file)}
                              disabled={isDeleting}
                              className="brutal-button brutal-button--danger"
                            >
                              {isDeleting ? "Deleting" : "Confirm delete"}
                            </button>
                            <button
                              onClick={() => setConfirmingCid(null)}
                              disabled={isDeleting}
                              className="brutal-button brutal-button--ghost"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
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
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16 8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-2 6H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2ZM8.5 9.5h.01"
        />
      </svg>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 3h6l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 0v4h4M8.5 13h2.25a1.25 1.25 0 1 0 0-2.5H8.5V13Zm0 0v2.5m4.25-5v5h1.5a1.5 1.5 0 0 0 0-3h-1.5m0 0V10.5M18 10.5h-2v5"
        />
      </svg>
    );
  }

  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 0v4h4M10 8h2m-2 3h2m-2 3h2m-2 3h4"
        />
      </svg>
    );
  }

  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
      />
    </svg>
  );
}
