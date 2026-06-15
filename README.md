# City Vault

City Vault is a records governance layer for organizations. It turns uploads into governed records: versioned, access-controlled, reviewable, retainable, and auditable. Content is stored on IPFS and content-addressed; governance state lives in Postgres.

The project is built around one principle: a record is not a file — it is intent, provenance, and lifecycle that must stay observable and controllable from intake through disposition.

## Why This Exists

Most "upload" tools solve file transfer. They treat a document as a blob that lands somewhere and can be overwritten or deleted with a single action. For teams that answer to auditors, regulators, or their own retention policy, that model is dangerous: there is no version history, no review gate, no hold that blocks deletion, and no trail of who did what.

City Vault changes the unit of work from *file* to *record*. A record carries metadata, a chain of immutable versions, a lifecycle state, an owning tenant, and a governance posture (retention, legal hold, disposition eligibility). Destructive actions are gated by state and by holds, and every meaningful action emits an audit event.

This gives the system three practical governance properties:

- **Provenance before storage**: every version is content-addressed (CID) and checksummed (SHA-256), so what was stored can be proven later.
- **Control before finality**: lifecycle state and legal holds block disposition while obligations are active.
- **Auditable intent**: record actions emit append-oriented `AuditEvent` rows with actor, tenant, target, and metadata.

## System Overview

```mermaid
flowchart LR
  user["Operator / contributor"]
  ui["Next.js dashboard"]
  api["Route handlers / API"]
  authz["Tenant + RBAC gate"]
  services["Domain services\nrecords, governance, audit"]
  db["(Postgres / Prisma)"]
  ipfs["IPFS via Pinata"]
  audit["AuditEvent log"]

  user --> ui --> api
  api --> authz
  authz -->|allowed| services
  authz -->|denied| api
  services --> db
  services --> ipfs
  services --> audit
  ipfs -->|CID + gateway| ui
```

The data model is the core. Most surrounding code exists to resolve *who* is acting, *which tenant* they act within, and *whether the record's state* permits the action — before any mutation reaches Postgres or IPFS.

## Record Lifecycle

```mermaid
sequenceDiagram
  participant Contributor
  participant Authz as Tenant + RBAC gate
  participant Records as Record service
  participant IPFS as Pinata / IPFS
  participant Reviewer
  participant Governance

  Contributor->>Authz: Create record + first file
  Authz-->>Records: authorized (CONTRIBUTOR+)
  Records->>IPFS: pin file, get CID
  IPFS-->>Records: CID + SHA-256 checksum
  Records-->>Contributor: Record (DRAFT)

  Contributor->>Records: Append version / submit for review
  Records-->>Reviewer: Record (UNDER_REVIEW)
  alt Reviewer approves
    Reviewer->>Records: approve
    Records-->>Governance: Record (APPROVED)
  else Reviewer rejects
    Reviewer->>Records: reject -> back to DRAFT
  end

  Governance->>Records: archive
  Governance->>Records: assign retention / place legal hold
  alt Hold active or not eligible
    Governance--xRecords: dispose blocked
  else Eligible and unheld
    Governance->>Records: dispose
  end
```

Records move through four lifecycle states — `DRAFT`, `UNDER_REVIEW`, `APPROVED`, `ARCHIVED` — and guardrails reject actions that don't match the current state. New file revisions are appended as immutable `RecordVersion` rows rather than overwriting prior content.

## Domain Model

```mermaid
flowchart TB
  org["Organization"]
  ws["Workspace"]
  mem["Membership (Role + status)"]
  rec["Record (status, metadata, retention)"]
  ver["RecordVersion (CID, checksum)"]
  appr["ApprovalRequest"]
  ret["RetentionPolicy"]
  hold["LegalHold"]
  audit["AuditEvent"]

  org --> ws
  org --> mem
  ws --> mem
  org --> rec
  ws --> rec
  rec --> ver
  rec --> appr
  ret --> rec
  rec --> hold
  org --> audit
```

Key entities: `User`, `Organization`, `Workspace`, `Membership`, `Record`, `RecordVersion`, `ApprovalRequest`, `RetentionPolicy`, `LegalHold`, and `AuditEvent`.

Roles (`Role` enum): `ORG_ADMIN`, `RECORDS_MANAGER`, `REVIEWER`, `CONTRIBUTOR`, `READ_ONLY`, `AUDITOR`.

## Trust Boundaries

```mermaid
flowchart TB
  subgraph Client["Browser / operator"]
    actions["Record + governance actions"]
  end

  subgraph Server["Server-side enforcement"]
    session["NextAuth JWT session"]
    tenant["Tenant context resolution"]
    rbac["Centralized authorization"]
    state["Lifecycle + hold guardrails"]
  end

  subgraph Storage["Persistence"]
    pg["(Postgres metadata + state)"]
    ipfs["IPFS content (CID)"]
    log["Append-oriented audit log"]
  end

  actions --> session --> tenant --> rbac --> state
  state --> pg
  state --> ipfs
  state --> log
```

The client can *request* any action, but cannot bypass server-side checks. Authorization, tenant isolation, lifecycle rules, and legal-hold blocking are all enforced in domain services — never trusted from the UI.

## Capabilities

**Tenant & access**
- Multi-tenant model (`Organization` / `Workspace` / `Membership`) with per-workspace roles and `ACTIVE`/`DISABLED` status
- Tenant-aware session context and centralized, server-side RBAC for record, workflow, and governance actions
- Admin console: workspace creation, member assignment, role changes, default-workspace selection, membership disablement

