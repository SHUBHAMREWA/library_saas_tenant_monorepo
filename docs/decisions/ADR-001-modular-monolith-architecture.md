# ADR-001: Modular Monolith Architecture over Microservices

## Status
Accepted

## Context
We are architecting a production-grade, scalable Library Management SaaS platform. Key considerations include:
1. Operational simplicity for a small engineering team.
2. Fast development velocity without complex distributed systems overhead (e.g., distributed transactions, network latency, Kubernetes management, service mesh).
3. Need for clean domain boundaries so that specific high-throughput components (e.g., future RFID ingestion, IoT device gateways) can be extracted into standalone microservices in V2/V3 if required.

## Decision
We will build the application as a **Modular Monolith** using a monorepo setup (pnpm workspaces):
* **Next.js 15 Web App (`apps/web`)**: Handles frontend presentation, mobile PWA shell, Server Components, and client state.
* **Node.js API (`apps/api`)**: Handles all business domain services, RESTful endpoints, and database interactions.
* **Background Worker (`apps/worker`)**: BullMQ worker process consuming asynchronous background jobs (notifications, daily expiration audits, heavy tasks).
* **Shared Packages (`packages/*`)**: Shared Prisma database client (`packages/database`), shared TypeScript types (`packages/types`), shared validation schemas (`packages/validation`).

Each domain (Auth, Spaces, Students, Memberships, Attendance, Payments, Admin) lives in an isolated module inside `apps/api/src/modules/` with its own controller, service, repository, and DTO contracts. Cross-module communication is restricted to service method calls or domain events.

## Consequences
### Positive:
* Single deployment pipeline, straightforward local development and debugging.
* ACID transactions across entities (e.g., membership renewal + seat allocation) in a single database.
* Zero distributed tracing or network latency overhead for core business flows.
* Easy extraction of modules (such as the Attendance/Hardware module) into standalone microservices later.

### Negative:
* Shared compute resources across modules during heavy loads.
* Requires discipline to prevent developers from bypassing module boundaries or writing spaghetti queries across unrelated domains.
