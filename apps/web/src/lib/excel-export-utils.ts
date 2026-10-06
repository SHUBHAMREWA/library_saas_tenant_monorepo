import * as XLSX from 'xlsx';
import type { StudentItem } from '@/components/StudentList';

export interface ParsedStudentRow {
  rowIndex: number;
  fullName: string;
  phone: string;
  rawPhone: string;
  isValid: boolean;
  status: 'VALID' | 'DUPLICATE_IN_FILE' | 'INVALID';
  errorMessage?: string;
}

/**
 * Normalizes an Indian or standard phone number by stripping spaces,
 * hyphens, parentheses, and leading country codes (+91, 91, 0).
 */
export function normalizePhoneNumber(raw: any): { normalized: string; rawStr: string } {
  if (raw === null || raw === undefined) {
    return { normalized: '', rawStr: '' };
  }

  // Handle Excel numbers that may come as scientific notation or floats
  let str = '';
  if (typeof raw === 'number') {
    str = raw.toLocaleString('fullwide', { useGrouping: false });
  } else {
    str = String(raw).trim();
  }

  const rawStr = str;
  // Remove non-digit characters except leading plus if any
  let digits = str.replace(/[^\d]/g, '');

  // Strip leading 91 or +91 if length is 12 digits (Indian mobile numbers)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return { normalized: digits, rawStr };
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file into candidate student rows
 */
export async function parseStudentFile(file: File): Promise<{
  rows: ParsedStudentRow[];
  totalRawRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The uploaded file does not contain any worksheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  // Parse worksheet into array of arrays (header-agnostic)
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!data || data.length === 0) {
    throw new Error('The uploaded spreadsheet is empty.');
  }

  // Detect if row 0 is a header row
  let startIndex = 0;
  const firstRow = data[0] || [];
  const firstRowStr = firstRow.map((cell) => String(cell).toLowerCase().trim()).join(' ');

  const hasHeaderKeywords =
    firstRowStr.includes('name') ||
    firstRowStr.includes('student') ||
    firstRowStr.includes('phone') ||
    firstRowStr.includes('mobile') ||
    firstRowStr.includes('contact') ||
    firstRowStr.includes('number');

  if (hasHeaderKeywords) {
    startIndex = 1;
  }

  const parsedRows: ParsedStudentRow[] = [];
  const seenPhones = new Set<string>();

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rawName = row[0] !== undefined ? String(row[0]).trim() : '';
    const rawPhoneVal = row[1];

    // Skip completely blank rows
    if (!rawName && (rawPhoneVal === undefined || rawPhoneVal === '')) {
      continue;
    }

    const { normalized, rawStr } = normalizePhoneNumber(rawPhoneVal);
    const displayIndex = i + 1;

    // Validation rules
    let isValid = true;
    let status: 'VALID' | 'DUPLICATE_IN_FILE' | 'INVALID' = 'VALID';
    let errorMessage: string | undefined;

    if (!rawName || rawName.length < 2) {
      isValid = false;
      status = 'INVALID';
      errorMessage = 'Missing or invalid student name (min 2 characters required)';
    } else if (!normalized || normalized.length < 10 || normalized.length > 15) {
      isValid = false;
      status = 'INVALID';
      errorMessage = `Invalid phone number (${rawStr || 'empty'}). Must be 10 digits`;
    } else if (seenPhones.has(normalized)) {
      isValid = false;
      status = 'DUPLICATE_IN_FILE';
      errorMessage = `Duplicate phone number in this file (${normalized})`;
    } else {
      seenPhones.add(normalized);
    }

    parsedRows.push({
      rowIndex: displayIndex,
      fullName: rawName,
      phone: normalized,
      rawPhone: rawStr,
      isValid,
      status,
      errorMessage,
    });
  }

  const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'DUPLICATE_IN_FILE').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'INVALID').length;

  return {
    rows: parsedRows,
    totalRawRows: parsedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
  };
}

/**
 * Downloads a sample pre-formatted template for bulk student addition.
 */
export function downloadSampleStudentTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    { 'Student Name': 'Rahul Sharma', 'Mobile Number': '9876543210' },
    { 'Student Name': 'Priya Patel', 'Mobile Number': '9123456780' },
    { 'Student Name': 'Amit Kumar', 'Mobile Number': '9988776655' },
    { 'Student Name': 'Sneha Verma', 'Mobile Number': '8877665544' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Set clean column widths
  worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  const fileName = `Sample_Student_Bulk_Template.${format}`;
  XLSX.writeFile(workbook, fileName, { bookType: format });
}

/**
 * Exports all given students from the active library to an Excel (.xlsx) file.
 */
export function exportStudentsToExcel(students: StudentItem[], libraryName: string) {
  const rows = formatStudentsForExport(students);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 26 }, // Full Name
    { wch: 16 }, // Mobile Number
    { wch: 14 }, // Seat Number
    { wch: 14 }, // Shift
    { wch: 14 }, // Status
    { wch: 18 }, // Membership Validity
    { wch: 16 }, // Monthly Fee (₹)
    { wch: 16 }, // Fee Dues (₹)
    { wch: 26 }, // Study Purpose
    { wch: 18 }, // KYC ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');

  const sanitizedLibrary = (libraryName || 'Library').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${sanitizedLibrary}_Students_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}

/**
 * Exports all given students from the active library to a CSV (.csv) file.
 */
export function exportStudentsToCsv(students: StudentItem[], libraryName: string) {
  const rows = formatStudentsForExport(students);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');

  const sanitizedLibrary = (libraryName || 'Library').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${sanitizedLibrary}_Students_${dateStr}.csv`;

  XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
}

/**
 * Helper to transform StudentItem array into tabular records for export.
 */
function formatStudentsForExport(students: StudentItem[]) {
  return students.map((std, index) => {
    let validityStatus = 'No Plan';
    if (std.membershipEndsInDays > 0) {
      validityStatus = `${std.membershipEndsInDays} Days Left`;
    } else if (std.transactions && std.transactions.length > 0) {
      validityStatus = 'Expired';
    }

    return {
      'S.No': index + 1,
      'Student Name': std.fullName,
      'Mobile Number': std.phone,
      'Seat Number': std.seatNumber || 'Unassigned',
      'Shift': std.shift ? std.shift.replace('_', ' ') : 'N/A',
      'Status': std.status || 'INACTIVE',
      'Membership Validity': validityStatus,
      'Monthly Fee (₹)': std.monthlyFee !== undefined ? Number(std.monthlyFee) : 0,
      'Fee Dues (₹)': std.remainingFee !== undefined ? Number(std.remainingFee) : 0,
      'Study Purpose': std.studyPurpose || 'N/A',
      'KYC Document ID': std.kycDocId || 'N/A',
    };
  });
}
