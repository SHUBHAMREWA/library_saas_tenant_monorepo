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

export function formatShiftSummary(shift?: string, stayDuration?: string): string {
  const normShift = shift ? shift.toUpperCase() : 'FULL_DAY';
  const normDuration = stayDuration ? stayDuration.toUpperCase() : undefined;

  if (normShift === 'MORNING') {
    if (normDuration === 'FOUR_HOURS') return 'Morning Shift (4 Hours / Day)';
    if (normDuration === 'HALF_DAY') return 'Morning Shift (Half Day, 6–8h)';
    return 'Morning Shift';
  }
  if (normShift === 'EVENING') {
    if (normDuration === 'FOUR_HOURS') return 'Evening Shift (4 Hours / Day)';
    if (normDuration === 'HALF_DAY') return 'Evening Shift (Half Day, 6–8h)';
    return 'Evening Shift';
  }
  if (normShift === 'FOUR_HOURS') return '4 Hours / Day';
  if (normShift === 'HALF_DAY') return 'Half Day (6–8h)';
  return 'Full Day (24/7 Unlimited)';
}

/**
 * Generates an automated WhatsApp message for a fee payment receipt
 */
export function generateWhatsAppReceiptText(data: FeeReceiptData): string {
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const dueText =
    data.remainingFee !== undefined && data.remainingFee > 0
      ? `₹${data.remainingFee.toLocaleString('en-IN')} (Pending)`
      : '₹0 (Fully Cleared ✅)';

  const lines = [
    `*🧾 FEE PAYMENT RECEIPT*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏛️ *Library:* ${data.libraryName}`,
    `👤 *Student Name:* ${data.studentName}`,
    `🪑 *Assigned Seat:* ${data.seatNumber ? `Seat ${data.seatNumber}` : 'Unassigned / General'}`,
    data.shift ? `⏰ *Shift / Plan:* ${formatShiftSummary(data.shift, data.stayDuration)}` : '',
    data.receiptNumber ? `🔢 *Receipt No:* #${data.receiptNumber}` : '',
    `📅 *Payment Date:* ${formattedDate}`,
    `💳 *Payment Mode:* ${data.paymentMode}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📋 *FEES BREAKDOWN:*`,
    data.isSettlingDue
      ? `• *Payment Type:* Settling Previous Remaining Balance 🎯`
      : '',
    `• *Month:* ${data.paidForMonth}`,
    data.validFrom && data.validTo ? `• *Validity Period:* ${data.validFrom} to ${data.validTo}` : '',
    data.isSettlingDue
      ? `• *Pending Balance Cleared:* ₹${Number(data.amount).toLocaleString('en-IN')}`
      : data.totalFee !== undefined && data.totalFee > 0
      ? `• *Total Monthly Fee:* ₹${data.totalFee.toLocaleString('en-IN')}`
      : '',
    `• *Amount Received:* ₹${Number(data.amount).toLocaleString('en-IN')}`,
    `• *Remaining Balance Due:* ${dueText}`,
    data.notes ? `• *Note:* ${data.notes}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 *Thank You!*`,
    `Thank you for your payment. We wish you great focus and success in your studies at *${data.libraryName}*! 📚✨`,
    data.libraryPhone ? `\n📞 *Contact / Support:* ${data.libraryPhone}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates an automated WhatsApp reminder message for students whose seat is assigned/reserved but fee is pending
 */
export function generateWhatsAppFeeReminderText(data: FeeReminderData): string {
  const dueStr =
    data.dueAmount && data.dueAmount > 0
      ? `₹${data.dueAmount.toLocaleString('en-IN')}`
      : 'Membership Fee';

  const lines = [
    `*🔔 FEE PAYMENT REMINDER*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Dear *${data.studentName}*,`,
    ``,
    `Greetings from *${data.libraryName}*! 🏛️`,
    ``,
    `This is a gentle reminder regarding your library membership & seat allotment:`,
    `• *Seat Number:* ${data.seatNumber ? `Seat ${data.seatNumber}` : 'Enrolled'}`,
    data.shift ? `• *Shift / Plan:* ${data.shift}` : '',
    data.paidForMonth ? `• *Month:* ${data.paidForMonth}` : '',
    `• *Pending Amount Due:* ${dueStr}`,
    ``,
    `⚠️ *Please pay your library fees as soon as possible* to ensure your seat reservation remains active and your study schedule continues without interruption.`,
    ``,
    `If you have already made the payment, please share your payment screenshot or ignore this reminder.`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Thank you,`,
    `*${data.libraryName} Management*`,
    data.libraryPhone ? `📞 *Contact:* ${data.libraryPhone}` : '',
  ].filter(Boolean);

  return lines.join('\n');
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
