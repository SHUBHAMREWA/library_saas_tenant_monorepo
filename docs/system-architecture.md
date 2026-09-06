# System Architecture Document: Library Management SaaS

## 1. High-Level Architecture Overview

The Library Management SaaS platform is designed as a **Modular Monolith** with clear architectural boundaries, asynchronous task execution via Redis queues, and clean provider abstractions.

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Mobile-First PWA)"]
        Browser["Mobile / Desktop Browser"]
        SW["Service Worker (Cache & Offline Shell)"]
        PWA["Installed PWA (Manifest & Push API)"]
    end

    subgraph EdgeLayer ["Edge & Ingress Layer"]
        CDN["Cloudflare / Fastly CDN"]
        NextFront["Next.js 15 Web App (SSR / RSC / CSR)"]
    end

    subgraph ApiLayer ["Backend Core (Modular Monolith)"]
        API["Node.js / Express API Server"]
        AuthMid["Auth & Tenant Authorization Middleware"]
        ModuleAuth["Auth Module"]
        ModuleTenant["Library & Tenant Module"]
        ModuleSpace["Rooms, Rows & Seats Module"]
        ModuleStudent["Student & Membership Module"]
        ModuleAttend["Attendance Module (Provider Engine)"]
        ModulePay["Payment & Coupon Module"]
        ModuleAdmin["Platform Super Admin Module"]
    end

    subgraph WorkerLayer ["Async Task & Event Layer"]
        BullMQ["BullMQ Queue Engine"]
        Worker["Background Worker Service"]
        Scheduler["Cron Notification Scheduler"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        Postgres[(PostgreSQL 16 + Connection Pool)]
        Redis[(Redis 7: Session, OTP, Caching & Queues)]
        Cloudinary[("Cloudinary Media CDN (KYC & Photos)")]
    end

    subgraph ExternalGateways ["External Gateways"]
        Razorpay["Razorpay API & Webhooks"]
        Cashfree["Cashfree API & Webhooks"]
        FCM["Firebase Cloud Messaging (Push)"]
        Resend["Resend / SMTP (Email OTP)"]
    end

    Browser --> CDN
    CDN --> NextFront
    NextFront --> API
    API --> AuthMid
    AuthMid --> ModuleAuth
    AuthMid --> ModuleTenant
    AuthMid --> ModuleSpace
    AuthMid --> ModuleStudent
    AuthMid --> ModuleAttend
    AuthMid --> ModulePay
    AuthMid --> ModuleAdmin

    API --> Postgres
    API --> Redis
    API --> Cloudinary
    API --> BullMQ

    BullMQ --> Worker
    Scheduler --> BullMQ
    Worker --> Postgres
    Worker --> Redis
    Worker --> FCM
    Worker --> Resend

    Razorpay -. Webhooks .-> ModulePay
    Cashfree -. Webhooks .-> ModulePay
```

---

## 2. Multi-Tenancy Architecture

Multi-tenancy uses a **Pooled Schema with Discriminator Column (`library_id`)** reinforced by strict Backend Context Middleware and Row-Level security boundaries.

```mermaid
erDiagram
    PLATFORM_ADMIN ||--o{ AUDIT_LOG : inspects
    PLATFORM_ADMIN ||--o{ SUBSCRIPTION_PLAN : manages
    PLATFORM_ADMIN ||--o{ COUPON : issues

    USER ||--o{ LIBRARY_MEMBERSHIP_ROLE : "has roles across"
    USER ||--o{ LIBRARY : "owns (1..n)"
    LIBRARY ||--o{ LIBRARY_MEMBERSHIP_ROLE : "has staff"
    LIBRARY ||--o{ ROOM : contains
    ROOM ||--o{ ROW : contains
    ROW ||--o{ SEAT : contains
    LIBRARY ||--o{ STUDENT : enrolls
    STUDENT ||--o{ MEMBERSHIP : has
    MEMBERSHIP ||--o{ MEMBERSHIP_PAUSE : logs
    STUDENT ||--o{ SEAT_ASSIGNMENT : receives
    SEAT ||--o{ SEAT_ASSIGNMENT : allocates
    STUDENT ||--o{ ATTENDANCE : logs
    LIBRARY ||--o{ SUBSCRIPTION : holds
    SUBSCRIPTION ||--o{ PAYMENT : settles
```

### Tenant Enforcement Flow
1. **Authentication Token**: The JWT contains `user_id` and global claims.
2. **Context Determination**: Requests to library resources pass `X-Library-Id` header (or `:libraryId` route param).
3. **TenantGuard Middleware**:
   * Resolves whether `user_id` is an `OWNER`, `ADMIN`, `STAFF` of `library_id` or a global `PLATFORM_SUPER_ADMIN`.
   * Attaches validated `TenantContext { user, library, role }` to request context.
   * If unauthorized or mismatched, immediately rejects with `403 Forbidden` and logs a security event.
4. **Data Layer Scoping**: Every query to tenant-scoped tables (`students`, `seats`, `attendance`, `memberships`) mandates `WHERE library_id = :current_library_id`.

---

## 3. Student Membership Lifecycle

```mermaid
stateDiagram-v2
    [*] --> UPCOMING: Membership Created (Start Date in Future)
    UPCOMING --> ACTIVE: Start Date Reached / Checked In
    [*] --> ACTIVE: Created with Immediate Start

    state ACTIVE {
        [*] --> InSession
        InSession --> AttendanceLogged
    }

    ACTIVE --> PAUSED: Student Requests Leave / Exam Break
    PAUSED --> ACTIVE: Break Resumed (Extend End Date if configured)

    ACTIVE --> EXPIRED: End Date Passed without Renewal
    PAUSED --> EXPIRED: Max Pause Window Elapsed

    EXPIRED --> ACTIVE: Renewal Payment Completed
    ACTIVE --> CANCELLED: Early Termination / Refund
    PAUSED --> CANCELLED: Membership Abandoned
    EXPIRED --> [*]
    CANCELLED --> [*]
```

---

## 4. Attendance Architecture & Provider Abstraction

The attendance subsystem is decoupled via an **Event & Strategy Provider Pattern**.

```mermaid
graph LR
    subgraph TriggerSources ["Attendance Trigger Sources"]
        Manual["Manual UI Tap (V1)"]
        QR["QR Code Scan (V2)"]
        RFID["RFID Hardware Reader (V3)"]
        Biometric["Biometric / Device Gateway (V3)"]
    end

    subgraph ServiceCore ["Attendance Subsystem"]
        ProviderContract["<<interface>> IAttendanceProvider"]
        ManualProvider["ManualAttendanceProvider"]
        QRProvider["QRAttendanceProvider"]
        RFIDProvider["RFIDAttendanceProvider"]
        AttendanceService["Attendance Core Service"]
        OccupancyTracker["Real-Time Occupancy Engine"]
    end

    subgraph Storage ["Persistence & Cache"]
        DB[(PostgreSQL: attendance_logs)]
        Cache[(Redis: active_present_students)]
    end

    Manual --> ManualProvider
    QR --> QRProvider
    RFID --> RFIDProvider
    Biometric --> RFIDProvider

    ManualProvider --> ProviderContract
    QRProvider --> ProviderContract
    RFIDProvider --> ProviderContract

    ProviderContract --> AttendanceService
    AttendanceService --> OccupancyTracker
    AttendanceService --> DB
    OccupancyTracker --> Cache
```

### Contract Definition (`IAttendanceProvider`)
```typescript
export interface AttendanceCheckinDTO {
  libraryId: string;
  studentId: string;
  source: 'MANUAL' | 'QR' | 'RFID' | 'DEVICE';
  sourceDeviceId?: string;
  seatId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IAttendanceProvider {
  readonly providerType: 'MANUAL' | 'QR' | 'RFID' | 'DEVICE';
  recordCheckIn(dto: AttendanceCheckinDTO): Promise<AttendanceResult>;
  recordCheckOut(dto: AttendanceCheckinDTO): Promise<AttendanceResult>;
}
```

---

## 5. Payment & Subscription Architecture

Unified multi-gateway architecture supporting Razorpay, Cashfree, and Manual Platform Admin Overrides with strict webhook deduplication.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Library Owner
    participant Client as Web App (PWA)
    participant API as Node.js API
    participant PaySvc as PaymentService
    participant Provider as Razorpay / Cashfree Gateway
    participant DB as PostgreSQL
    participant Worker as BullMQ Worker

    Owner->>Client: Select Plan + Apply Coupon
    Client->>API: POST /api/v1/payments/create-order
    API->>PaySvc: calculateFinalPrice(plan, couponCode)
    PaySvc-->>API: finalAmount, orderPayload
    API->>Provider: Create Remote Order
    Provider-->>API: remoteOrderId, signatureToken
    API->>DB: Save PaymentRecord (status: PENDING)
    API-->>Client: Return checkout options
    Client->>Owner: Display Payment Modal / SDK
    Owner->>Provider: Complete Payment

    par Real-Time Gateway Webhook
        Provider->>API: POST /api/v1/payments/webhook
        API->>PaySvc: verifyWebhookSignature()
        API->>DB: Check webhook_events(idempotency_key)
        alt Already Processed
            API-->>Provider: HTTP 200 OK (Acknowledge)
        else Fresh Event
            API->>DB: Record webhook_events
            API->>PaySvc: processPaymentSuccess(remotePaymentId)
            PaySvc->>DB: Update Payment (SUCCESS) & Activate Subscription
            API->>Worker: Enqueue 'send-invoice-notification'
            API-->>Provider: HTTP 200 OK
        end
    and Client Verification Polling / Callback
        Client->>API: POST /api/v1/payments/verify
        API->>DB: Fetch latest subscription state
        API-->>Client: Subscription Active
    end
```

---

## 6. Asynchronous Notification Architecture

```mermaid
graph TD
    subgraph TriggerEvents ["System Triggers"]
        CronDaily["Daily Cron (Every Midnight)"]
        PaymentEvent["Payment Succeeded / Failed"]
        ManualAlert["Owner Manual Announcement"]
    end

    subgraph QueuePipeline ["Queue & Worker Pipeline"]
        Publisher["Notification Event Publisher"]
        BullRedis[(BullMQ / Redis)]
        WorkerProcess["Notification Worker Cluster"]
    end

    subgraph Channels ["Notification Channels"]
        WebPush["Web Push (Service Worker / VAPID)"]
        Email["Email Provider (Resend / AWS SES)"]
        SMS["SMS / WhatsApp Gateway (Future)"]
    end

    CronDaily -->|Find memberships expiring in 1, 5, 7 days| Publisher
    PaymentEvent --> Publisher
    ManualAlert --> Publisher

    Publisher --> BullRedis
    BullRedis --> WorkerProcess
    WorkerProcess --> WebPush
    WorkerProcess --> Email
    WorkerProcess --> SMS
```

---

## 7. Future Hardware & RFID Turnstile Gateway (V3 Architecture)

To ensure zero architectural rewrites when introducing physical hardware:

```mermaid
graph LR
    subgraph PhysicalSite ["Physical Library Site"]
        Turnstile["RFID Turnstile / Reader"]
        SeatSensor["Seat Occupancy Sensor"]
        LocalGateway["Local Edge Gateway (Raspberry Pi / ESP32)"]
    end

    subgraph CloudIngress ["Cloud Ingress & Broker"]
        MQTT["EMQX / MQTT Broker (TLS + Device Certs)"]
        WS["Secure WebSocket Ingress"]
    end

    subgraph IngestionEngine ["Hardware Device Service"]
        DeviceAuth["Device Authentication & Rate Limiter"]
        EventNormalizer["Hardware Event Normalizer"]
        AttendanceIngest["AttendanceService.recordCheckIn()"]
    end

    Turnstile -->|Wiegand / RS485| LocalGateway
    SeatSensor -->|Zigbee / BLE| LocalGateway
    LocalGateway -->|MQTT over TLS / WSS| MQTT
    MQTT --> WS
    WS --> DeviceAuth
    DeviceAuth --> EventNormalizer
    EventNormalizer --> AttendanceIngest
    AttendanceIngest --> Postgres[(PostgreSQL)]
```

* Because V1 treats `AttendanceProvider` and `Seat.id` as canonical stable entities, physical hardware simply connects through an edge gateway into the existing `AttendanceService`.
