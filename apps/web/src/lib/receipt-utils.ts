// Utility functions for digital receipts and WhatsApp messages

export interface FeeReceiptData {
  libraryName: string;
  libraryAddress?: string;
  libraryPhone?: string;
  studentName: string;
  studentPhone: string;
  seatNumber?: string | null;
  shift?: string;
  stayDuration?: string;
  receiptNumber?: string;
  paidForMonth: string;
  validFrom?: string;
  validTo?: string;
  totalFee?: number;
  amount: number;
  remainingFee?: number;
  paymentMode: string;
  paymentDate: string;
  notes?: string;
  isSettlingDue?: boolean;
}

export interface FeeReminderData {
  libraryName: string;
  libraryPhone?: string;
  studentName: string;
  studentPhone: string;
  seatNumber?: string | null;
  shift?: string;
  dueAmount?: number;
  dueDate?: string;
  paidForMonth?: string;
}

export type StudentWhatsAppCategory =
  | 'INACTIVE'
  | 'FEE_DUE'
  | 'EXPIRING_SOON'
  | 'ACTIVE_PAID'
  | 'GENERAL';

export interface StudentWhatsAppMessageData {
  libraryName: string;
  libraryPhone?: string;
  studentName: string;
  studentPhone: string;
  seatNumber?: string | null;
  shift?: string;
  dueAmount?: number;
  paidForMonth?: string;
  category?: StudentWhatsAppCategory;
}

export function formatShiftSummary(shift?: string, stayDuration?: string): string {
  const normShift = shift ? shift.toUpperCase() : 'FULL_DAY';
  const normDuration = stayDuration ? stayDuration.toUpperCase() : undefined;

  if (normShift === 'MORNING') {
    if (normDuration === 'FOUR_HOURS') return 'Morning (4h)';
    if (normDuration === 'HALF_DAY') return 'Morning (Half Day)';
    return 'Morning';
  }
  if (normShift === 'EVENING') {
    if (normDuration === 'FOUR_HOURS') return 'Evening (4h)';
    if (normDuration === 'HALF_DAY') return 'Evening (Half Day)';
    return 'Evening';
  }
  if (normShift === 'FOUR_HOURS') return '4 Hours';
  if (normShift === 'HALF_DAY') return 'Half Day';
  return 'Full Day';
}

/**
 * Generates a clean, compact WhatsApp message for a fee payment receipt
 */
export function generateWhatsAppReceiptText(data: FeeReceiptData): string {
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const dueText =
    data.remainingFee !== undefined && data.remainingFee > 0
      ? `\n• *Remaining Due:* ₹${data.remainingFee.toLocaleString('en-IN')} (Pending)`
      : '';

  const seatInfo = data.seatNumber ? `\n• *Seat:* Seat ${data.seatNumber}` : '';
  const shiftInfo = data.shift ? ` (${formatShiftSummary(data.shift, data.stayDuration)})` : '';
  const receiptNo = data.receiptNumber ? `\n• *Receipt No:* #${data.receiptNumber}` : '';

  const lines = [
    `*🧾 Fee Payment Receipt • ${data.libraryName}*`,
    ``,
    `Namaste *${data.studentName}*, your fee payment has been received successfully. ✅`,
    ``,
    `• *Amount Paid:* ₹${Number(data.amount).toLocaleString('en-IN')}`,
    `• *Month:* ${data.paidForMonth}`,
    `• *Date:* ${formattedDate} (${data.paymentMode})${seatInfo}${shiftInfo}${dueText}${receiptNo}`,
    ``,
    `Thank you for studying with us! 📚✨`,
    data.libraryPhone ? `📞 ${data.libraryPhone}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates context-aware, compact WhatsApp messages for students based on their status or filter tab:
 * - Inactive: Re-activation / re-join invitation
 * - Fee Due: Compact pending dues reminder
 * - Expiring Soon (5 Days): Advance renewal alert
 * - Active / Paid: Positive study check-in
 */
export function generateStudentWhatsAppMessage(data: StudentWhatsAppMessageData): string {
  const lib = data.libraryName || 'seeLibrary';
  const name = data.studentName;
  const phoneContact = data.libraryPhone ? `\n📞 *Contact:* ${data.libraryPhone}` : '';

  switch (data.category) {
    case 'INACTIVE': {
      return [
        `Namaste *${name}*! 👋`,
        ``,
        `Greetings from *${lib}*. We noticed your study seat is currently inactive.`,
        ``,
        `Are you planning to restart your study sessions or reserve your preferred seat again? Let us know so we can keep a spot ready for you! 📚✨`,
        phoneContact,
      ].filter(Boolean).join('\n');
    }

    case 'EXPIRING_SOON': {
      const seat = data.seatNumber ? ` (Seat ${data.seatNumber})` : '';
      return [
        `*⏰ Renewal Reminder • ${lib}*`,
        ``,
        `Namaste *${name}*,`,
        `Your library membership${seat} is expiring in the next few days.`,
        ``,
        `Please renew on time to continue your study sessions without interruption. Thank you! 📚`,
        phoneContact,
      ].filter(Boolean).join('\n');
    }

    case 'FEE_DUE': {
      const dueStr =
        data.dueAmount && data.dueAmount > 0
          ? `₹${data.dueAmount.toLocaleString('en-IN')}`
          : 'Pending Fee';
      const seat = data.seatNumber ? `\n• *Seat:* Seat ${data.seatNumber}` : '';
      const month = data.paidForMonth ? `\n• *Month:* ${data.paidForMonth}` : '';
      return [
        `*🔔 Fee Reminder • ${lib}*`,
        ``,
        `Namaste *${name}*,`,
        `This is a gentle reminder regarding your library fee:${seat}${month}`,
        `• *Due Amount:* ${dueStr}`,
        ``,
        `Please pay your pending fees to keep your seat reserved. Thank you! 🙏`,
        phoneContact,
      ].filter(Boolean).join('\n');
    }

    case 'ACTIVE_PAID':
    case 'GENERAL':
    default: {
      const seat = data.seatNumber ? ` (Seat ${data.seatNumber})` : '';
      return [
        `Namaste *${name}*! 👋`,
        ``,
        `Greetings from *${lib}*${seat}.`,
        `Wishing you great focus and success in your studies! Feel free to reach out if you need any assistance. 📚✨`,
        phoneContact,
      ].filter(Boolean).join('\n');
    }
  }
}

/**
 * Backwards compatible helper for fee reminders
 */
export function generateWhatsAppFeeReminderText(data: FeeReminderData): string {
  return generateStudentWhatsAppMessage({
    ...data,
    category: 'FEE_DUE',
  });
}

/**
 * Opens WhatsApp with prefilled message for the given phone number
 */
export function openWhatsApp(phone: string, text: string): void {
  const cleanPhone = phone.replace(/\D/g, '');
  const targetNumber = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`;
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${targetNumber}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
