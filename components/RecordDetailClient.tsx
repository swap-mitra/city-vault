"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatFileSize, UPLOAD_ACCEPT_ATTRIBUTE, validateUploadFile } from "@/upload-validation";

type RecordVersion = {
  id: string;
  versionNumber: number;
  cid: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

type RecordDetail = {
  recordId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestVersion: RecordVersion;
  versions: RecordVersion[];
};

type Notice = {
  type: "success" | "error";
  message: string;
};

type RecordDetailClientProps = {
  recordId: string;
};

export function RecordDetailClient({ recordId }: RecordDetailClientProps) {
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  const latestVersion = useMemo(() => record?.latestVersion ?? null, [record]);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/records/${recordId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load record.");
      }

      setRecord(data);
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load record."
      );
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const assignFile = (nextFile: File | null) => {
    if (!nextFile) {
      setFile(null);
      return;
    }

    const validationError = validateUploadFile(nextFile);

    if (validationError) {
      setNotice({ type: "error", message: validationError });
      return;
    }

    setFile(nextFile);
  };

  const handleAddVersion = async () => {
    if (!file) {
      setNotice({ type: "error", message: "Choose a file to add a new version." });
      return;
    }

    setUploading(true);
    setNotice(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/records/${recordId}/versions`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add record version.");
      }

      setRecord(data);
      setFile(null);
      setNotice({
        type: "success",
        message: `Version ${data.latestVersion.versionNumber} added successfully.`,
      });
    } catch (uploadError) {
      console.error(uploadError);
      setNotice({
        type: "error",
        message:
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to add record version.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyCid = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      setCopiedCid(cid);
      setNotice({ type: "success", message: "CID copied to clipboard." });
      window.setTimeout(() => {
        setCopiedCid((current) => (current === cid ? null : current));
      }, 1800);
    } catch {
      setNotice({ type: "error", message: "Failed to copy CID." });
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <div className="brutal-panel p-6 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
        Loading record
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="brutal-button brutal-button--ghost">
          Back to records
        </Link>
        <div className="brutal-callout brutal-callout--error text-sm font-semibold leading-7">
          {error || "Record not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="brutal-button brutal-button--ghost">
          Back to records
        </Link>
        {latestVersion && (
          <a
            href={latestVersion.gatewayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-button brutal-button--signal"
          >
            View latest file
          </a>
        )}
      </div>

      {notice && (
        <div
          className={`border-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] shadow-[8px_8px_0_var(--shadow)] ${
            notice.type === "success"
              ? "border-[var(--success)] bg-[color-mix(in_oklch,var(--success)_18%,var(--surface-0))] text-[var(--ink)]"
              : "border-[var(--danger)] bg-[color-mix(in_oklch,var(--danger)_20%,var(--surface-0))] text-[var(--ink)]"
          }`}
        >
          {notice.message}
        </div>
      )}

      <section className="brutal-panel brutal-panel--paper p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Record detail
            </p>
            <div className="space-y-3">
              <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                {record.title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                {record.description || "No additional description has been added to this record yet."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="brutal-metric">
              <p className="metric-label">Versions</p>
              <p className="metric-value text-[var(--accent)]">{record.versionCount}</p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Updated</p>
              <p className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
                {formatDate(record.updatedAt)}
              </p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Latest file</p>
              <p className="text-sm font-semibold leading-7 text-[var(--ink)]">
                {latestVersion?.originalFilename}
              </p>
            </div>
            <div className="brutal-metric">
              <p className="metric-label">Latest size</p>
              <p className="text-sm font-semibold leading-7 text-[var(--ink)]">
                {latestVersion ? formatFileSize(latestVersion.fileSize) : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="brutal-panel p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Add version
            </p>
            <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
              Append the next file.
            </h2>
            <p className="max-w-xl text-base leading-8 text-[var(--muted)]">
              Each upload becomes the next version on this record. Nothing gets overwritten.
            </p>
          </div>

          <div className="space-y-5">
            <input
              id="record-version-file"
              type="file"
              accept={UPLOAD_ACCEPT_ATTRIBUTE}
              onChange={(event) => assignFile(event.target.files?.[0] || null)}
              className="hidden"
            />

            <div className="brutal-panel brutal-panel--paper p-5">
              {file ? (
                <div className="space-y-3">
                  <p className="display-font break-all text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                    {file.name}
                  </p>
                  <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {file.type || "Unknown type"} / {formatFileSize(file.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                    Waiting
                  </p>
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    Choose one file to create the next record version.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="record-version-file" className="brutal-button brutal-button--ghost cursor-pointer">
                Browse file
              </label>
              <button
                onClick={handleAddVersion}
                disabled={uploading}
                className="brutal-button"
              >
                {uploading ? "Uploading" : "Add version"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="brutal-panel p-6 sm:p-8">
        <div className="space-y-4">
          <p className="section-kicker">
            <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
            Version history
          </p>
          <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Full version trail.
          </h2>
        </div>

        <div className="mt-6 space-y-4">
          {record.versions.map((version) => (
            <article key={version.id} className="brutal-panel p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[var(--line)] bg-[color-mix(in_oklch,var(--paper)_10%,var(--surface-1))] text-[var(--accent)] shadow-[4px_4px_0_var(--shadow)]">
                      <span className="display-font text-3xl leading-none">
                        {String(version.versionNumber).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="display-font break-words text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                        {version.originalFilename}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] sm:gap-3">
                        <span>{formatFileSize(version.fileSize)}</span>
                        <span>{version.mimeType || "unknown"}</span>
                        <span>{formatDate(version.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="brutal-callout">
                    <p className="metric-label">CID</p>
                    <p className="mt-2 break-all text-sm font-semibold leading-7 text-[var(--ink)]">
                      {version.cid}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:max-w-[17rem] xl:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCopyCid(version.cid)}
                    className="brutal-button brutal-button--ghost"
                  >
                    {copiedCid === version.cid ? "Copied" : "Copy CID"}
                  </button>
                  <a
                    href={version.gatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutal-button brutal-button--signal"
                  >
                    View file
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
