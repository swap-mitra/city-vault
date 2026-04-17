# City Vault

City Vault is a multi-tenant records governance platform built on Next.js, Prisma, Postgres, and IPFS-backed content addressing. It is designed for teams that need more than basic file storage: versioned records, role-based access control, review workflows, retention operations, legal holds, governance queues, and audit-aware record handling.

The product direction is intentionally aligned with enterprise and public-sector records operations. Instead of treating uploads as isolated files, City Vault models them as governed records with lifecycle state, version history, organizational ownership, and operational controls.

## Platform Positioning

City Vault is not a generic drive clone. It is positioned as a modern records operations layer for organizations that need:

- controlled record intake
- versioned evidence management
- tenant-aware access boundaries
- review and approval workflows
- retention and disposition controls
- legal hold enforcement
- IPFS-based content addressing and retrieval
- operational traceability for governance-heavy workflows

This makes the platform suitable for internal records teams, compliance-oriented operations, regulated business workflows, and any environment where provenance and governance matter more than simple storage volume.

## Current Product Capabilities

### Tenant and access foundation
- Multi-tenant domain model with `Organization`, `Workspace`, and `Membership`
- Role-based access control for `ORG_ADMIN`, `RECORDS_MANAGER`, `REVIEWER`, `CONTRIBUTOR`, `READ_ONLY`, and `AUDITOR`
- Tenant-aware session context and server-side authorization checks
- Centralized permission mapping for record, workflow, and governance actions

### Records core
- Record-centric data model with `Record` and `RecordVersion`
- Create a record with title, optional description, and an initial uploaded file
- Append new versions to an existing record
- Latest-version summaries in list views
- Dedicated record detail screen with full version history
- Compatibility shims for legacy file endpoints while the platform transitions fully to records

### Workflow and lifecycle
- Draft to review to archive lifecycle support
- Review queue for operational processing
- Reviewer assignment and decision flows
- Workflow controls surfaced on record detail pages
- Guardrails that prevent inappropriate actions in the wrong record state

### Governance operations
- Retention policy assignment on eligible records
- Computed retention expiry dates
- Legal hold creation and release
- Governance queue for retained, held, archived, and disposition-eligible records
- Disposition safeguards that block destructive actions while active holds exist

### Storage and delivery
- File upload to IPFS via Pinata
- CID-based content lookup and gateway access
- Metadata persistence in Postgres via Prisma
- Version-aware record services layered over content-addressed storage

### Product UX
- Brutalist dashboard UX tuned for records operations rather than consumer file browsing
- Dedicated record, review, and governance workspaces
- In-app sign-out confirmation that matches the application design system
- Updated branding assets, including lock-based tab icon metadata

## Architecture Overview

City Vault uses a web application architecture with clear separation between UI, API routes, domain services, and persistence.

### Frontend
- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- TypeScript

### Backend and platform services
- Next.js route handlers for application APIs
- NextAuth.js with JWT-backed sessions
- Prisma ORM for schema management and persistence
- Neon Postgres for relational metadata storage
- Pinata Web3 SDK for IPFS upload and pinning flows

### Data and domain concepts
Core entities currently implemented include:

- `User`
- `Organization`
- `Workspace`
- `Membership`
- `AuditEvent`
- `Record`
- `RecordVersion`
- `ApprovalRequest`
- `RetentionPolicy`
- `LegalHold`

At a high level:
- relational metadata and workflow state live in Postgres
- binary content is stored in IPFS via Pinata
- the application resolves tenant context and authorization before handling record operations
- governance actions are expressed through domain services rather than direct database mutation from the UI

## Why This Matters

Traditional upload tools solve file transfer. City Vault is intended to solve record control.

That means the application is being built around industry-relevant concepts such as:

- records governance
- operational auditability
- lifecycle management
- retention enforcement
- legal hold handling
- disposition readiness
- tenant isolation
- role-based administration
- evidence-grade version history
- content-addressable retrieval

The platform should be understood as an evolving records system with decentralized storage primitives, not merely an IPFS upload front end.

## Key User Journeys

### 1. Record intake
A contributor or records manager creates a new record, provides baseline metadata, and uploads the first file version.

### 2. Versioned maintenance
Additional file revisions are appended as new record versions instead of overwriting previous content.

### 3. Review processing
Draft records can move through the review queue, receive reviewer actions, and transition through controlled lifecycle states.

### 4. Governance control
Approved or archived records can receive retention assignments, legal holds, and disposition actions based on policy and current state.

### 5. Retrieval and inspection
Users can browse the records workspace, inspect record detail pages, review version history, and follow CID-backed content links.

## Security and Governance Posture

City Vault currently includes foundational controls that support governance-heavy workflows:

- bcrypt password hashing
- authenticated route protection
- tenant-aware session resolution
- centralized authorization checks
- role-specific action gating
- append-oriented audit event infrastructure
- legal-hold-based deletion/disposition blocking
- workflow-aware mutation restrictions

Important note: City Vault is governance-oriented, but this repository does not claim formal certification or regulatory compliance out of the box. Additional policy, deployment, operational, and legal controls would still be required for production use in regulated environments.

