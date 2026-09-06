# Product Requirements Document (PRD): Library Management SaaS

## 1. Executive Summary & Product Vision
The **Library Management SaaS** is a multi-tenant, mobile-first Progressive Web Application (PWA) tailored specifically for physical study libraries, private reading rooms, coworking study hubs, and institute libraries.
The product core thesis:
* **Simple on the surface, sophisticated under the hood**: Library owners (often non-technical) need a frictionless, glanceable mobile dashboard to manage seats, students, shifts, memberships, and payments.
* **Commercial Polish**: Avoiding generic CRUD or AI-generated appearances. High tactile responsiveness, large touch targets, robust empty/loading states, and offline-resilient app shell.
* **Extensible Foundation**: Architected from day one for seamless V2/V3 evolution into automated QR code check-in, RFID turnstiles, seat occupancy sensors, and device gateways without structural rewrites.

---

## 2. Target Personas & Roles

### 2.1 Platform Super Admin
* **Profile**: SaaS platform operators managing infrastructure, revenue, library onboarding, and platform integrity.
* **Key Jobs to Be Done**:
  * Oversee all tenant libraries, active subscriptions, and churn metrics.
  * Manage global subscription tiers (Free/Trial, Basic, Pro, Enterprise).
  * Manually issue, extend, or override library subscriptions for offline bank transfer or promotional arrangements.
  * Define and manage global promotional coupon codes (percentage, flat, limits, expiry).
  * Audit tenant operational status, freeze/suspend rogue or delinquent accounts.
  * Review platform-wide audit trails.

### 2.2 Library Owner / Tenant Admin
* **Profile**: Owner or head administrator of one or more study libraries/reading centers.
* **Key Jobs to Be Done**:
  * Multi-library administration: Switch seamlessly between multiple physical branches or independent libraries under a single login.
  * Physical inventory management: Define rooms/floors, rows/sections, and individual desks/seats with stable identifiers.
  * Student lifecycle management: Register students with KYC (Aadhaar, photo, contact, study goals).
  * Membership & seat assignment: Issue time-bound plans (monthly, quarterly, shift-based), assign dedicated or floating seats, track renewal deadlines.
  * Attendance recording: Rapid one-tap manual check-in/check-out with immediate visual occupancy feedback.
  * Cashflow & subscription management: Pay platform dues via Razorpay/Cashfree, track student fee dues.

### 2.3 Future Roles (Designed for RBAC Extensibility)
* **Library Manager**: Operational admin delegated to manage day-to-day students, seats, and attendance, but restricted from library billing or deleting the branch.
* **Library Staff / Front-Desk**: Restricted to check-in/check-out, student view, and basic seat lookup.
* **Student (Future Portal)**: Self-service view of seat assignment, membership validity, payment receipts, and QR check-in pass.

---

## 3. Detailed Functional Requirements

### 3.1 Authentication & Tenant Context
* **Auth Mechanisms**:
  * Passwordless Email OTP (with strict rate-limiting, 5-minute TTL, bcrypt hashed tokens in Redis).
  * Google OAuth 2.0 (via secure server-side verification).
* **Multi-Tenancy & Context**:
  * One user account can create and own multiple physical libraries.
  * Backend enforces strict library context via `X-Library-Id` headers or scoped route parameters, authorized per request via backend middleware.
  * Absolute isolation: Data leaks across libraries are strictly prevented at both ORM and database query layers.

