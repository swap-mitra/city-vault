"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Role =
  | "ORG_ADMIN"
  | "RECORDS_MANAGER"
  | "REVIEWER"
  | "CONTRIBUTOR"
  | "READ_ONLY"
  | "AUDITOR";

type MembershipStatus = "ACTIVE" | "DISABLED";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
};

type MemberSummary = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  workspaceId: string;
  workspaceName: string;
  isDefault: boolean;
  status: MembershipStatus;
  createdAt: string;
};

type TenantAdminOverview = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  activeWorkspace: {
    id: string;
    name: string;
    slug: string;
  };
  workspaces: WorkspaceSummary[];
  members: MemberSummary[];
};

const roles: Role[] = [
  "ORG_ADMIN",
  "RECORDS_MANAGER",
  "REVIEWER",
  "CONTRIBUTOR",
  "READ_ONLY",
  "AUDITOR",
];

function formatRole(role: Role) {
  return role.replaceAll("_", " ");
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

function roleDescription(role: Role) {
  const descriptions: Record<Role, string> = {
    ORG_ADMIN: "Tenant, records, workflow, governance, and audit administration.",
    RECORDS_MANAGER: "Records, workflow, governance, and audit operations.",
    REVIEWER: "Review queue and approval decisions.",
    CONTRIBUTOR: "Record creation, version upload, and review submission.",
    READ_ONLY: "Record visibility without mutation rights.",
    AUDITOR: "Read-only records plus governance and audit visibility.",
  };

  return descriptions[role];
}

export function AdminConsoleClient() {
  const [overview, setOverview] = useState<TenantAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberWorkspaceId, setMemberWorkspaceId] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("CONTRIBUTOR");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => overview?.members.filter((member) => member.status === "ACTIVE") ?? [],
    [overview]
  );

  const activeAdminCount = useMemo(
    () => activeMembers.filter((member) => member.role === "ORG_ADMIN").length,
    [activeMembers]
  );

  const loadOverview = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/tenant", { cache: "no-store" });
      const data = (await response.json()) as TenantAdminOverview & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load admin console.");
      }

      setOverview(data);
      setMemberWorkspaceId((current) => current || data.activeWorkspace.id);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load admin console.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      setNotice({ type: "error", message: "Workspace name is required." });
      return;
    }

    setSubmitting("workspace");

    try {
      const response = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to create workspace.");
      }

      setWorkspaceName("");
      setNotice({ type: "success", message: "Workspace created." });
      await loadOverview();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create workspace.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const addMember = async () => {
    if (!memberEmail.trim() || !memberWorkspaceId) {
      setNotice({ type: "error", message: "Email and workspace are required." });
      return;
    }

    setSubmitting("member");

    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: memberEmail.trim(),
          workspaceId: memberWorkspaceId,
          role: memberRole,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member.");
      }

      setMemberEmail("");
      setNotice({ type: "success", message: "Member added." });
      await loadOverview();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to add member.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const updateMember = async (
    membershipId: string,
    body: Partial<{ role: Role; isDefault: boolean; status: MembershipStatus }>
  ) => {
    setSubmitting(membershipId);

    try {
      const response = await fetch(`/api/admin/members/${membershipId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update member.");
      }

      setNotice({ type: "success", message: "Membership updated." });
      await loadOverview();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update member.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const disableMember = async (membershipId: string) => {
    setSubmitting(membershipId);

    try {
      const response = await fetch(`/api/admin/members/${membershipId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable member.");
      }

      setNotice({ type: "success", message: "Membership disabled." });
      await loadOverview();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to disable member.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  if (loading && !overview) {
    return (
      <section className="brutal-panel p-6 sm:p-8">
        <p className="section-kicker">
          <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
          Admin console
        </p>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Loading tenant controls
        </p>
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="brutal-panel brutal-callout--error p-6 sm:p-8">
        <p className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
          Admin console unavailable.
        </p>
        {notice && <p className="mt-4 text-sm leading-7 text-[var(--ink)]">{notice.message}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {notice && (
        <div
          className={`brutal-callout text-sm font-semibold leading-7 ${
            notice.type === "error" ? "brutal-callout--error" : ""
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="brutal-metric">
          <p className="metric-label">Organization</p>
          <p className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
            {overview.organization.name}
          </p>
        </div>
        <div className="brutal-metric">
          <p className="metric-label">Workspaces</p>
          <p className="metric-value text-[var(--accent)]">{overview.workspaces.length}</p>
        </div>
        <div className="brutal-metric">
          <p className="metric-label">Active members</p>
          <p className="metric-value text-[var(--signal)]">{activeMembers.length}</p>
        </div>
        <div className="brutal-metric">
          <p className="metric-label">Org admins</p>
          <p className="metric-value text-[var(--success)]">{activeAdminCount}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="brutal-panel p-6 sm:p-8">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Workspaces
            </p>
            <div className="grid gap-3">
              {overview.workspaces.map((workspace) => (
                <article key={workspace.id} className="brutal-callout">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="display-font text-3xl leading-none tracking-[0.08em] text-[var(--ink)]">
                        {workspace.name}
                      </h2>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {workspace.slug} / {workspace.memberCount} active members / {formatDate(workspace.createdAt)}
                      </p>
                    </div>
                    <span className="brutal-chip">
                      {workspace.id === overview.activeWorkspace.id ? "Current" : workspace.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t-[3px] border-[var(--line)] pt-6">
            <p className="metric-label">Create workspace</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="brutal-input"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Compliance Archive"
              />
              <button
                type="button"
                onClick={() => void createWorkspace()}
                disabled={submitting === "workspace"}
                className="brutal-button"
              >
                {submitting === "workspace" ? "Creating" : "Create"}
              </button>
            </div>
          </div>
        </section>

        <section className="brutal-panel p-6 sm:p-8">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Members
            </p>
            <div className="grid gap-3">
              {overview.members.map((member) => (
                <article
                  key={member.membershipId}
                  className={`brutal-callout ${
                    member.status === "DISABLED" ? "opacity-60" : ""
                  }`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="min-w-0">
                      <h2 className="break-all text-lg font-extrabold leading-7 text-[var(--ink)]">
                        {member.name || member.email}
                      </h2>
                      <p className="break-all text-sm leading-7 text-[var(--muted)]">
                        {member.email}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {member.workspaceName} / {member.status} {member.isDefault ? "/ DEFAULT" : ""}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(9rem,1fr)_auto_auto] lg:min-w-[28rem]">
                      <select
                        className="brutal-input min-h-12 py-2 text-sm"
                        value={member.role}
                        disabled={member.status === "DISABLED" || submitting === member.membershipId}
                        onChange={(event) =>
                          void updateMember(member.membershipId, {
                            role: event.target.value as Role,
                          })
                        }
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void updateMember(member.membershipId, { isDefault: true })}
                        disabled={
                          member.status === "DISABLED" ||
                          member.isDefault ||
                          submitting === member.membershipId
                        }
                        className="brutal-button brutal-button--ghost"
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        onClick={() => void disableMember(member.membershipId)}
                        disabled={member.status === "DISABLED" || submitting === member.membershipId}
                        className="brutal-button brutal-button--danger"
                      >
                        Disable
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t-[3px] border-[var(--line)] pt-6">
            <p className="metric-label">Add existing user</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.8fr_auto]">
              <input
                className="brutal-input"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="teammate@example.com"
              />
              <select
                className="brutal-input"
                value={memberWorkspaceId}
                onChange={(event) => setMemberWorkspaceId(event.target.value)}
              >
                {overview.workspaces
                  .filter((workspace) => workspace.isActive)
                  .map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
              </select>
              <select
                className="brutal-input"
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value as Role)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void addMember()}
                disabled={submitting === "member"}
                className="brutal-button"
              >
                {submitting === "member" ? "Adding" : "Add"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="brutal-panel p-6 sm:p-8">
        <p className="section-kicker">
          <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
          Role matrix
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div key={role} className="brutal-callout">
              <p className="metric-label">{formatRole(role)}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                {roleDescription(role)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
