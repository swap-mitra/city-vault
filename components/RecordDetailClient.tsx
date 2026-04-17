"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatFileSize, UPLOAD_ACCEPT_ATTRIBUTE, validateUploadFile } from "@/upload-validation";

type UserRole =
  | "ORG_ADMIN"
  | "RECORDS_MANAGER"
  | "REVIEWER"
  | "CONTRIBUTOR"
  | "READ_ONLY"
  | "AUDITOR"
  | null;

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

type ReviewerSummary = {
  id: string;
  name: string | null;
  email: string;
};

type ApprovalRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestNotes: string | null;
  decisionNotes: string | null;
  submittedAt: string;
  decidedAt: string | null;
  reviewer: ReviewerSummary;
  requestedBy: ReviewerSummary;
};

type RecordDetail = {
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
  latestVersion: RecordVersion;
  approvalRequests: ApprovalRequest[];
  versions: RecordVersion[];
};

type ReviewerOption = ReviewerSummary & {
  role: "ORG_ADMIN" | "RECORDS_MANAGER" | "REVIEWER";
};

type Notice = {
  type: "success" | "error";
  message: string;
};

type RecordDetailClientProps = {
  recordId: string;
  currentUserId: string;
  currentUserRole: UserRole;
};

function statusClasses(status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ARCHIVED") {
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

function approvalStatusClasses(status: ApprovalRequest["status"]) {
  if (status === "APPROVED") {
    return statusClasses("APPROVED");
  }

  if (status === "REJECTED") {
    return statusClasses("DRAFT");
  }

  return statusClasses("UNDER_REVIEW");
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function RecordDetailClient({
  recordId,
  currentUserId,
  currentUserRole,
}: RecordDetailClientProps) {
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [decidingReview, setDecidingReview] = useState<"approve" | "reject" | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  const latestVersion = useMemo(() => record?.latestVersion ?? null, [record]);
  const canManageWorkflow =
    currentUserRole === "ORG_ADMIN" || currentUserRole === "RECORDS_MANAGER";
  const canContribute =
    canManageWorkflow || currentUserRole === "CONTRIBUTOR" || currentUserRole === null;
  const canSubmitForReview =
    !!record && record.status === "DRAFT" && (canManageWorkflow || currentUserRole === "CONTRIBUTOR");
  const canAddVersion = !!record && record.status === "DRAFT" && canContribute;
  const canDecideReview =
    !!record &&
    record.status === "UNDER_REVIEW" &&
    (canManageWorkflow || record.reviewer?.id === currentUserId);
  const canArchiveRecord = !!record && record.status === "APPROVED" && canManageWorkflow;

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

  const loadReviewers = useCallback(async () => {
    if (!(canManageWorkflow || currentUserRole === "CONTRIBUTOR")) {
      return;
    }

    try {
      const response = await fetch("/api/reviewers", {
        cache: "no-store",
      });
      const data = (await response.json()) as ReviewerOption[] & { error?: string };

      if (!response.ok) {
        return;
      }

      setReviewers(data);
      setReviewerId((current) => current || data[0]?.id || "");
    } catch (reviewersError) {
      console.error(reviewersError);
    }
  }, [canManageWorkflow, currentUserRole]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    void loadReviewers();
  }, [loadReviewers]);

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

  const handleSubmitForReview = async () => {
    if (!reviewerId) {
      setNotice({ type: "error", message: "Choose a reviewer before submitting." });
      return;
    }

    setSubmittingReview(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewerId, requestNotes: reviewNotes }),
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit record for review.");
      }

      setRecord(data);
      setDecisionNotes("");
      setNotice({ type: "success", message: "Record submitted for review." });
    } catch (submitError) {
      console.error(submitError);
      setNotice({
        type: "error",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Failed to submit record for review.",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDecision = async (decision: "approve" | "reject") => {
    setDecidingReview(decision);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/review/${decision}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decisionNotes }),
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error ||
            (decision === "approve"
              ? "Failed to approve record."
              : "Failed to reject record.")
        );
      }

      setRecord(data);
      setNotice({
        type: "success",
        message:
          decision === "approve" ? "Record approved." : "Record sent back to draft.",
      });
    } catch (decisionError) {
      console.error(decisionError);
      setNotice({
        type: "error",
        message:
          decisionError instanceof Error
            ? decisionError.message
            : decision === "approve"
              ? "Failed to approve record."
              : "Failed to reject record.",
      });
    } finally {
      setDecidingReview(null);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/archive`, {
        method: "POST",
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive record.");
      }

      setRecord(data);
      setNotice({ type: "success", message: "Record archived." });
    } catch (archiveError) {
      console.error(archiveError);
      setNotice({
        type: "error",
        message:
          archiveError instanceof Error ? archiveError.message : "Failed to archive record.",
      });
    } finally {
      setArchiving(false);
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
        <Link href="/dashboard/review" className="brutal-button brutal-button--ghost">
          Review queue
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
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="display-font text-6xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-7xl">
                  {record.title}
                </h1>
                <span
                  className={`inline-flex border-[3px] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClasses(
                    record.status
                  )}`}
                >
                  {formatStatus(record.status)}
                </span>
              </div>
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
              <p className="metric-label">Reviewer</p>
              <p className="text-sm font-semibold leading-7 text-[var(--ink)]">
                {record.reviewer?.email || "Unassigned"}
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="brutal-panel p-6 sm:p-8">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Workflow state
            </p>
            <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
              Govern the record.
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="brutal-callout">
                <p className="metric-label">Submitted</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">
                  {record.submittedForReviewAt ? formatDate(record.submittedForReviewAt) : "Not submitted"}
                </p>
              </div>
              <div className="brutal-callout">
                <p className="metric-label">Approved</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">
                  {record.approvedAt ? formatDate(record.approvedAt) : "Not approved"}
                </p>
              </div>
            </div>

            {record.reviewNotes && (
              <div className="brutal-callout">
                <p className="metric-label">Current note</p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{record.reviewNotes}</p>
              </div>
            )}

            {canSubmitForReview ? (
              <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                <p className="metric-label">Submit draft for review</p>
                <select
                  value={reviewerId}
                  onChange={(event) => setReviewerId(event.target.value)}
                  className="brutal-input"
                >
                  <option value="">Choose reviewer</option>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {reviewer.name || reviewer.email} / {reviewer.role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={4}
                  placeholder="Add context for the reviewer"
                  className="brutal-input min-h-[8rem]"
                />
                <button
                  onClick={() => void handleSubmitForReview()}
                  disabled={submittingReview}
                  className="brutal-button"
                >
                  {submittingReview ? "Submitting" : "Submit for review"}
                </button>
              </div>
            ) : (
              <div className="brutal-callout">
                <p className="metric-label">Next action</p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                  {record.status === "DRAFT"
                    ? "Drafts can be edited and versioned. Submit once the record is ready for review."
                    : record.status === "UNDER_REVIEW"
                      ? "This record is waiting for a reviewer decision."
                      : record.status === "APPROVED"
                        ? "The record is approved and can be archived by a records manager."
                        : "This record is archived and locked from further workflow changes."}
                </p>
              </div>
            )}

            {canDecideReview && (
              <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                <p className="metric-label">Reviewer decision</p>
                <textarea
                  value={decisionNotes}
                  onChange={(event) => setDecisionNotes(event.target.value)}
                  rows={4}
                  placeholder="Capture the approval or rejection note"
                  className="brutal-input min-h-[8rem]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => void handleDecision("approve")}
                    disabled={decidingReview !== null}
                    className="brutal-button"
                  >
                    {decidingReview === "approve" ? "Approving" : "Approve"}
                  </button>
                  <button
                    onClick={() => void handleDecision("reject")}
                    disabled={decidingReview !== null}
                    className="brutal-button brutal-button--danger"
                  >
                    {decidingReview === "reject" ? "Rejecting" : "Reject to draft"}
                  </button>
                </div>
              </div>
            )}

            {canArchiveRecord && (
              <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                <p className="metric-label">Archive approved record</p>
                <p className="text-sm leading-7 text-[var(--ink)]">
                  Move this approved record into its archived state. Sprint 3 keeps archive as a terminal workflow state.
                </p>
                <button
                  onClick={() => void handleArchive()}
                  disabled={archiving}
                  className="brutal-button brutal-button--ghost"
                >
                  {archiving ? "Archiving" : "Archive record"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="brutal-panel p-6 sm:p-8">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Add version
            </p>
            <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
              Append the next file.
            </h2>
            <p className="max-w-xl text-base leading-8 text-[var(--muted)]">
              Each upload becomes the next version on this record. Draft is the only editable state in Sprint 3.
            </p>
          </div>

          <div className="mt-6 space-y-5">
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
                    {canAddVersion ? "Waiting" : "Locked"}
                  </p>
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    {canAddVersion
                      ? "Choose one file to create the next record version."
                      : "Version uploads are disabled once a record leaves draft."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="record-version-file" className="brutal-button brutal-button--ghost cursor-pointer">
                Browse file
              </label>
              <button
                onClick={() => void handleAddVersion()}
                disabled={!canAddVersion || uploading}
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
            Approval trail
          </p>
          <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
            Review decisions so far.
          </h2>
        </div>

        <div className="mt-6 space-y-4">
          {record.approvalRequests.length === 0 ? (
            <div className="brutal-callout">
              <p className="text-sm leading-7 text-[var(--ink)]">
                No approval requests have been created for this record yet.
              </p>
            </div>
          ) : (
            record.approvalRequests.map((approvalRequest) => (
              <article key={approvalRequest.id} className="brutal-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
                        {approvalRequest.reviewer.name || approvalRequest.reviewer.email}
                      </p>
                      <span
                        className={`inline-flex border-[3px] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${approvalStatusClasses(
                          approvalRequest.status
                        )}`}
                      >
                        {formatStatus(approvalRequest.status)}
                      </span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                      Requested by {approvalRequest.requestedBy.email} on {formatDate(approvalRequest.submittedAt)}
                    </p>
                    {approvalRequest.requestNotes && (
                      <div className="brutal-callout">
                        <p className="metric-label">Request note</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                          {approvalRequest.requestNotes}
                        </p>
                      </div>
                    )}
                    {approvalRequest.decisionNotes && (
                      <div className="brutal-callout">
                        <p className="metric-label">Decision note</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                          {approvalRequest.decisionNotes}
                        </p>
                      </div>
                    )}
                  </div>
                  {approvalRequest.decidedAt && (
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                      Decided {formatDate(approvalRequest.decidedAt)}
                    </p>
                  )}
                </div>
              </article>
            ))
          )}
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
