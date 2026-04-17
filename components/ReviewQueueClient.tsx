"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ReviewerSummary = {
  id: string;
  name: string | null;
  email: string;
};

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
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ARCHIVED";
  reviewNotes: string | null;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  reviewer: ReviewerSummary | null;
  latestVersion: RecordVersionSummary;
};

type ReviewQueueResponse = {
  records: RecordSummary[];
  error?: string;
};

function statusClasses(status: RecordSummary["status"]) {
  if (status === "APPROVED") {
    return "border-[var(--success)] bg-[color-mix(in_oklch,var(--success)_18%,var(--surface-0))] text-[var(--ink)]";
  }

  if (status === "UNDER_REVIEW") {
    return "border-[var(--signal)] bg-[color-mix(in_oklch,var(--signal)_20%,var(--surface-0))] text-[var(--ink)]";
  }

  if (status === "ARCHIVED") {
    return "border-[var(--muted)] bg-[color-mix(in_oklch,var(--line)_20%,var(--surface-0))] text-[var(--ink)]";
  }

  return "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_16%,var(--surface-0))] text-[var(--ink)]";
}

export function ReviewQueueClient() {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/review-queue", { cache: "no-store" });
      const data = (await response.json()) as ReviewQueueResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to load review queue.");
      }

      setRecords(data.records);
    } catch (queueError) {
      console.error(queueError);
      setError(
        queueError instanceof Error ? queueError.message : "Failed to load review queue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <div className="brutal-panel p-6 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
        Loading review queue
      </div>
    );
  }

  if (error) {
    return <div className="brutal-callout brutal-callout--error">{error}</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="brutal-button brutal-button--ghost">
          Back to records
        </Link>
        <button onClick={() => void loadQueue()} className="brutal-button brutal-button--ghost">
          Refresh queue
        </button>
      </div>

      {records.length === 0 ? (
        <div className="brutal-panel brutal-grid px-6 py-16 text-center">
          <p className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
            No records are waiting for review.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Submitted records will appear here once contributors send them into the review flow.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <article key={record.recordId} className="brutal-panel p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                      {record.title}
                    </h2>
                    <span
                      className={`inline-flex border-[3px] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClasses(
                        record.status
                      )}`}
                    >
                      {record.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    <span>{record.versionCount} versions</span>
                    <span>{record.reviewer?.email || "No reviewer"}</span>
                    <span>
                      {record.submittedForReviewAt
                        ? `Submitted ${formatDate(record.submittedForReviewAt)}`
                        : "Not submitted"}
                    </span>
                  </div>
                  {record.reviewNotes && (
                    <div className="brutal-callout">
                      <p className="metric-label">Review note</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{record.reviewNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  <Link
                    href={`/dashboard/records/${record.recordId}`}
                    className="brutal-button brutal-button--signal"
                  >
                    Open record
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
