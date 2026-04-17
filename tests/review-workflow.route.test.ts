import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockRecordConflictError extends Error {
    status: number;
    recordId: string;

    constructor(message: string, recordId: string, status = 409) {
      super(message);
      this.name = "RecordConflictError";
      this.status = status;
      this.recordId = recordId;
    }
  }

  return {
    getCurrentUser: vi.fn(),
    submitRecordForReview: vi.fn(),
    approveRecordReview: vi.fn(),
    rejectRecordReview: vi.fn(),
    archiveRecord: vi.fn(),
    listReviewQueue: vi.fn(),
    RecordConflictError: MockRecordConflictError,
  };
});

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  submitRecordForReview: mocks.submitRecordForReview,
  approveRecordReview: mocks.approveRecordReview,
  rejectRecordReview: mocks.rejectRecordReview,
  archiveRecord: mocks.archiveRecord,
  listReviewQueue: mocks.listReviewQueue,
  RecordConflictError: mocks.RecordConflictError,
}));

import { POST as submitReview } from "@/app/api/records/[id]/review/route";
import { POST as approveReview } from "@/app/api/records/[id]/review/approve/route";
import { POST as archiveRecordRoute } from "@/app/api/records/[id]/archive/route";
import { GET as reviewQueue } from "@/app/api/review-queue/route";

describe("review workflow routes", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.submitRecordForReview.mockReset();
    mocks.approveRecordReview.mockReset();
    mocks.rejectRecordReview.mockReset();
    mocks.archiveRecord.mockReset();
    mocks.listReviewQueue.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "CONTRIBUTOR",
    });
  });

  it("submits a draft record for review", async () => {
    mocks.submitRecordForReview.mockResolvedValue({
      recordId: "record-1",
      status: "UNDER_REVIEW",
    });

    const response = await submitReview(
      new Request("http://localhost/api/records/record-1/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewerId: "reviewer-1", requestNotes: "Please check" }),
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.submitRecordForReview).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "record-1",
        reviewerId: "reviewer-1",
        requestNotes: "Please check",
      })
    );
  });

  it("returns workflow conflicts cleanly", async () => {
    mocks.submitRecordForReview.mockRejectedValue(
      new mocks.RecordConflictError("Only draft records can be changed.", "record-1")
    );

    const response = await submitReview(
      new Request("http://localhost/api/records/record-1/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewerId: "reviewer-1" }),
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Only draft records can be changed.",
    });
  });

  it("approves a record under review", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "reviewer-1",
      email: "reviewer@example.com",
      name: "Reviewer",
      membershipId: "membership-2",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "REVIEWER",
    });
    mocks.approveRecordReview.mockResolvedValue({
      recordId: "record-1",
      status: "APPROVED",
    });

    const response = await approveReview(
      new Request("http://localhost/api/records/record-1/review/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decisionNotes: "Looks good" }),
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.approveRecordReview).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "record-1",
        decisionNotes: "Looks good",
      })
    );
  });

  it("archives approved records", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "manager-1",
      email: "manager@example.com",
      name: "Manager",
      membershipId: "membership-3",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "RECORDS_MANAGER",
    });
    mocks.archiveRecord.mockResolvedValue({
      recordId: "record-1",
      status: "ARCHIVED",
    });

    const response = await archiveRecordRoute(
      new Request("http://localhost/api/records/record-1/archive", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.archiveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "record-1" })
    );
  });

  it("lists the review queue", async () => {
    mocks.listReviewQueue.mockResolvedValue({
      records: [
        {
          recordId: "record-1",
          status: "UNDER_REVIEW",
        },
      ],
    });

    const response = await reviewQueue();

    expect(response.status).toBe(200);
    expect(mocks.listReviewQueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" })
    );
    await expect(response.json()).resolves.toMatchObject({
      records: [{ recordId: "record-1", status: "UNDER_REVIEW" }],
    });
  });
});
