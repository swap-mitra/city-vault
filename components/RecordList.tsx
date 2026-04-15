"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatFileSize } from "@/upload-validation";
import type { VaultNotice } from "@/vault-ui";

type RecordVersionSummary = {
  id: string;
  versionNumber: number;
  cid: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

type RecordSummary = {
  recordId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestVersion: RecordVersionSummary;
};

type RecordListProps = {
  refreshToken?: number;
  onNotice?: (notice: VaultNotice) => void;
};

export function RecordList({ refreshToken = 0, onNotice }: RecordListProps) {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(null);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedSearch = useMemo(() => search.trim(), [search]);
  const totalVersions = useMemo(
    () => records.reduce((sum, record) => sum + record.versionCount, 0),
    [records]
  );
  const latestUpload = useMemo(() => {
    if (records.length === 0) {
      return null;
    }

    return [...records].sort(
      (left, right) =>
        new Date(right.latestVersion.uploadedAt).getTime() -
        new Date(left.latestVersion.uploadedAt).getTime()
    )[0];
  }, [records]);
  const totalLatestBytes = useMemo(
    () => records.reduce((sum, record) => sum + record.latestVersion.fileSize, 0),
    [records]
  );

  const loadRecords = useCallback(
    async (query?: string, signal?: AbortSignal) => {
      setLoading(true);
      setListError(null);

      try {
        const url = query
          ? `/api/records?query=${encodeURIComponent(query)}`
          : "/api/records";
        const response = await fetch(url, {
          signal,
          cache: "no-store",
        });
        const data = (await response.json()) as RecordSummary[] & { error?: string };

        if (!response.ok) {
          const message = data.error || "Failed to load records.";
          setListError(message);
          onNotice?.({ type: "error", message });
          return;
        }

        setRecords(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load records.";
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
      void loadRecords(trimmedSearch || undefined, controller.signal);
    }, trimmedSearch ? 300 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadRecords, refreshToken, trimmedSearch]);

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

  const handleDelete = async (record: RecordSummary) => {
    setDeletingRecordId(record.recordId);

    try {
      const response = await fetch(`/api/records/${record.recordId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        const message = data.error || "Failed to delete record.";
        onNotice?.({ type: "error", message });
        return;
      }

      setConfirmingRecordId(null);
      onNotice?.({
        type: "success",
        message: data.message || `${record.title} deleted successfully.`,
      });
      await loadRecords(trimmedSearch || undefined);
    } finally {
      setDeletingRecordId(null);
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
    ? `No records match "${trimmedSearch}"`
    : "No records created yet";
  const emptyStateDescription = trimmedSearch
    ? "Try another title or clear the filter to see the full workspace."
    : "Create your first record to start building a versioned archive.";

  return (
    <section
      className="brutal-panel motion-rise overflow-hidden p-6 sm:p-8"
      style={{ animationDelay: "120ms" }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Records workspace
            </p>
            <h2 className="display-font max-w-4xl text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
              Search. inspect. version.
            </h2>
            <p className="max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Press <span className="brutal-chip mx-1 inline-flex align-middle">/</span> to
              search records by title or context.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="brutal-metric">
              <p className="metric-label">Records</p>
              <p className="metric-value text-[var(--accent)]">{records.length}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Versions</p>
              <p className="metric-value text-[var(--signal)]">{totalVersions}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Latest footprint</p>
              <p className="metric-value text-[var(--success)]">
                {formatFileSize(totalLatestBytes || 0)}
              </p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Latest</p>
              <p className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
                {latestUpload ? formatDate(latestUpload.latestVersion.uploadedAt) : "None"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="brutal-button brutal-button--ghost self-start lg:self-auto"
        >
          {isCollapsed ? "Expand list" : "Collapse list"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                placeholder="Search records by title or description"
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
                  void loadRecords(undefined);
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
                <div key={`skeleton-${index}`} className="brutal-panel animate-pulse p-5">
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

          {!loading && records.length === 0 && !listError && (
            <div className="brutal-panel brutal-grid mt-6 px-6 py-16 text-center">
              <p className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
                {emptyStateTitle}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {emptyStateDescription}
              </p>
              {trimmedSearch && (
                <div className="mt-6">
                  <button
                    onClick={() => setSearch("")}
                    className="brutal-button brutal-button--ghost"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="mt-6 space-y-4">
              {records.map((record) => {
                const isConfirming = confirmingRecordId === record.recordId;
                const isDeleting = deletingRecordId === record.recordId;

                return (
                  <article
                    key={record.recordId}
                    className="brutal-panel p-5 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[var(--line)] bg-[color-mix(in_oklch,var(--paper)_10%,var(--surface-1))] text-[var(--accent)] shadow-[4px_4px_0_var(--shadow)]">
                            <span className="display-font text-3xl leading-none">
                              {String(record.versionCount).padStart(2, "0")}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="display-font break-words text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                              {record.title}
                            </h3>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] sm:gap-3">
                              <span>{record.versionCount} version{record.versionCount === 1 ? "" : "s"}</span>
                              <span>{record.latestVersion.originalFilename}</span>
                              <span>{formatDate(record.latestVersion.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {record.description && (
                          <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
                            {record.description}
                          </p>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="brutal-callout">
                            <p className="metric-label">Latest CID</p>
                            <p className="mt-2 break-all text-sm font-semibold leading-7 text-[var(--ink)]">
                              {record.latestVersion.cid}
                            </p>
                          </div>
                          <div className="brutal-callout">
                            <p className="metric-label">Latest file</p>
                            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">
                              {record.latestVersion.originalFilename}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                              {formatFileSize(record.latestVersion.fileSize)} /{" "}
                              {record.latestVersion.mimeType || "unknown"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 xl:max-w-[18rem] xl:justify-end">
                        <Link
                          href={`/dashboard/records/${record.recordId}`}
                          className="brutal-button brutal-button--ghost"
                        >
                          Open record
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleCopyCid(record.latestVersion.cid)}
                          className="brutal-button brutal-button--ghost"
                        >
                          {copiedCid === record.latestVersion.cid ? "Copied" : "Copy CID"}
                        </button>

                        <a
                          href={record.latestVersion.gatewayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brutal-button brutal-button--signal"
                        >
                          View latest
                        </a>

                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmingRecordId(record.recordId)}
                            className="brutal-button brutal-button--danger"
                          >
                            Delete
                          </button>
                        ) : (
                          <div className="grid w-full gap-3">
                            <button
                              onClick={() => void handleDelete(record)}
                              disabled={isDeleting}
                              className="brutal-button brutal-button--danger"
                            >
                              {isDeleting ? "Deleting" : "Confirm delete"}
                            </button>
                            <button
                              onClick={() => setConfirmingRecordId(null)}
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
