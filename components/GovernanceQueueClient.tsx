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

type RetentionPolicySummary = {
  id: string;
  name: string;
  description: string | null;
  retentionDays: number;
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
  retentionAssignedAt: string | null;
  retentionExpiresAt: string | null;
  activeHoldCount: number;
  isEligibleForDisposition: boolean;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  reviewer: ReviewerSummary | null;
  retentionPolicy: RetentionPolicySummary | null;
  latestVersion: RecordVersionSummary;
};

type GovernanceQueueResponse = {
  dueForDisposition: RecordSummary[];
  heldRecords: RecordSummary[];
  archivedRecords: RecordSummary[];
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

function RecordCard({ record }: { record: RecordSummary }) {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  return (
    <article className="brutal-panel p-5">
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
            {record.activeHoldCount > 0 && (
              <span className="inline-flex border-[3px] border-[var(--danger)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                Hold x{record.activeHoldCount}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            <span>{record.versionCount} versions</span>
            {record.reviewer && <span>{record.reviewer.email}</span>}
            {record.retentionPolicy && <span>{record.retentionPolicy.name}</span>}
            {record.retentionExpiresAt && <span>Due {formatDate(record.retentionExpiresAt)}</span>}
          </div>
          {record.reviewNotes && (
            <div className="brutal-callout">
              <p className="metric-label">Workflow note</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{record.reviewNotes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <Link href={`/dashboard/records/${record.recordId}`} className="brutal-button brutal-button--signal">
            Open record
          </Link>
        </div>
      </div>
    </article>
  );
}

export function GovernanceQueueClient() {
  const [queue, setQueue] = useState<GovernanceQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/governance/queue", { cache: "no-store" });
      const data = (await response.json()) as GovernanceQueueResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to load governance queue.");
      }

      setQueue(data);
    } catch (queueError) {
      console.error(queueError);
      setError(
        queueError instanceof Error ? queueError.message : "Failed to load governance queue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  if (loading) {
    return (
      <div className="brutal-panel p-6 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
        Loading governance queue
      </div>
    );
  }

  if (error) {
    return <div className="brutal-callout brutal-callout--error">{error}</div>;
  }

  const due = queue?.dueForDisposition ?? [];
  const held = queue?.heldRecords ?? [];
  const archived = queue?.archivedRecords ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="brutal-button brutal-button--ghost">
          Back to records
        </Link>
        <Link href="/dashboard/review" className="brutal-button brutal-button--ghost">
          Review queue
        </Link>
        <button onClick={() => void loadQueue()} className="brutal-button brutal-button--ghost">
          Refresh governance
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="brutal-metric">
          <p className="metric-label">Due for disposition</p>
          <p className="metric-value text-[var(--danger)]">{due.length}</p>
        </div>
        <div className="brutal-metric">
          <p className="metric-label">Active holds</p>
          <p className="metric-value text-[var(--signal)]">{held.length}</p>
        </div>
        <div className="brutal-metric">
          <p className="metric-label">Archived records</p>
          <p className="metric-value text-[var(--accent)]">{archived.length}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="section-kicker">
            <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
            Due for disposition
          </p>
        </div>
        {due.length === 0 ? (
          <div className="brutal-callout">
            <p className="text-sm leading-7 text-[var(--ink)]">No archived records are due for disposition yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {due.map((record) => (
              <RecordCard key={record.recordId} record={record} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="section-kicker">
            <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
            Active holds
          </p>
        </div>
        {held.length === 0 ? (
          <div className="brutal-callout">
            <p className="text-sm leading-7 text-[var(--ink)]">No records are on hold.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {held.map((record) => (
              <RecordCard key={record.recordId} record={record} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="section-kicker">
            <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
            Archived estate
          </p>
        </div>
        {archived.length === 0 ? (
          <div className="brutal-callout">
            <p className="text-sm leading-7 text-[var(--ink)]">No records have been archived yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archived.map((record) => (
              <RecordCard key={record.recordId} record={record} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
