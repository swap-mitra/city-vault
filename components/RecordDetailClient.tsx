"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

type RetentionPolicy = {
  id: string;
  name: string;
  description: string | null;
  retentionDays: number;
};

type LegalHold = {
  id: string;
  reason: string;
  appliedByUserId: string;
  appliedByUserEmail: string | null;
  releasedByUserId: string | null;
  releasedByUserEmail: string | null;
  createdAt: string;
  releasedAt: string | null;
  isActive: boolean;
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
  retentionAssignedAt: string | null;
  retentionExpiresAt: string | null;
  activeHoldCount: number;
  isEligibleForDisposition: boolean;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  reviewer: ReviewerSummary | null;
  retentionPolicy: RetentionPolicy | null;
  latestVersion: RecordVersion;
  approvalRequests: ApprovalRequest[];
  legalHolds: LegalHold[];
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
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [selectedRetentionPolicyId, setSelectedRetentionPolicyId] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [decidingReview, setDecidingReview] = useState<"approve" | "reject" | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [assigningRetention, setAssigningRetention] = useState(false);
  const [placingHold, setPlacingHold] = useState(false);
  const [releasingHoldId, setReleasingHoldId] = useState<string | null>(null);
  const [disposing, setDisposing] = useState(false);
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
  const canManageGovernance = canManageWorkflow;
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
      setSelectedRetentionPolicyId((current) => current || data.retentionPolicy?.id || "");
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

  const loadRetentionPolicies = useCallback(async () => {
    if (!canManageGovernance) {
      return;
    }

    try {
      const response = await fetch("/api/retention-policies", {
        cache: "no-store",
      });
      const data = (await response.json()) as RetentionPolicy[] & { error?: string };

      if (!response.ok) {
        return;
      }

      setRetentionPolicies(data);
      setSelectedRetentionPolicyId((current) => current || data[0]?.id || "");
    } catch (policiesError) {
      console.error(policiesError);
    }
  }, [canManageGovernance]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    void loadReviewers();
  }, [loadReviewers]);

  useEffect(() => {
    void loadRetentionPolicies();
  }, [loadRetentionPolicies]);

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

  const handleAssignRetention = async () => {
    if (!selectedRetentionPolicyId) {
      setNotice({ type: "error", message: "Choose a retention policy first." });
      return;
    }

    setAssigningRetention(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/retention`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ retentionPolicyId: selectedRetentionPolicyId }),
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign retention policy.");
      }

      setRecord(data);
      setNotice({ type: "success", message: "Retention policy assigned." });
    } catch (assignError) {
      console.error(assignError);
      setNotice({
        type: "error",
        message:
          assignError instanceof Error
            ? assignError.message
            : "Failed to assign retention policy.",
      });
    } finally {
      setAssigningRetention(false);
    }
  };

  const handleCreateHold = async () => {
    if (!holdReason.trim()) {
      setNotice({ type: "error", message: "Add a reason for the legal hold." });
      return;
    }

    setPlacingHold(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: holdReason }),
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to place legal hold.");
      }

      setRecord(data);
      setHoldReason("");
      setNotice({ type: "success", message: "Legal hold placed." });
    } catch (holdError) {
      console.error(holdError);
      setNotice({
        type: "error",
        message:
          holdError instanceof Error ? holdError.message : "Failed to place legal hold.",
      });
    } finally {
      setPlacingHold(false);
    }
  };

  const handleReleaseHold = async (holdId: string) => {
    setReleasingHoldId(holdId);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/holds/${holdId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as RecordDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to release legal hold.");
      }

      setRecord(data);
      setNotice({ type: "success", message: "Legal hold released." });
    } catch (releaseError) {
      console.error(releaseError);
      setNotice({
        type: "error",
        message:
          releaseError instanceof Error
            ? releaseError.message
            : "Failed to release legal hold.",
      });
    } finally {
      setReleasingHoldId(null);
    }
  };

  const handleDispose = async () => {
    setDisposing(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/records/${recordId}/dispose`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to dispose record.");
      }

      router.push("/dashboard/governance");
      router.refresh();
    } catch (disposeError) {
      console.error(disposeError);
      setNotice({
        type: "error",
        message:
          disposeError instanceof Error ? disposeError.message : "Failed to dispose record.",
      });
    } finally {
      setDisposing(false);
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
        <Link href="/dashboard/governance" className="brutal-button brutal-button--ghost">
          Governance queue
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
                {record.activeHoldCount > 0 && (
                  <span className="inline-flex border-[3px] border-[var(--danger)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                    Hold x{record.activeHoldCount}
                  </span>
                )}
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
              <p className="metric-label">Retention</p>
              <p className="text-sm font-semibold leading-7 text-[var(--ink)]">
                {record.retentionPolicy?.name || "Unassigned"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="brutal-panel p-6 sm:p-8">
            <div className="space-y-4">
              <p className="section-kicker">
                <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
                Workflow state
              </p>
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
                          : "This record is archived and now follows retention and hold controls."}
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
                    Move this approved record into its archived state so it enters retention and disposition tracking.
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
                Governance controls
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="brutal-callout">
                  <p className="metric-label">Assigned at</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">
                    {record.retentionAssignedAt ? formatDate(record.retentionAssignedAt) : "Not assigned"}
                  </p>
                </div>
                <div className="brutal-callout">
                  <p className="metric-label">Expires at</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[var(--ink)]">
                    {record.retentionExpiresAt ? formatDate(record.retentionExpiresAt) : "Not scheduled"}
                  </p>
                </div>
              </div>

              {canManageGovernance && (
                <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                  <p className="metric-label">Assign retention policy</p>
                  <select
                    value={selectedRetentionPolicyId}
                    onChange={(event) => setSelectedRetentionPolicyId(event.target.value)}
                    className="brutal-input"
                  >
                    <option value="">Choose retention policy</option>
                    {retentionPolicies.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name} / {policy.retentionDays} days
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleAssignRetention()}
                    disabled={assigningRetention}
                    className="brutal-button"
                  >
                    {assigningRetention ? "Assigning" : "Save retention"}
                  </button>
                </div>
              )}

              <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                <p className="metric-label">Legal holds</p>
                {canManageGovernance && (
                  <>
                    <textarea
                      value={holdReason}
                      onChange={(event) => setHoldReason(event.target.value)}
                      rows={3}
                      placeholder="Add a reason for a legal hold"
                      className="brutal-input min-h-[7rem]"
                    />
                    <button
                      onClick={() => void handleCreateHold()}
                      disabled={placingHold}
                      className="brutal-button brutal-button--danger"
                    >
                      {placingHold ? "Placing hold" : "Place legal hold"}
                    </button>
                  </>
                )}

                {record.legalHolds.length === 0 ? (
                  <div className="brutal-callout">
                    <p className="text-sm leading-7 text-[var(--ink)]">No legal holds are attached to this record.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {record.legalHolds.map((hold) => (
                      <div key={hold.id} className="brutal-callout">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold leading-7 text-[var(--ink)]">{hold.reason}</p>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                              Added {formatDate(hold.createdAt)} by {hold.appliedByUserEmail || hold.appliedByUserId}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                              {hold.isActive
                                ? "Active hold"
                                : `Released ${hold.releasedAt ? formatDate(hold.releasedAt) : ""}`}
                            </p>
                          </div>
                          {canManageGovernance && hold.isActive && (
                            <button
                              onClick={() => void handleReleaseHold(hold.id)}
                              disabled={releasingHoldId === hold.id}
                              className="brutal-button brutal-button--ghost"
                            >
                              {releasingHoldId === hold.id ? "Releasing" : "Release hold"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {record.status === "ARCHIVED" && (
                <div className="space-y-4 border-[3px] border-[var(--line)] bg-[var(--surface-1)] p-5 shadow-[6px_6px_0_var(--shadow)]">
                  <p className="metric-label">Disposition</p>
                  <p className="text-sm leading-7 text-[var(--ink)]">
                    {record.isEligibleForDisposition
                      ? "This archived record is eligible for disposition."
                      : record.activeHoldCount > 0
                        ? "Disposition is blocked while a legal hold is active."
                        : record.retentionExpiresAt
                          ? "This record is archived but not yet due for disposition."
                          : "Assign a retention policy before this record can enter disposition."}
                  </p>
                  {canManageGovernance && (
                    <button
                      onClick={() => void handleDispose()}
                      disabled={!record.isEligibleForDisposition || disposing}
                      className="brutal-button brutal-button--danger"
                    >
                      {disposing ? "Disposing" : "Dispose record"}
                    </button>
                  )}
                </div>
              )}
            </div>
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
              Each upload becomes the next version on this record. Draft is still the only editable state.
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
                      : "Version uploads are disabled once a record leaves draft or is on hold."}
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




