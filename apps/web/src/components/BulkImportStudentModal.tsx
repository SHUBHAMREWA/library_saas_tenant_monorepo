'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  AlertCircle,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import {
  parseStudentFile,
  downloadSampleStudentTemplate,
  ParsedStudentRow,
} from '@/lib/excel-export-utils';

interface BulkImportStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryId: string;
  libraryName: string;
  userEmail?: string;
  onStudentsImported: (newStudents: any[]) => void;
}

export const BulkImportStudentModal: React.FC<BulkImportStudentModalProps> = ({
  isOpen,
  onClose,
  libraryId,
  libraryName,
  userEmail,
  onStudentsImported,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
  }>({ total: 0, valid: 0, duplicate: 0, invalid: 0 });

  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ISSUES'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    importedCount: number;
    skippedCount: number;
    skippedList: Array<{ name: string; phone: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setSubmitResult(null);
    setIsParsing(true);

    try {
      const result = await parseStudentFile(selectedFile);
      setParsedRows(result.rows);
      setStats({
        total: result.totalRawRows,
        valid: result.validCount,
        duplicate: result.duplicateCount,
        invalid: result.invalidCount,
      });
      if (result.validCount === 0 && result.totalRawRows > 0) {
        setParseError('No valid student rows found. Please check column format (Column 1: Name, Column 2: Mobile Number).');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(err.message || 'Failed to read file. Please verify it is a valid Excel or CSV spreadsheet.');
      setParsedRows([]);
      setStats({ total: 0, valid: 0, duplicate: 0, invalid: 0 });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setStats({ total: 0, valid: 0, duplicate: 0, invalid: 0 });
    setParseError(null);
    setSubmitResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    const validStudents = parsedRows
      .filter((r) => r.status === 'VALID')
      .map((r) => ({ fullName: r.fullName, phone: r.phone }));

    if (validStudents.length === 0) return;

    setIsSubmitting(true);
    setParseError(null);

    try {
      const res = await fetch(`/api/libraries/${libraryId}/students/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'x-user-email': userEmail } : {}),
        },
        body: JSON.stringify({ students: validStudents }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setParseError(data.error || 'Failed to import students. Please verify your SaaS subscription in Branch Settings.');
        return;
      }

      setSubmitResult({
        importedCount: data.importedCount || 0,
        skippedCount: (data.skippedCount || 0) + stats.duplicate + stats.invalid,
        skippedList: data.skipped || [],
      });

      if (data.createdStudents && data.createdStudents.length > 0) {
        onStudentsImported(data.createdStudents);
      }
    } catch (err: any) {
      console.error('Bulk import error:', err);
      setParseError(err.message || 'An error occurred while importing students.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedRows = parsedRows.filter((r) => {
    if (filterView === 'VALID') return r.status === 'VALID';
    if (filterView === 'ISSUES') return r.status !== 'VALID';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-2xl rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-[#262626]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                Bulk Enroll Students
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Excel & CSV
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Target Library: <span className="font-semibold text-slate-700 dark:text-neutral-200">{libraryName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Final Result Screen */}
        {submitResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Import Process Completed!
              </h4>
              <p className="text-xs text-slate-600 dark:text-neutral-300 max-w-md mx-auto">
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{submitResult.importedCount} students</strong> were enrolled successfully into <span className="font-semibold">{libraryName}</span>.
                {submitResult.skippedCount > 0 && (
                  <span> ({submitResult.skippedCount} rows skipped due to duplicates or formatting issues).</span>
                )}
              </p>
            </div>

            {submitResult.skippedList.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Skipped Records Details ({submitResult.skippedList.length})
                </h5>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#262626] bg-slate-50/50 dark:bg-[#1a1a1a] p-2 space-y-1.5 text-xs">
                  {submitResult.skippedList.map((skip, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-[#121212] rounded-lg border border-slate-100 dark:border-[#262626] flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-white">{skip.name}</span>
                        <span className="text-slate-400 dark:text-neutral-500 ml-2 font-mono text-[11px]">{skip.phone}</span>
                      </div>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded shrink-0">
                        {skip.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Close & View Directory
              </button>
            </div>
          </div>
        ) : (
          /* Normal Upload & Preview Flow */
          <div className="space-y-4">
            {/* Download Sample Template Helper Banner */}
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Need the standard format?
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-300">
                  Column 1: <strong>Student Name</strong> | Column 2: <strong>Mobile Number</strong> (10 digits)
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => downloadSampleStudentTemplate('xlsx')}
                  className="flex-1 sm:flex-none text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-[#1a1a1a] hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Sample Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleStudentTemplate('csv')}
                  className="flex-1 sm:flex-none text-[11px] font-semibold text-slate-700 dark:text-neutral-300 bg-white dark:bg-[#1a1a1a] hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-[#262626] px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Sample CSV
                </button>
              </div>
            </div>

            {/* Dropzone / File Picker */}
            {!file ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-[#333] hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-[#161616] group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-indigo-100 dark:border-indigo-900/50">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  Click or drag your Excel / CSV file here
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files (up to 500 students per batch)
                </p>
              </div>
            ) : (
              /* Selected File Bar */
              <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {(file.size / 1024).toFixed(1)} KB • {stats.total} total rows parsed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-white dark:bg-[#262626] border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Change File
                </button>
              </div>
            )}

            {/* Parsing Spinner */}
            {isParsing && (
              <div className="p-6 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Reading and validating student spreadsheet...</p>
              </div>
            )}

            {/* Error Message */}
            {parseError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Import Notice</p>
                  <p className="mt-0.5">{parseError}</p>
                </div>
              </div>
            )}

            {/* Stats Summary Cards */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => setFilterView('VALID')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      filterView === 'VALID'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                        : 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60'
                    }`}
                  >
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {stats.valid}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      Ready to Enroll
                    </div>
                  </div>

                  <div
                    onClick={() => setFilterView('ISSUES')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      filterView === 'ISSUES'
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-1 ring-amber-500'
                        : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60'
                    }`}
                  >
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {stats.duplicate}
                    </div>
                    <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      Duplicates in File
                    </div>
                  </div>

                  <div
                    onClick={() => setFilterView('ISSUES')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      filterView === 'ISSUES'
                        ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-1 ring-rose-500'
                        : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60'
                    }`}
                  >
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {stats.invalid}
                    </div>
                    <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                      Invalid Rows
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Preview Table Header */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="font-bold text-slate-700 dark:text-neutral-300">
                    Preview Data ({displayedRows.length} rows)
                  </div>
                  <div className="flex gap-1">
                    {(['ALL', 'VALID', 'ISSUES'] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setFilterView(view)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          filterView === view
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-neutral-300 hover:bg-slate-200'
                        }`}
                      >
                        {view === 'ALL' ? 'All' : view === 'VALID' ? 'Valid' : 'Issues'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#262626] bg-slate-50/30 dark:bg-[#161616]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-[#202020] text-slate-700 dark:text-neutral-300 font-bold sticky top-0 text-[11px] border-b border-slate-200 dark:border-[#262626]">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Name</th>
                        <th className="py-2 px-2.5">Mobile</th>
                        <th className="py-2 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#262626]">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                            No rows matching this filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => (
                          <tr key={row.rowIndex} className="hover:bg-slate-100/50 dark:hover:bg-[#1a1a1a]">
                            <td className="py-1.5 px-2.5 text-slate-400 dark:text-neutral-500 font-mono text-[10px]">
                              {row.rowIndex}
                            </td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-800 dark:text-white truncate max-w-[120px]">
                              {row.fullName || <span className="text-rose-400 italic font-normal">Empty</span>}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600 dark:text-neutral-300">
                              {row.phone || row.rawPhone || '-'}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {row.status === 'VALID' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                                </span>
                              ) : row.status === 'DUPLICATE_IN_FILE' ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded"
                                  title={row.errorMessage}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" /> Duplicate
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                                  title={row.errorMessage}
                                >
                                  <XCircle className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{row.errorMessage || 'Invalid'}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic">
                  Note: Photo, KYC verification documents, and purpose of study are omitted for bulk import. You can add them later via Student Profile.
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#262626] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={stats.valid === 0 || isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Enrolling {stats.valid} Students...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Enroll {stats.valid} Students
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
