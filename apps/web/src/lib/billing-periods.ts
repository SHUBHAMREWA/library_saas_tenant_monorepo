// =======================================================
// Billing Periods Engine: Rolling 30-Day Period Formatter & Helpers
// Aligns 30-day membership cycles across two calendar months
// (e.g. 10 Jan - 10 Feb -> "January – February 2026")
// =======================================================

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a short month period label, e.g. "Jan – Feb 2026" or "Dec 2025 – Jan 2026"
 */
export function formatMonthPeriod(validFromStr?: string, validToStr?: string): string {
  if (!validFromStr) {
    const now = new Date();
    return `${MONTH_NAMES_FULL[now.getMonth()]} ${now.getFullYear()}`;
  }

  const fromDate = new Date(validFromStr);
  if (isNaN(fromDate.getTime())) return validFromStr;

  if (!validToStr) {
    return `${MONTH_NAMES_FULL[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
  }

  const toDate = new Date(validToStr);
  if (isNaN(toDate.getTime())) {
    return `${MONTH_NAMES_FULL[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
  }

  const fromMonth = fromDate.getMonth();
  const toMonth = toDate.getMonth();
  const fromYear = fromDate.getFullYear();
  const toYear = toDate.getFullYear();

  if (fromMonth === toMonth && fromYear === toYear) {
    return `${MONTH_NAMES_FULL[fromMonth]} ${fromYear}`;
  }

  if (fromYear === toYear) {
    return `${MONTH_NAMES_SHORT[fromMonth]} – ${MONTH_NAMES_SHORT[toMonth]} ${toYear}`;
  }

  return `${MONTH_NAMES_SHORT[fromMonth]} ${fromYear} – ${MONTH_NAMES_SHORT[toMonth]} ${toYear}`;
}

/**
 * Returns a detailed period label with exact dates,
 * e.g. "January – February 2026 (10 Jan – 10 Feb)"
 */
export function getDetailedPeriodLabel(validFromStr?: string, validToStr?: string): string {
  if (!validFromStr) return '';

  const fromDate = new Date(validFromStr);
  if (isNaN(fromDate.getTime())) return validFromStr;

  const toDate = validToStr ? new Date(validToStr) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const fromDay = fromDate.getDate();
  const toDay = toDate.getDate();
  const fromMonthShort = MONTH_NAMES_SHORT[fromDate.getMonth()];
  const toMonthShort = MONTH_NAMES_SHORT[toDate.getMonth()];
  const fromMonthFull = MONTH_NAMES_FULL[fromDate.getMonth()];
  const toMonthFull = MONTH_NAMES_FULL[toDate.getMonth()];
  const fromYear = fromDate.getFullYear();
  const toYear = toDate.getFullYear();

  const formattedSpan = `${fromDay} ${fromMonthShort} – ${toDay} ${toMonthShort}`;

  if (fromMonthFull === toMonthFull && fromYear === toYear) {
    return `${fromMonthFull} ${fromYear} (${formattedSpan})`;
  }

  if (fromYear === toYear) {
    return `${fromMonthFull} – ${toMonthFull} ${toYear} (${formattedSpan})`;
  }

  return `${fromMonthFull} ${fromYear} – ${toMonthFull} ${toYear} (${formattedSpan})`;
}

/**
 * Computes default 30-day membership cycle dates from a start date
 */
export function calculateDefaultPeriod(startDate: Date | string = new Date()): {
  validFrom: string;
  validTo: string;
  periodLabel: string;
  shortPeriod: string;
} {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 30);

  const validFrom = start.toISOString().split('T')[0];
  const validTo = end.toISOString().split('T')[0];

  return {
    validFrom,
    validTo,
    periodLabel: getDetailedPeriodLabel(validFrom, validTo),
    shortPeriod: formatMonthPeriod(validFrom, validTo),
  };
}

/**
 * Generates options for filter dropdowns (previous 4 months up to next 4 months)
 */
export function getBillingPeriodFilterOptions(refDate: Date = new Date()): Array<{
  value: string;
  label: string;
}> {
  const options: Array<{ value: string; label: string }> = [
    { value: 'ALL', label: 'All Billing Periods' }
  ];

  const seen = new Set<string>();

  // Rolling 30-day blocks around current date
  for (let offset = -4; offset <= 4; offset++) {
    const base = new Date(refDate.getFullYear(), refDate.getMonth() + offset, 1);
    const end = new Date(refDate.getFullYear(), refDate.getMonth() + offset + 1, 1);
    
    const shortLabel = `${MONTH_NAMES_SHORT[base.getMonth()]} – ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
    const singleMonthLabel = `${MONTH_NAMES_FULL[base.getMonth()]} ${base.getFullYear()}`;

    if (!seen.has(shortLabel)) {
      seen.add(shortLabel);
      options.push({ value: shortLabel, label: shortLabel });
    }
    if (!seen.has(singleMonthLabel)) {
      seen.add(singleMonthLabel);
      options.push({ value: singleMonthLabel, label: singleMonthLabel });
    }
  }

  return options;
}

/**
 * Adds N calendar months to an ISO date string (YYYY-MM-DD),
 * safely handling varying month lengths without overflow bugs (e.g. 31 Jan + 1 mo -> 28 Feb).
 */
export function addMonthsToDate(dateStr: string, months: number): string {
  if (!dateStr || months <= 0) return dateStr;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }
  const [year, month, day] = parts;
  // Note: month is 1-indexed in dateStr
  const target = new Date(year, month - 1 + months, day);
  // If date rolled over past the end of target month (e.g. Feb 31 -> Mar 3)
  if (target.getDate() !== day) {
    target.setDate(0); // Clamps to last day of target month
  }
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes difference in calendar months (or approximate rounded months) between two dates
 */
export function getMonthsDifference(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 1;
  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 1;
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.max(1, Math.round(days / 30));
}
