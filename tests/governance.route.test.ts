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
    listGovernanceQueue: vi.fn(),
    listRetentionPolicies: vi.fn(),
    assignRetentionPolicy: vi.fn(),
    createLegalHold: vi.fn(),
    releaseLegalHold: vi.fn(),
    disposeRecord: vi.fn(),
    RecordConflictError: MockRecordConflictError,
  };
});

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  listGovernanceQueue: mocks.listGovernanceQueue,
  listRetentionPolicies: mocks.listRetentionPolicies,
  assignRetentionPolicy: mocks.assignRetentionPolicy,
  createLegalHold: mocks.createLegalHold,
  releaseLegalHold: mocks.releaseLegalHold,
  disposeRecord: mocks.disposeRecord,
  RecordConflictError: mocks.RecordConflictError,
}));

import { GET as governanceQueue } from "@/app/api/governance/queue/route";
import { GET as retentionPolicies } from "@/app/api/retention-policies/route";
import { POST as assignRetention } from "@/app/api/records/[id]/retention/route";
import { POST as createHold } from "@/app/api/records/[id]/holds/route";
import { DELETE as releaseHold } from "@/app/api/records/[id]/holds/[holdId]/route";
import { POST as disposeRecordRoute } from "@/app/api/records/[id]/dispose/route";

describe("governance routes", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.listGovernanceQueue.mockReset();
    mocks.listRetentionPolicies.mockReset();
    mocks.assignRetentionPolicy.mockReset();
    mocks.createLegalHold.mockReset();
    mocks.releaseLegalHold.mockReset();
    mocks.disposeRecord.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "manager-1",
      email: "manager@example.com",
      name: "Manager",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "RECORDS_MANAGER",
    });
  });

  it("lists governance queues", async () => {
    mocks.listGovernanceQueue.mockResolvedValue({
      dueForDisposition: [{ recordId: "record-1", status: "ARCHIVED" }],
      heldRecords: [],
      archivedRecords: [{ recordId: "record-1", status: "ARCHIVED" }],
    });

    const response = await governanceQueue();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      dueForDisposition: [{ recordId: "record-1", status: "ARCHIVED" }],
    });
  });

  it("lists retention policies", async () => {
    mocks.listRetentionPolicies.mockResolvedValue([
      { id: "policy-1", name: "Standard 1 year", retentionDays: 365 },
    ]);

    const response = await retentionPolicies();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { id: "policy-1", name: "Standard 1 year", retentionDays: 365 },
    ]);
  });

  it("assigns a retention policy", async () => {
    mocks.assignRetentionPolicy.mockResolvedValue({
      recordId: "record-1",
      retentionPolicy: { id: "policy-1", name: "Standard 1 year" },
    });

    const response = await assignRetention(
      new Request("http://localhost/api/records/record-1/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionPolicyId: "policy-1" }),
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.assignRetentionPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "record-1", retentionPolicyId: "policy-1" })
    );
  });

  it("creates a legal hold", async () => {
    mocks.createLegalHold.mockResolvedValue({
      recordId: "record-1",
      activeHoldCount: 1,
    });

    const response = await createHold(
      new Request("http://localhost/api/records/record-1/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Pending litigation" }),
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.createLegalHold).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "record-1", reason: "Pending litigation" })
    );
  });

  it("releases a legal hold", async () => {
    mocks.releaseLegalHold.mockResolvedValue({
      recordId: "record-1",
      activeHoldCount: 0,
    });

    const response = await releaseHold(
      new Request("http://localhost/api/records/record-1/holds/hold-1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "record-1", holdId: "hold-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.releaseLegalHold).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: "record-1", holdId: "hold-1" })
    );
  });

  it("returns disposition conflicts cleanly", async () => {
    mocks.disposeRecord.mockRejectedValue(
      new mocks.RecordConflictError("This record is not yet due for disposition.", "record-1")
    );

    const response = await disposeRecordRoute(
      new Request("http://localhost/api/records/record-1/dispose", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "This record is not yet due for disposition.",
    });
  });
});