## Repository Structure

```text
app/           Next.js app routes, dashboard surfaces, and API handlers
components/    Shared UI components for records, review, governance, and auth
lib/           Domain services, authorization, auth config, and persistence helpers
prisma/        Prisma schema and migration history
tests/         Vitest coverage for routes, authorization, tenant context, and governance flows
public/        Static assets and browser-visible icons
```

## Getting Started

### Prerequisites
Make sure you have the following available before running the project locally:

- Node.js 20 or newer
- npm
- a Postgres database, typically Neon Postgres in this project setup
- a Pinata account with IPFS access
- environment variables for database, auth, and Pinata integration

### Installation
Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd city-vault
npm install
```

### Environment Configuration
Create a `.env` or `.env.local` file in the project root.

```env
DATABASE_URL="postgresql://username:password@host/database"
NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="http://localhost:3000"
PINATA_JWT="replace-with-your-pinata-jwt"
NEXT_PUBLIC_GATEWAY_URL="your-gateway-url.mypinata.cloud"
```

#### Environment variable notes
- `DATABASE_URL`: Postgres connection string used by Prisma
- `NEXTAUTH_SECRET`: secret used to sign and validate auth tokens
- `NEXTAUTH_URL`: base URL for local or deployed auth callbacks
- `PINATA_JWT`: credential for upload and pinning operations
- `NEXT_PUBLIC_GATEWAY_URL`: public IPFS gateway base used in client-visible links

To generate a strong local auth secret:

```bash
openssl rand -base64 32
```

## Database Setup

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

For local iterative development, you may prefer:

```bash
npx prisma migrate dev
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev      # start the Next.js development server
npm run build    # create a production build
npm run start    # run the production server
npm run lint     # run ESLint
npm run test     # run Vitest test suites
```

## Recommended Local Validation Flow

After pulling changes or applying migrations, a practical smoke test looks like this:

1. Register or sign in.
2. Open the dashboard.
3. Create a record with an initial file.
4. Open the record detail page.
5. Add a second record version.
6. Submit the record for review.
7. Process it through the review queue.
8. Archive it when eligible.
9. Assign a retention policy.
10. Place and release a legal hold.
11. Verify governance queue visibility and disposition safeguards.

## API Surface Summary

The platform currently exposes a mix of record-native and compatibility endpoints.

### Record-native endpoints
- `GET /api/records`
- `POST /api/records`
- `GET /api/records/:id`
- `POST /api/records/:id/versions`
- `DELETE /api/records/:id`
- `POST /api/records/:id/review`
- `POST /api/records/:id/review/approve`
- `POST /api/records/:id/review/reject`
- `POST /api/records/:id/archive`
- `POST /api/records/:id/retention`
- `POST /api/records/:id/holds`
- `DELETE /api/records/:id/holds/:holdId`
- `POST /api/records/:id/dispose`

### Governance and tenant endpoints
- `GET /api/governance/queue`
- `GET /api/retention-policies`
- `GET /api/tenant/context`
- `GET /api/review-queue`
- `GET /api/reviewers`

### Compatibility endpoints
- `POST /api/upload`
- `GET /api/files`
- `DELETE /api/files/[cid]`

These compatibility routes are transitional and exist to support the earlier file-centric product surface while the application completes its move to full record-native workflows.

## Testing and Quality

The repository includes automated tests for major platform foundations such as:

- authorization behavior
- tenant context resolution
- record route behavior
- governance routes
- review and version flows

Run the test suite:

```bash
npm run test
```

Run linting:

```bash
npm run lint
```

Run a type check if needed:

```bash
npx tsc --noEmit
```

## Known Development Notes

- The project currently uses Google Fonts through `next/font`. In restricted or offline environments, production builds can fail if the font assets cannot be fetched.
- Legacy file routes are still present for compatibility. The long-term product direction is record-first.
- The repository is evolving quickly across sprint-based delivery, so schema changes should always be applied before running the latest workflows locally.

## Roadmap Direction

The implemented work already covers the platform foundation, records core, review workflow, and governance controls. Logical next areas include:

- richer metadata schemas and classification models
- saved search and retrieval enhancements
- expanded audit explorer UX
- verification receipts and stronger evidence exports
- policy administration depth
- optional proof anchoring integrations
- production deployment hardening and observability

## Contribution

Contributions, ideas, issue reports, refactors, and implementation proposals are all welcome.

There is intentionally no narrow contribution gate described here yet. If you want to improve the platform, you can open an issue, start a discussion, propose an architectural change, or submit a pull request in the style that best fits the work.

If you are contributing code, it helps to:

- explain the user or operational problem being solved
- mention any schema or API contract changes
- include validation notes such as tests, lint, or migration steps
- call out governance, security, or authorization implications when relevant

## Support

Support remains open-ended by design.

If you need help evaluating the platform, adapting it to your environment, understanding the current architecture, or contributing new capabilities, open an issue or start a discussion in the repository. If you are using City Vault in a more formal or organization-specific context, you can also adapt this section to your internal support and escalation model.

## License

This project is open source and available under the [MIT License](LICENSE).
