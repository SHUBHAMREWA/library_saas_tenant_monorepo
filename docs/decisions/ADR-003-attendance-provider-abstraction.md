# ADR-003: Attendance Provider Abstraction for Future Hardware & IoT Integration

## Status
Accepted

## Context
Initial version (V1) requires simple, rapid manual attendance recording on mobile devices.
However, future roadmap versions mandate automated attendance via:
* Dynamic QR Code scanning (V2)
* RFID card readers & turnstiles (V3)
* IoT seat occupancy sensors and biometric devices (V3)

Tightly coupling the application logic to manual check-in would require rewriting the attendance and reporting systems when hardware integrations are introduced.

## Decision
We decouple the attendance intake from the core business and reporting engine using the **Strategy Pattern** with an `IAttendanceProvider` interface:

```typescript
export interface AttendanceEvent {
  libraryId: string;
  studentId: string;
  seatId?: string;
  source: 'MANUAL' | 'QR' | 'RFID' | 'DEVICE';
  sourceDeviceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IAttendanceProvider {
  readonly providerType: string;
  recordCheckIn(event: AttendanceEvent): Promise<AttendanceResult>;
  recordCheckOut(event: AttendanceEvent): Promise<AttendanceResult>;
}
```

In V1, only `ManualAttendanceProvider` is registered in the dependency container.
When V2 (QR) or V3 (RFID / MQTT Edge Gateway) are introduced, new providers (`QRAttendanceProvider`, `RfidAttendanceProvider`) will be plugged into the existing `AttendanceService` without touching database models, reporting queries, or student membership verification logic.

## Consequences
### Positive:
* V1 remains lightweight and free of IoT / MQTT bloat.
* V3 hardware can be added seamlessly via an edge gateway posting to an internal API or message broker.
* Single source of truth for occupancy, daily metrics, and attendance history regardless of check-in mechanism.

### Negative:
* Slight overhead of interface contracts for initial simple manual use case.
