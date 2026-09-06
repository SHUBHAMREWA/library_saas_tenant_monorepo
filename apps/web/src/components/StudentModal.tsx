'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Armchair,
  Camera,
  Upload,
  Trash2,
  Loader2,
  IndianRupee,
} from 'lucide-react';
import {
  compressAndConvertToWebP,
  uploadImageToCloudinaryViaApi,
  deleteImageFromCloudinaryViaApi,
} from '@/lib/image-utils';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSeats?: { id: string; seatNumber: string; rowName?: string }[];
  preselectedSeatNumber?: string | null;
  onStudentCreated: (student: {
    fullName: string;
    phone: string;
    studyPurpose?: string;
    shift: string;
    durationMonths?: number;
    feeAmount?: number;
    seatNumber?: string | null;
    photoUrl?: string | null;
    kycPhotoUrl?: string | null;
    kycDocId?: string;
    kycType?: string;
  }) => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  availableSeats,
  preselectedSeatNumber,
  onStudentCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(preselectedSeatNumber || null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [kycPhotoUrl, setKycPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);
  const [studyPurposeChoice, setStudyPurposeChoice] = useState<string>('Civil Services / UPSC');
  const [customPurpose, setCustomPurpose] = useState<string>('');

  const [formData, setFormData] = useState<{
    fullName: string;
    phone: string;
    email: string;
    fatherName: string;
    kycType: string;
    kycDocId: string;
    shift: string;
  }>({
    fullName: '',
    phone: '',
    email: '',
    fatherName: '',
    kycType: 'AADHAAR',
    kycDocId: '',
    shift: 'FULL_DAY',
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedSeatNumber(preselectedSeatNumber || null);
      setStep(1);
    } else {
      setPhotoUrl(null);
      setKycPhotoUrl(null);
      setIsUploadingPhoto(false);
      setIsUploadingKyc(false);
      setStudyPurposeChoice('Civil Services / UPSC');
      setCustomPurpose('');
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        fatherName: '',
        kycType: 'AADHAAR',
        kycDocId: '',
        shift: 'FULL_DAY',
      });
    }
  }, [isOpen, preselectedSeatNumber]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // 1. Compress image & convert to WebP format
      const processed = await compressAndConvertToWebP(file, 600, 600, 0.82);

      // Clean up previously uploaded photo in this draft session if exists
      if (photoUrl) {
        deleteImageFromCloudinaryViaApi(photoUrl);
      }

      // 2. Upload WebP to Cloudinary
      const uploaded = await uploadImageToCloudinaryViaApi(
        processed.dataUrl,
        'library_saas/students/photos',
        ['student_profile']
      );
      setPhotoUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to process and upload profile photo:', err);
      alert('Photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (photoUrl) {
      deleteImageFromCloudinaryViaApi(photoUrl);
      setPhotoUrl(null);
    }
  };

  const handleKycPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingKyc(true);
    try {
      // 1. Compress image & convert to WebP format
      const processed = await compressAndConvertToWebP(file, 1200, 1200, 0.80);

      // Clean up previously uploaded KYC photo in this draft session if exists
      if (kycPhotoUrl) {
        deleteImageFromCloudinaryViaApi(kycPhotoUrl);
      }

      // 2. Upload WebP to Cloudinary
      const uploaded = await uploadImageToCloudinaryViaApi(
        processed.dataUrl,
        'library_saas/students/kyc',
        ['student_kyc']
      );
      setKycPhotoUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to process and upload KYC document photo:', err);
      alert('Document photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingKyc(false);
      e.target.value = '';
    }
  };

  const handleRemoveKycPhoto = async () => {
    if (kycPhotoUrl) {
      deleteImageFromCloudinaryViaApi(kycPhotoUrl);
      setKycPhotoUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPurpose =
      studyPurposeChoice === 'Other'
        ? customPurpose.trim() || 'Other'
        : studyPurposeChoice;

    onStudentCreated({
      fullName: formData.fullName,
      phone: formData.phone,
      studyPurpose: finalPurpose,
      shift: formData.shift,
      seatNumber: selectedSeatNumber || null,
      photoUrl: photoUrl || null,
      kycPhotoUrl: kycPhotoUrl || null,
      kycDocId: formData.kycDocId.trim() || undefined,
      kycType: formData.kycType,
    });
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">New Student Registration</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                step === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}>1. Profile</span>
              <span className="text-slate-300">→</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                step === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}>2. KYC</span>
              <span className="text-slate-300">→</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                step === 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}>3. Plan</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Personal Profile */}
        {step === 1 && (
          <div className="space-y-3.5">
            {/* Profile Photo Upload */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="relative group shrink-0">
                {isUploadingPhoto ? (
                  <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex flex-col items-center justify-center text-indigo-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Student Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-600 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <User className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <label
                  htmlFor="student-photo-upload"
                  className={`absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all ${
                    isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  title="Upload profile photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
                <input
                  id="student-photo-upload"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-slate-800">
                  Profile Photo <span className="text-[10px] text-slate-400 font-normal">(Auto-WebP & Cloudinary)</span>
                </span>
                <p className="text-[11px] text-slate-500 truncate">
                  {isUploadingPhoto
                    ? 'Compressing & uploading to Cloudinary...'
                    : photoUrl
                    ? 'Cloudinary WebP photo ready'
                    : 'Upload student picture for directory'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <label
                    htmlFor="student-photo-upload"
                    className={`text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer ${
                      isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploadingPhoto ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Choose Photo'}
                  </label>
                  {photoUrl && !isUploadingPhoto && (
                    <>
                      <span className="text-slate-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Vikram Sharma"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purpose of Study
              </label>
              <select
                value={studyPurposeChoice}
                onChange={(e) => setStudyPurposeChoice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Civil Services / UPSC">Civil Services / UPSC</option>
                <option value="Medical / NEET">Medical / NEET</option>
                <option value="Engineering / JEE">Engineering / JEE</option>
                <option value="CA / CS / Finance">CA / CS / Finance</option>
                <option value="General Study">General Study</option>
                <option value="Other">Other / Custom Purpose</option>
              </select>
            </div>

            {studyPurposeChoice === 'Other' && (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <label className="block text-xs font-semibold text-indigo-700 mb-1">
                  Specify Custom Study Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="e.g. SSC CGL, Banking Exams, UGC NET, Defence..."
                  className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/30 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <button
              type="button"
              disabled={
                !formData.fullName.trim() ||
                !formData.phone.trim() ||
                (studyPurposeChoice === 'Other' && !customPurpose.trim())
              }
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-xs mt-3 cursor-pointer"
            >
              Continue to KYC <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: KYC & Identification */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-900">
                Government documents and ID photos are saved securely with the student profile.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Type
              </label>
              <select
                value={formData.kycType}
                onChange={(e) => setFormData({ ...formData, kycType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="VOTER_ID">Voter ID</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.kycType === 'AADHAAR' ? 'Aadhaar Card Number' : 'ID Card Reference'}
              </label>
              <input
                type="text"
                value={formData.kycDocId}
                onChange={(e) => setFormData({ ...formData, kycDocId: e.target.value })}
                placeholder={
                  formData.kycType === 'AADHAAR'
                    ? 'e.g. 12-digit Aadhaar Number'
                    : 'e.g. XXXX-XXXX-4589'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Aadhaar / ID Card Photo Upload Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>{formData.kycType === 'AADHAAR' ? 'Aadhaar Card Photo' : 'Document Photo'}</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>

              {isUploadingKyc ? (
                <div className="p-6 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center text-center bg-indigo-50/40 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-800">
                    Compressing & Uploading to Cloudinary (WebP)...
                  </span>
                  <span className="text-[10px] text-indigo-600">Please wait a moment</span>
                </div>
              ) : kycPhotoUrl ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <img
                    src={kycPhotoUrl}
                    alt="Aadhaar Card"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      Cloudinary Document Photo Ready
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <label
                        htmlFor="kyc-photo-upload"
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Change Photo
                      </label>
                      <span className="text-slate-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleRemoveKycPhoto}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="kyc-photo-upload"
                  className="p-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mb-1.5 shadow-2xs transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                    Upload {formData.kycType === 'AADHAAR' ? 'Aadhaar Card' : 'ID Card'} Photo
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Auto-compressed to WebP and securely stored on Cloudinary
                  </span>
                </label>
              )}
              <input
                id="kyc-photo-upload"
                type="file"
                accept="image/*"
                disabled={isUploadingKyc}
                onChange={handleKycPhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                Plan & Shift <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Initial Membership & Shift Selection */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stay Duration / Plan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'FOUR_HOURS', label: '4 Hours', time: '4h / day slot' },
                  { id: 'HALF_DAY', label: 'Half Day', time: '6-8h / day slot' },
                  { id: 'FULL_DAY', label: 'Full Day', time: '24/7 Unlimited' },
                ].map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, shift: shift.id })}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.shift === shift.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">{shift.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{shift.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seat Allocation Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Armchair className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Assign Seat Allocation</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <select
                value={selectedSeatNumber || ''}
                onChange={(e) => setSelectedSeatNumber(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">No seat assigned yet (Waitlist / Unassigned)</option>
                {preselectedSeatNumber && !availableSeats?.some((s) => s.seatNumber === preselectedSeatNumber) && (
                  <option value={preselectedSeatNumber}>
                    Seat {preselectedSeatNumber} (Pre-selected)
                  </option>
                )}
                {availableSeats?.map((s) => (
                  <option key={s.id} value={s.seatNumber}>
                    Seat {s.seatNumber} ({s.rowName || 'Hall'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Students can also be assigned or moved between seats anytime.
              </p>
            </div>

            {/* Informational Notice: Fees collected separately via Collect Fee */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block text-xs">Fee Collection via Collect Fee</span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Monthly fees, stay plans (4h, half day, full day), and validity extensions are recorded directly via the <strong>Collect Fee</strong> button.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" /> Finish & Enroll
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
