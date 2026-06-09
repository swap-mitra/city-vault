"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AuditEvent = {
  id: string;
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  targetType: string;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata) {
    return "No metadata";
  }

  return JSON.stringify(metadata, null, 2);
}

export function AuditExplorerClient() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount = useMemo(
    () => [query, action, targetType, actorEmail, from, to].filter(Boolean).length,
    [query, action, targetType, actorEmail, from, to]
  );

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (action.trim()) params.set("action", action.trim());
    if (targetType.trim()) params.set("targetType", targetType.trim());
    if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const queryString = params.toString();
    return queryString ? `/api/audit/events?${queryString}` : "/api/audit/events";
  }, [query, action, targetType, actorEmail, from, to]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildUrl(), { cache: "no-store" });
      const data = (await response.json()) as { events?: AuditEvent[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load audit events.");
      }

      setEvents(data.events ?? []);
    } catch (auditError) {
      setError(
        auditError instanceof Error ? auditError.message : "Failed to load audit events."
      );
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEvents();
    }, activeFilterCount > 0 ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [activeFilterCount, loadEvents]);

  const clearFilters = () => {
    setQuery("");
    setAction("");
    setTargetType("");
    setActorEmail("");
    setFrom("");
    setTo("");
  };

  return (
    <section className="space-y-6">
      <div className="brutal-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Audit explorer
            </p>
            <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
              Inspect activity.
            </h2>
          </div>
          <button
            type="button"
            onClick={activeFilterCount > 0 ? clearFilters : () => void loadEvents()}
            className="brutal-button brutal-button--ghost"
          >
            {activeFilterCount > 0 ? "Clear filters" : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            className="brutal-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search audit trail"
          />
          <input
            className="brutal-input"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Action"
          />
          <input
            className="brutal-input"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            placeholder="Target type"
          />
          <input
            className="brutal-input"
            value={actorEmail}
            onChange={(event) => setActorEmail(event.target.value)}
            placeholder="Actor email"
          />
          <input
            className="brutal-input"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <input
            className="brutal-input"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="brutal-callout brutal-callout--error text-sm font-semibold leading-7">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {loading && (
          <div className="brutal-panel p-6 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Loading audit events
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div className="brutal-panel brutal-grid px-6 py-14 text-center">
            <p className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)]">
              No audit events found.
            </p>
          </div>
        )}

        {!loading &&
          events.map((event) => (
            <article key={event.id} className="brutal-panel p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_24rem] xl:items-start">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="brutal-chip">{event.action}</span>
                    <span className="brutal-chip">{event.targetType}</span>
                    <span className="brutal-chip">{formatDate(event.createdAt)}</span>
                  </div>
                  <h3 className="break-all text-lg font-extrabold leading-7 text-[var(--ink)]">
                    {event.actorEmail || "System event"}
                  </h3>
                  <p className="break-all text-sm leading-7 text-[var(--muted)]">
                    Target {event.targetId || "none"} / IP {event.ipAddress || "unknown"}
                  </p>
                </div>

                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words border-[3px] border-[var(--line)] bg-[color-mix(in_oklch,var(--surface-0)_92%,black)] p-4 text-xs leading-6 text-[var(--ink)]">
                  {stringifyMetadata(event.metadata)}
                </pre>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