**Records core**
- `Record` + immutable `RecordVersion` model; create with metadata + first file, then append versions
- Metadata: type, classification, department, document number, tags, effective/expiry dates
- SHA-256 checksums and CID per version for evidence-grade integrity
- Record detail screen with full version history; latest-version summaries in lists

**Workflow & lifecycle**
- `DRAFT → UNDER_REVIEW → APPROVED → ARCHIVED` with reviewer assignment, approve/reject, and a review queue
- State guardrails that prevent inappropriate actions in the wrong state

**Governance**
- Retention policy assignment with computed expiry dates
- Legal hold creation/release; disposition safeguards that block destruction while holds are active
- Governance queue for retained, held, archived, and disposition-eligible records
- Audit explorer with filtering by action, actor, target type, and date

**Storage & delivery**
- IPFS upload/pinning via Pinata; CID-based lookup and gateway retrieval
- Relational metadata and workflow state in Neon Postgres via Prisma

## Architecture

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript
- **Platform**: Next.js route handlers, NextAuth.js (JWT sessions), Prisma ORM
- **Data**: Neon Postgres for metadata/state, IPFS (Pinata) for binary content
- **Domain services** in `lib/` express governance actions; the UI never mutates the database directly

## Repository Layout

```text
app/        Next.js routes, dashboard surfaces, and API handlers
components/ Shared UI for records, review, governance, admin, and auth
lib/        Domain services — records, governance, audit, authorization, tenant, auth, pinata, prisma
prisma/     Prisma schema and migration history
tests/      Vitest coverage for routes, authorization, tenant context, and governance flows
public/     Static assets and icons
```

## Local Development

Prerequisites: Node.js 20+, npm, a Postgres database (Neon in this setup), and a Pinata account with IPFS access.

Install:

```bash
git clone <repo-url>
cd city-vault
npm install
```

Configure `.env` / `.env.local` in the project root:

```env
DATABASE_URL="postgresql://username:password@host/database"
NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="http://localhost:3000"
PINATA_JWT="replace-with-your-pinata-jwt"
NEXT_PUBLIC_GATEWAY_URL="your-gateway-url.mypinata.cloud"
```

Generate a strong local secret with `openssl rand -base64 32`.

Set up the database:

```bash
npx prisma generate
npx prisma migrate deploy   # or: npx prisma migrate dev for local iteration
```

Run the app:

```bash
npm run dev    # http://localhost:3000
```

## Available Scripts

```bash
npm run dev      # start the Next.js dev server
npm run build    # production build
npm run start    # run the production server
npm run lint     # run ESLint
npm run test     # run Vitest
```

## API Surface

**Record-native**

```text
GET    /api/records
POST   /api/records
GET    /api/records/:id
DELETE /api/records/:id
POST   /api/records/:id/versions
POST   /api/records/:id/review
POST   /api/records/:id/review/approve
POST   /api/records/:id/review/reject
POST   /api/records/:id/archive
POST   /api/records/:id/retention
POST   /api/records/:id/holds
DELETE /api/records/:id/holds/:holdId
POST   /api/records/:id/dispose
```

**Governance & tenant**

```text
GET    /api/audit/events
GET    /api/admin/tenant
POST   /api/admin/workspaces
POST   /api/admin/members
PATCH  /api/admin/members/:membershipId
DELETE /api/admin/members/:membershipId
GET    /api/governance/queue
GET    /api/retention-policies
GET    /api/tenant/context
GET    /api/review-queue
GET    /api/reviewers
```

**Compatibility (transitional, file-centric)**

```text
POST   /api/upload
GET    /api/files
DELETE /api/files/[cid]
```

Compatibility routes support the earlier file-centric surface while the platform completes its move to record-native workflows.

## Validation Flow

A practical smoke test after pulling changes or applying migrations:

1. Register / sign in and open the dashboard.
2. Create a record with an initial file, open its detail page, and add a second version.
3. Submit for review, process it through the review queue, and archive when eligible.
4. Assign a retention policy; place and release a legal hold.
5. Confirm governance-queue visibility and disposition safeguards.
6. As `ORG_ADMIN`, verify workspace / member / role administration.
7. Open the audit explorer and filter by action, actor, target type, or date.

Primary checks:

```bash
npm run test
npm run build
npx tsc --noEmit   # type check if needed
```

## Security & Governance Posture

- bcrypt password hashing and authenticated route protection
- Tenant-aware session resolution and centralized authorization
- Role-specific action gating and workflow-aware mutation restrictions
- Append-oriented audit events for traceability
- Legal-hold-based deletion/disposition blocking

City Vault is governance-oriented but makes no claim of formal certification or out-of-the-box regulatory compliance. Additional policy, deployment, operational, and legal controls are required for regulated production use. Keep `DATABASE_URL`, `NEXTAUTH_SECRET`, and `PINATA_JWT` out of git.

## Development Notes

- Google Fonts are loaded via `next/font`; production builds can fail in offline/restricted environments if font assets can't be fetched.
- Legacy file routes remain for compatibility; the long-term direction is record-first.
- Apply schema migrations before running the latest workflows locally.

## Roadmap

- Richer metadata and classification models
- Saved search and retrieval enhancements
- Expanded audit explorer UX
- Verification receipts and stronger evidence exports
- Deeper policy administration
- Optional proof-anchoring integrations
- Production hardening and observability

## Contribution & License

Contributions, issues, refactors, and proposals are welcome. When contributing code, explain the operational problem, note schema/API contract changes, include validation steps (tests, lint, migrations), and call out governance, security, or authorization implications.

Open source under the [MIT License](LICENSE).
