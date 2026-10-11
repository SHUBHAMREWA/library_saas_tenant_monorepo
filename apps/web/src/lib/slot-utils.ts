// =======================================================
// Time Slot & Custom Shift Conflict Resolution Engine
// Supports flexible 2-3 hour custom shifts and multi-occupancy
// =======================================================

export interface TimeSlot {
  startMin: number; // Minutes from midnight (e.g. 600 for 10:00 AM)
  endMin: number;   // Minutes from midnight (e.g. 780 for 01:00 PM)
  label: string;    // Human friendly label: "10:00 AM – 01:00 PM"
  isCustom?: boolean;
}

/**
 * Converts a 24h or 12h time string to minutes from midnight (0–1440).
 * Examples: "06:00" -> 360, "14:30" -> 870, "10:00 AM" -> 600, "2:00 PM" -> 840
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();

  // Handle 12-hour AM/PM format
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timePart = clean.replace(/[^\d:]/g, '');
  const [hourStr, minStr] = timePart.split(':');

  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return Math.min(Math.max(hours * 60 + minutes, 0), 1440);
}

/**
 * Converts minutes from midnight to a 12-hour formatted time string.
 * Example: 600 -> "10:00 AM", 840 -> "02:00 PM", 1440 -> "12:00 AM"
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
}

/**
 * Standard shift definitions in minutes from midnight:
 * - FULL_DAY: 00:00 to 24:00 (0 to 1440 min)
 * - MORNING: 06:00 to 14:00 (360 to 840 min, 6 AM – 2 PM)
 * - EVENING: 14:00 to 22:00 (840 to 1320 min, 2 PM – 10 PM)
 * - NIGHT:   22:00 to 06:00 (1320 to 1440 min)
 */
export const STANDARD_SHIFT_SLOTS: Record<string, TimeSlot> = {
  FULL_DAY: { startMin: 0, endMin: 1440, label: 'Full Day (24/7)' },
  MORNING: { startMin: 360, endMin: 840, label: 'Morning (06:00 AM – 02:00 PM)' },
  EVENING: { startMin: 840, endMin: 1320, label: 'Evening (02:00 PM – 10:00 PM)' },
  NIGHT: { startMin: 1320, endMin: 1440, label: 'Night (10:00 PM – 06:00 AM)' },
  FOUR_HOURS: { startMin: 360, endMin: 600, label: '4 Hours (06:00 AM – 10:00 AM)' },
  HALF_DAY: { startMin: 360, endMin: 720, label: 'Half Day (06:00 AM – 12:00 PM)' },
};

/**
 * Encodes custom slot timing into a compact tag for storage in notes:
 * Example: encodeCustomSlot(600, 780) -> "SLOT:10:00-13:00|Custom (10:00 AM – 01:00 PM)"
 */
export function encodeCustomSlot(startMin: number, endMin: number, customLabel?: string): string {
  const startH = String(Math.floor(startMin / 60)).padStart(2, '0');
  const startM = String(startMin % 60).padStart(2, '0');
  const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
  const endM = String(endMin % 60).padStart(2, '0');
  const label = customLabel || `${minutesToTimeString(startMin)} – ${minutesToTimeString(endMin)}`;
  return `SLOT:${startH}:${startM}-${endH}:${endM}|${label}`;
}

/**
 * Extracts and parses a TimeSlot from a notes string or shift text.
 */
export function parseCustomSlotFromNotes(notes?: string | null): TimeSlot | null {
  if (!notes) return null;
  const match = notes.match(/SLOT:(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})(?:\|([^|\n\r]+))?/i);
  if (match) {
    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const endH = parseInt(match[3], 10);
    const endM = parseInt(match[4], 10);
    const label = match[5]?.trim() || `${minutesToTimeString(startH * 60 + startM)} – ${minutesToTimeString(endH * 60 + endM)}`;
    return {
      startMin: startH * 60 + startM,
      endMin: endH * 60 + endM,
      label,
      isCustom: true,
    };
  }

  // Regex fallback: "10:00 AM - 01:00 PM" or "10 AM - 1 PM"
  const humanMatch = notes.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (humanMatch) {
    const sMin = timeStringToMinutes(humanMatch[1]);
    const eMin = timeStringToMinutes(humanMatch[2]);
    if (eMin > sMin) {
      return {
        startMin: sMin,
        endMin: eMin,
        label: `${minutesToTimeString(sMin)} – ${minutesToTimeString(eMin)}`,
        isCustom: true,
      };
    }
  }

  return null;
}

/**
 * Resolves effective time slot given a shift identifier, notes, or duration.
 */
export function resolveEffectiveTimeSlot(shift?: string, notes?: string | null, duration?: string): TimeSlot {
  // First check if notes contain an explicit custom slot
  const fromNotes = parseCustomSlotFromNotes(notes);
  if (fromNotes) return fromNotes;

  const norm = (shift || '').toUpperCase().trim();

  // If shift itself contains time indicator or custom tag
  if (norm.startsWith('CUSTOM') || norm.includes('SLOT:')) {
    const slotFromShift = parseCustomSlotFromNotes(shift);
    if (slotFromShift) return slotFromShift;
    return {
      startMin: 600,
      endMin: 780,
      label: 'Custom (10:00 AM – 01:00 PM)',
      isCustom: true,
    };
  }

  if (norm === 'FULL_DAY') return STANDARD_SHIFT_SLOTS.FULL_DAY;
  if (norm === 'MORNING') {
    if (duration === 'FOUR_HOURS') return { startMin: 360, endMin: 600, label: 'Morning (06:00 AM – 10:00 AM, 4h)' };
    return STANDARD_SHIFT_SLOTS.MORNING;
  }
  if (norm === 'EVENING') {
    if (duration === 'FOUR_HOURS') return { startMin: 840, endMin: 1080, label: 'Evening (02:00 PM – 06:00 PM, 4h)' };
    return STANDARD_SHIFT_SLOTS.EVENING;
  }
  if (norm === 'NIGHT') return STANDARD_SHIFT_SLOTS.NIGHT;
  if (norm === 'FOUR_HOURS') return STANDARD_SHIFT_SLOTS.FOUR_HOURS;
  if (norm === 'HALF_DAY') return STANDARD_SHIFT_SLOTS.HALF_DAY;

  return STANDARD_SHIFT_SLOTS.FULL_DAY;
}