### 3.2 Physical Infrastructure Modeling
* **Hierarchy**: `Library` -> `Room` (Floor/Hall) -> `Row` (Section/Bay) -> `Seat` (Desk/Cubicle).
* **Seat Characteristics**:
  * Unique sequence/identifier per room/row (e.g., Room 1 -> Row B -> Seat B-07).
  * Stable UUIDs to guarantee long-term physical hardware/RFID mapping.
  * Seat status: `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `RESERVED`.
  * Support reordering, batch generation, and archiving (soft-delete).

### 3.3 Student Management & Sensitive KYC
* **Student Profile**:
  * Full Name, Primary Phone (validated), Email (optional), Physical Address.
  * Parents' Names (Father's and Mother's name), Purpose of Study (e.g., UPSC, NEET, CA, General).
  * Profile Photo and Government ID (Aadhaar card scan/photo).
* **Privacy & Security**:
  * Photos and sensitive KYC stored on Cloudinary using signed private/authenticated delivery URLs.
  * No public indexing of Aadhaar cards.
  * Complete audit trail on who created, viewed, edited, or archived student data.

### 3.4 Membership Lifecycle & Pause Engine
* **States**: `UPCOMING`, `ACTIVE`, `PAUSED`, `EXPIRED`, `CANCELLED`.
* **Proactive Intelligence**:
  * Calculation of memberships expiring today, within 5 days, and within 7 days.
  * Dashboard alert queue for expiring memberships.
* **Membership Pause / Gap**:
  * Ability to record temporary leave (e.g., college exams, illness).
  * Records pause window (`start_date`, `end_date`, `reason`, `resumed_at`).
  * Immutable history: Never overwrite original membership start dates destructively.
  * Configurable extension policy per library (e.g., whether pause days automatically push back the membership end date).

### 3.5 Seat Assignment History
* **Non-destructive Allocation**:
  * Historical assignment records: `student_id`, `seat_id`, `start_date`, `end_date`, `shift`, `status`.
  * Real-time clash prevention: Prevents two active students from claiming the same seat in the same shift window.
  * Complete auditable relocation log when a student transfers from Seat A-12 to B-03.

### 3.6 Attendance Tracking & Hardware-Ready Engine
* **V1 Manual Workflow**:
  * One-touch daily roster check-in and check-out.
  * Instant status toggle with quick search and filter by student name or seat.
  * Student attendance history timeline.
* **Provider Abstraction**:
  * `AttendanceService` dispatches events through an `AttendanceProvider` interface (`MANUAL`, with contracts for `QR`, `RFID`, `DEVICE`).

### 3.7 SaaS Subscriptions, Gateways & Coupons
* **Platform Tiers**: Free Trial (14 days), Basic (up to 50 seats), Pro (up to 200 seats), Enterprise (unlimited + multi-branch).
* **Payment Gateways**:
  * Native dual integration: Razorpay and Cashfree via a unified `PaymentService` strategy pattern.
  * Webhook Idempotency: Webhook events stored with unique event hashes; redundant deliveries are safely acknowledged without re-executing state transitions.
* **Admin Manual Override**:
  * Platform admins can grant or renew subscriptions manually (source: `MANUAL_ADMIN`) with full audit reason, preserving standard expiration logic.
* **Coupon System**:
  * Dynamic validation engine: percentage or flat discount, minimum cart value, max discount caps, total usage limit, and per-tenant usage caps.
  * All discount mathematics executed purely on the backend.

### 3.8 Visual Management: Lightweight Kanban
* Touch-friendly, low-latency mobile Kanban board for library tasks and student follow-ups (e.g., "Inquiry", "Awaiting KYC", "Fee Due", "Active", "Alumni").
* Optimistic UI updates with drag-and-drop / tap-to-move capabilities without heavy external project management baggage.

---

## 4. Non-Functional Requirements (NFRs)

| Dimension | Specification |
| :--- | :--- |
| **Mobile UX** | 100% responsive, minimum 48px touch targets, mobile bottom bar navigation, zero horizontal scrolling. |
| **PWA** | Web App Manifest, offline app shell caching, background sync preparation, Web Push API ready. |
| **Performance** | Core Web Vitals (LCP < 1.8s, FID < 100ms, CLS < 0.05). Dashboard API latency < 120ms (p95). |
| **Security** | OWASP Top 10 compliance, tenant boundary isolation, signed URLs for KYC documents, bcrypt OTP hashing. |
| **Scalability** | Modular monolith design with connection pooling, Redis caching for hot stats, async BullMQ processing. |

---

## 5. Assumptions & Open Product Decisions

* **Open Product Decision 1: Pause Extension Logic**
  * *Assumption*: In V1, when a membership is paused, the days spent on pause automatically extend the membership's `expected_end_date` unless the library owner unchecks "Extend expiry date".
  * *Status*: OPEN PRODUCT DECISION (Requires client confirmation).

* **Open Product Decision 2: Multi-Shift Seat Sharing**
  * *Assumption*: Physical seats in reading rooms often operate in shifts (Morning: 6 AM - 2 PM, Evening: 2 PM - 10 PM, Full Day: 24/7). V1 database schema will model `Shift` to allow multiple students to share one seat across different time windows.
  * *Status*: OPEN PRODUCT DECISION (Defaulting to shift-aware schema for future-proofing).
