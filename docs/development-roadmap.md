# Development Roadmap: Library Management SaaS

## 1. Phased Delivery Strategy

Development is broken into discrete, verifiable phases. In accordance with strict engineering guidelines, every phase must follow:
**PLAN $\to$ IMPLEMENT $\to$ TYPECHECK $\to$ LINT $\to$ TEST $\to$ BROWSER TEST $\to$ REVIEW $\to$ REPORT**.

```mermaid
gantt
    title Development Roadmap & Milestone Phases
    dateFormat  YYYY-MM-DD
    section Foundation
    Phase 0: Docs, Monorepo & Tooling       :done,    p0, 2026-09-01, 2026-09-04
    Phase 1: Database, Auth & Multi-Tenancy  :active,  p1, 2026-09-05, 2026-09-08
    section Core Operations
    Phase 2: Rooms, Rows, Seats Grid        :         p2, 2026-09-09, 2026-09-12
    Phase 3: Students, KYC & Cloudinary      :         p3, 2026-09-13, 2026-09-16
    Phase 4: Memberships, Pauses & Seats     :         p4, 2026-09-17, 2026-09-20
    Phase 5: Attendance Engine & Dashboard  :         p5, 2026-09-21, 2026-09-24
    section Monetization & Admin
    Phase 6: Subscriptions, Payments, Coupons:         p6, 2026-09-25, 2026-09-29
    Phase 7: Platform Super Admin Portal    :         p7, 2026-09-30, 2026-10-03
    section Mobile Polish & Delivery
    Phase 8: PWA, Web Push & Touch Kanban   :         p8, 2026-10-04, 2026-10-07
    Phase 9: Security Audit & Production E2E:         p9, 2026-10-08, 2026-10-11
```

---

## 2. Phase Breakdown & Deliverables

### Phase 0: Project Setup, Monorepo & Tooling (Current)
* **Deliverables**: Complete architecture documentation, ADRs, database schema definitions, pnpm monorepo structure setup (`apps/web`, `apps/api`, `apps/worker`, `packages/*`), linting and test harnesses.
* **Exit Criteria**: All documentation approved, monorepo configuration valid, zero build errors.

### Phase 1: Database, Authentication & Multi-Tenancy Core
* **Deliverables**:
  * PostgreSQL + Prisma setup with all migrations.
  * Email OTP (Redis-backed, rate-limited, salted) and Google OAuth 2.0.
  * Multi-library context resolution (`X-Library-Id`) and `TenantGuard` backend middleware.
  * Basic user profile & library creation endpoints.
* **Exit Criteria**: Multi-tenant isolation test suite passes; unauthorized cross-tenant requests fail with 403.

### Phase 2: Physical Spaces (Rooms, Rows & Seats)
* **Deliverables**:
  * Room and Row CRUD with order sorting and soft deletion.
  * Batch seat generator (e.g., generate 50 seats in Row A with prefix `A-01` to `A-50`).
  * Mobile-responsive visual seat grid with status chips (Available, Occupied, Maintenance).
* **Exit Criteria**: Owner can create a room, row, and 100 seats in <30 seconds on a mobile viewport.

### Phase 3: Student Management & Secure KYC
* **Deliverables**:
  * Multi-step mobile student registration form.
  * Direct signed upload integration with Cloudinary (private/authenticated mode for Aadhaar).
  * Student search, phone number lookup, and student detail drawer.
  * Ephemeral signed document viewer for Aadhaar.
* **Exit Criteria**: Sensitive document URLs expire after 60s; direct upload succeeds without routing binary payload through Node API.

### Phase 4: Student Memberships, Pauses & Historical Seat Allocation
* **Deliverables**:
  * Membership lifecycle engine (`UPCOMING`, `ACTIVE`, `PAUSED`, `EXPIRED`, `CANCELLED`).
  * Pause/gap management recording start date, reason, and resumption with automatic/optional end-date extension.
  * Non-destructive seat allocation model with shift support (`MORNING`, `EVENING`, `FULL_DAY`).
  * Seat clash prevention (enforcing unique active seat assignments per shift).
* **Exit Criteria**: Shift and pause tests pass; relocation from Seat A to Seat B preserves complete auditable history.

### Phase 5: Attendance Engine & Mobile Owner Dashboard
* **Deliverables**:
  * `AttendanceService` implementing `IAttendanceProvider` (Manual provider initial implementation).
  * Rapid one-tap mobile check-in/check-out roster with instant visual feedback.
  * Real-time Mobile Dashboard: Active Students, Present Today, Available Seats, Expiring Memberships (<5d, <7d).
  * Attendance history view per student.
* **Exit Criteria**: Dashboard loads in <150ms on simulated 4G mobile; one-tap check-in updates occupancy instantly.

### Phase 6: Subscriptions, Payment Gateways & Coupons
* **Deliverables**:
  * SaaS subscription tiers (Trial, Basic, Pro, Enterprise) and active status guard.
  * Unified `PaymentService` integrating Razorpay and Cashfree.
  * Idempotent webhook receiver with HMAC signature verification.
  * Dynamic coupon engine with percentage/flat discounts, min amounts, and redemption caps.
* **Exit Criteria**: Webhook idempotency test suite passes; identical webhook delivered 5x results in exactly 1 activation.

### Phase 7: Platform Super Admin Portal
* **Deliverables**:
  * Dedicated platform admin layout and route protection (`role === 'SUPER_ADMIN'`).
  * Library directory with tenant status (Active, Delinquent, Suspended).
  * Manual subscription issuance modal (granting plans with audit trail).
  * Coupon management interface (create, view usage, deactivate).
  * Global audit log browser with JSON diff inspection.
* **Exit Criteria**: Admin can manually grant PRO tier to a library and verify immediate operational unlock.

### Phase 8: PWA, Web Push & Touch Kanban
* **Deliverables**:
  * Web App Manifest, offline app shell with Service Worker (safe caching rules).
  * Web Push notification registration via BullMQ worker (membership expiration warnings, renewal reminders).
  * Mobile touch-friendly Kanban board for library student inquiries and tasks.
* **Exit Criteria**: PWA passes Lighthouse audit (PWA badge); offline app shell renders instantly; push notification arrives on device.

### Phase 9: End-to-End Hardening & Production Launch
* **Deliverables**:
  * End-to-end Playwright tests covering all user journeys.
  * Security penetration scan and IDOR verification.
  * Production Dockerfiles, container configuration, database pooling, and environment documentation.
* **Exit Criteria**: 100% CI pass rate; zero critical security warnings; mobile performance score > 90.