/**
 * Checks if two time intervals overlap.
 * Intervals [A_start, A_end] and [B_start, B_end] overlap if:
 * max(A_start, B_start) < min(A_end, B_end).
 * (Touching boundaries e.g. 10:00 AM to 01:00 PM and 01:00 PM to 04:00 PM do NOT overlap).
 */
export function checkSlotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  return Math.max(slotA.startMin, slotB.startMin) < Math.min(slotA.endMin, slotB.endMin);
}

/**
 * Computes all available time slots on a seat based on its existing active occupants.
 * Assumes general library operating hours: 06:00 AM (360) to 11:00 PM (1380).
 */
export function calculateAvailableSlotsOnSeat(
  existingOccupants: Array<{ shift?: string; notes?: string | null; studentName?: string; timeSlot?: TimeSlot }>,
  libraryOpenMin = 360,  // 06:00 AM
  libraryCloseMin = 1380 // 11:00 PM
): Array<TimeSlot> {
  // If no occupants, entire library operating window is free
  if (!existingOccupants || existingOccupants.length === 0) {
    return [
      {
        startMin: libraryOpenMin,
        endMin: libraryCloseMin,
        label: `${minutesToTimeString(libraryOpenMin)} – ${minutesToTimeString(libraryCloseMin)} (All Day Open)`,
      },
    ];
  }

  // Extract slots of all active occupants
  const occupiedIntervals: Array<{ startMin: number; endMin: number; name?: string }> = [];

  for (const occ of existingOccupants) {
    const slot = occ.timeSlot || resolveEffectiveTimeSlot(occ.shift, occ.notes);
    // If any occupant is FULL_DAY, whole seat is occupied with 0 free slots
    if (slot.startMin <= libraryOpenMin && slot.endMin >= libraryCloseMin) {
      return [];
    }
    occupiedIntervals.push({
      startMin: Math.max(slot.startMin, libraryOpenMin),
      endMin: Math.min(slot.endMin, libraryCloseMin),
      name: occ.studentName,
    });
  }

  // Sort occupied intervals by start time
  occupiedIntervals.sort((a, b) => a.startMin - b.startMin);

  // Merge overlapping or contiguous occupied intervals
  const mergedOccupied: Array<{ startMin: number; endMin: number }> = [];
  for (const interval of occupiedIntervals) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push({ ...interval });
    } else {
      const last = mergedOccupied[mergedOccupied.length - 1];
      if (interval.startMin <= last.endMin) {
        last.endMin = Math.max(last.endMin, interval.endMin);
      } else {
        mergedOccupied.push({ ...interval });
      }
    }
  }

  // Compute gaps between occupied intervals
  const freeSlots: TimeSlot[] = [];
  let currentCursor = libraryOpenMin;

  for (const occ of mergedOccupied) {
    if (occ.startMin > currentCursor) {
      // Gap of at least 60 minutes
      if (occ.startMin - currentCursor >= 60) {
        freeSlots.push({
          startMin: currentCursor,
          endMin: occ.startMin,
          label: `${minutesToTimeString(currentCursor)} – ${minutesToTimeString(occ.startMin)}`,
        });
      }
    }
    currentCursor = Math.max(currentCursor, occ.endMin);
  }

  if (libraryCloseMin > currentCursor && libraryCloseMin - currentCursor >= 60) {
    freeSlots.push({
      startMin: currentCursor,
      endMin: libraryCloseMin,
      label: `${minutesToTimeString(currentCursor)} – ${minutesToTimeString(libraryCloseMin)}`,
    });
  }

  return freeSlots;
}

/**
 * Standard slot options for 2-hour, 3-hour, and 4-hour quick pickers:
 */
export const QUICK_CUSTOM_SLOT_PRESETS = [
  { label: '07:00 AM – 10:00 AM (3h)', startMin: 420, endMin: 600, durationHours: 3 },
  { label: '10:00 AM – 01:00 PM (3h)', startMin: 600, endMin: 780, durationHours: 3 },
  { label: '11:00 AM – 02:00 PM (3h)', startMin: 660, endMin: 840, durationHours: 3 },
  { label: '02:00 PM – 05:00 PM (3h)', startMin: 840, endMin: 1020, durationHours: 3 },
  { label: '03:00 PM – 06:00 PM (3h)', startMin: 900, endMin: 1080, durationHours: 3 },
  { label: '06:00 PM – 09:00 PM (3h)', startMin: 1080, endMin: 1260, durationHours: 3 },
  { label: '07:00 PM – 10:00 PM (3h)', startMin: 1140, endMin: 1320, durationHours: 3 },
  { label: '08:00 AM – 10:00 AM (2h)', startMin: 480, endMin: 600, durationHours: 2 },
  { label: '12:00 PM – 02:00 PM (2h)', startMin: 720, endMin: 840, durationHours: 2 },
  { label: '04:00 PM – 06:00 PM (2h)', startMin: 960, endMin: 1080, durationHours: 2 },
  { label: '07:00 PM – 09:00 PM (2h)', startMin: 1140, endMin: 1260, durationHours: 2 },
];
