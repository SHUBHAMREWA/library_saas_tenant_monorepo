# ADR-002: Multi-Tenant Architecture with Discriminator Column and Backend Context Guard

## Status
Accepted

## Context
The SaaS platform must support a single user owning multiple physical libraries (branches), with future support for granular staff roles (Owner, Admin, Manager, Staff).
Critical requirement: Complete tenant data isolation. Under no circumstances may an owner or staff of Library A view, search, or alter records of Library B.

Three multi-tenant architectural patterns were evaluated:
1. **Separate Database per Tenant**: Highest isolation, but enormous operational overhead, costly connection pooling, and painful migrations across hundreds of libraries.
2. **Separate Schema per Tenant**: Good isolation, but high migration complexity with Prisma/PostgreSQL for dynamic schemas, and heavy metadata bloat.
3. **Shared Database & Shared Schema with Discriminator Column (`library_id`)**: Highest scalability, cost-effective, standard migrations, but requires strict, non-bypassable backend context and query isolation.

## Decision
We adopt **Shared Database & Shared Schema with Discriminator Column (`library_id`)**, reinforced by a layered defense:
1. **Tenant Context Middleware (`TenantGuard`)**: Every request targeting library-scoped resources must submit `X-Library-Id` (or route parameter). Middleware verifies user membership and active role in `library_members`, binding `req.tenant` to the request. Mismatches immediately return `403 Forbidden`.
2. **Mandatory Query Scoping**: All Prisma repositories and query helpers inject `where: { libraryId: req.tenant.libraryId }`.
3. **Compound Unique Constraints & Foreign Keys**: Cross-tenant relationships are prevented at the database schema level (e.g., unique constraints on `(library_id, row_id, seat_number)`).

## Consequences
### Positive:
* Cost-effective infrastructure; single PostgreSQL cluster supports thousands of tenants.
* Straightforward unified database migrations via standard Prisma migrations.
* Simple global platform admin queries for system-wide metrics.

### Negative:
* Extreme developer vigilance required to never omit `libraryId` from database queries.
* Mitigated by mandatory automated tenant-isolation integration tests.
