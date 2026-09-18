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
 * Format any date string or Date object to standard Day-Month-Year (DD-MM-YYYY)
 */
export function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split('T')[0];
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    return clean;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean.replace(/\//g, '-');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Generates a clean, compact WhatsApp message for a fee payment receipt
 */
export function generateWhatsAppReceiptText(data: FeeReceiptData): string {
  const formattedDate = formatDateDMY(data.paymentDate);

  const dueText =
    data.remainingFee !== undefined && data.remainingFee > 0
      ? `\n• *Remaining Due:* ₹${data.remainingFee.toLocaleString('en-IN')} (Pending)`
      : '';

  const seatInfo = data.seatNumber ? `\n• *Seat:* Seat ${data.seatNumber}` : '';
  const shiftInfo = data.shift ? ` (${formatShiftSummary(data.shift, data.stayDuration)})` : '';
  const receiptNo = data.receiptNumber ? `\n• *Receipt No:* #${data.receiptNumber}` : '';
  const validityInfo = data.validFrom && data.validTo
    ? `\n• *Validity:* ${formatDateDMY(data.validFrom)} to ${formatDateDMY(data.validTo)}`
    : '';

  const lines = [
    `*🧾 Fee Payment Receipt • ${data.libraryName}*`,
    ``,
    `Namaste *${data.studentName}*, your fee payment has been received successfully. ✅`,
    ``,
    `• *Amount Paid:* ₹${Number(data.amount).toLocaleString('en-IN')}`,
    `• *Month:* ${data.paidForMonth}${validityInfo}`,
    `• *Date:* ${formattedDate} (${data.paymentMode})${seatInfo}${shiftInfo}${dueText}${receiptNo}`,
    ``,
    `Thank you for studying with us! 📚✨`,
    data.libraryPhone ? `📞 ${data.libraryPhone}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Clean, isolated receipt printer that always prints exactly 1 sheet of paper
 * without duplicating or printing the background page / action buttons.
 */
export function printFeeReceipt(data: FeeReceiptData): void {
  if (typeof window === 'undefined') return;

  const formattedPaymentDate = formatDateDMY(data.paymentDate);
  const formattedValidity = data.validFrom && data.validTo
    ? `${formatDateDMY(data.validFrom)} to ${formatDateDMY(data.validTo)}`
    : null;

  const isDueClearance = data.isSettlingDue;
  const isFullyPaid = !data.remainingFee || data.remainingFee <= 0;
  const shiftText = formatShiftSummary(data.shift, data.stayDuration);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt #${data.receiptNumber || 'Fee-Receipt'} - ${data.studentName}</title>
  <style>
    @page {
      size: portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 10px;
    }
    .receipt-container {
      width: 100%;
      max-width: 440px;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 20px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header {
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 2px dashed #e2e8f0;
    }
    .library-name {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px 0;
    }
    .library-phone {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .receipt-title-box {
      margin-top: 10px;
      display: inline-block;
      padding: 3px 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #334155;
    }
    .receipt-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 11.5px;
      color: #475569;
    }
    .receipt-no {
      font-family: monospace;
      font-weight: 800;
      color: #0f172a;
    }
    .receipt-date {
      font-weight: 700;
      color: #0f172a;
    }
    .details-card {
      margin-top: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;
      border-bottom: 1px solid #edf2f7;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #64748b;
      font-weight: 500;
    }
    .detail-value {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .highlight-indigo {
      color: #4338ca;
    }
    .highlight-emerald {
      color: #047857;
      font-size: 13px;
      font-weight: 800;
    }
    .financial-section {
      margin-top: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .financial-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 12px;
      font-size: 12px;
      background: #ffffff;
    }
    .financial-row.header-row {
      background: #f1f5f9;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .financial-row.total-row {
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      font-weight: 700;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 800;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .status-due {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
    }
    .footer {
      text-align: center;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
      font-size: 9.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1 class="library-name">${data.libraryName || 'seeLibrary Study Center'}</h1>
      ${data.libraryPhone ? `<p class="library-phone">Contact: ${data.libraryPhone}</p>` : ''}
      <div class="receipt-title-box">OFFICIAL FEE PAYMENT RECEIPT</div>
    </div>

    <div class="receipt-meta">
      <span>Receipt: <strong class="receipt-no">#${data.receiptNumber || 'N/A'}</strong></span>
      <span>Date: <strong class="receipt-date">${formattedPaymentDate}</strong></span>
    </div>

    <div class="details-card">
      <div class="detail-row">
        <span class="detail-label">Student Name:</span>
        <span class="detail-value">${data.studentName}</span>
      </div>
      ${data.seatNumber ? `
      <div class="detail-row">
        <span class="detail-label">Assigned Seat:</span>
        <span class="detail-value highlight-indigo">Seat ${data.seatNumber}</span>
      </div>` : `
      <div class="detail-row">
        <span class="detail-label">Seat Status:</span>
        <span class="detail-value" style="color: #64748b; font-weight: 500;">General / Unassigned</span>
      </div>`}
      <div class="detail-row">
        <span class="detail-label">Shift & Duration:</span>
        <span class="detail-value highlight-indigo">${shiftText}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Month / Period:</span>
        <span class="detail-value highlight-indigo">${data.paidForMonth}</span>
      </div>
      ${formattedValidity ? `
      <div class="detail-row">
        <span class="detail-label">Validity Period:</span>
        <span class="detail-value">${formattedValidity}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">Payment Mode:</span>
        <span class="detail-value">${data.paymentMode}</span>
      </div>
    </div>

    <div class="financial-section">
      <div class="financial-row header-row">
        <span>Description</span>
        <span>Amount</span>
      </div>
      <div class="financial-row">
        <span>${isDueClearance ? 'Due Balance Settlement' : 'Membership Fee'}</span>
        <span>₹${(data.totalFee ?? data.amount).toLocaleString('en-IN')}</span>
      </div>
      <div class="financial-row total-row">
        <span><strong>Amount Received</strong></span>
        <span class="highlight-emerald">₹${Number(data.amount).toLocaleString('en-IN')}</span>
      </div>
      <div class="financial-row" style="background: #ffffff; border-top: 1px solid #f1f5f9;">
        <span>Payment Status:</span>
        <span>
          ${!isFullyPaid && data.remainingFee
            ? `<span class="status-badge status-due">₹${data.remainingFee.toLocaleString('en-IN')} (Pending Due)</span>`
            : `<span class="status-badge status-paid">₹0 (Fully Cleared ✅)</span>`}
        </span>
      </div>
    </div>

    ${data.notes ? `
    <div style="margin-top: 8px; font-size: 10.5px; color: #64748b; font-style: italic;">
      Note: "${data.notes}"
    </div>` : ''}

    <div class="footer">
      Computer-generated digital receipt • Thank you for studying with us! 📚✨
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print failed in iframe, falling back to window.print:', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 300);
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
