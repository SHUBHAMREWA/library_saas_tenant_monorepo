'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  User,
  FileText,
} from 'lucide-react';
import { compressDataUrlToWebP, uploadImageToCloudinaryViaApi } from '@/lib/image-utils';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (cloudinaryUrl: string) => void;
  title?: string;
  mode?: 'profile' | 'document';
  folder?: string;
  tag?: string;
  maxDimension?: number;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoUploaded,
  title,
  mode = 'profile',
  folder = mode === 'profile' ? 'library_saas/students/photos' : 'library_saas/students/kyc',
  tag = mode === 'profile' ? 'student_profile' : 'student_kyc',
  maxDimension = mode === 'profile' ? 600 : 1200,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(mode === 'profile' ? 'user' : 'environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);
    setIsInitializing(true);
    setCapturedDataUrl(null);
    setCompressedSizeKb(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: mode === 'profile' ? 720 : 1920 },
          height: { ideal: mode === 'profile' ? 720 : 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      let msg = 'Unable to access camera. Please verify camera permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is in use by another application.';
      }
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  }, [mode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedDataUrl(null);
      setCameraError(null);
      setIsUploading(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(rawDataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCompressedSizeKb(null);
    startCamera(facingMode);
  };

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleUploadAndSave = async () => {
    if (!capturedDataUrl) return;
    setIsUploading(true);

    try {
      const processed = await compressDataUrlToWebP(
        capturedDataUrl,
        maxDimension,
        maxDimension,
        0.82
      );

      setCompressedSizeKb(Math.round(processed.sizeBytes / 1024));

      const uploaded = await uploadImageToCloudinaryViaApi(
        processed.dataUrl,
        folder,
        [tag, 'camera_capture']
      );

      onPhotoUploaded(uploaded.url);
      onClose();
    } catch (err: any) {
      console.error('Failed to compress and upload photo:', err);
      alert('Upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              {mode === 'profile' ? <User className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {title || (mode === 'profile' ? 'Capture Student Photo' : 'Capture KYC Document Photo')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Auto-WebP Compression & Cloudinary Storage</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport / Captured Preview */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          ) : isInitializing ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
              <span className="text-xs font-bold">Starting camera viewfinder...</span>
            </div>
          ) : capturedDataUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedDataUrl}
                alt="Captured Snapshot"
                className="max-h-[360px] w-auto object-contain rounded-lg shadow-lg"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ready for WebP Upload</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[380px] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {mode === 'profile' ? (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-dashed border-white/70 shadow-2xl flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                      Align Face in Circle
                    </span>
                  </div>
                ) : (
                  <div className="w-64 h-40 sm:w-72 sm:h-44 rounded-2xl border-2 border-dashed border-white/70 shadow-2xl flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                      Align ID Document Here
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-[#18181b] border-t border-slate-100 dark:border-[#262626] flex items-center justify-between gap-3">
          {capturedDataUrl ? (
            <>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-[#262626] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleUploadAndSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compressing & Uploading WebP...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Use & Upload Photo (WebP)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSwitchCamera}
                disabled={isInitializing || !!cameraError}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-neutral-300 bg-white dark:bg-[#242426] border border-slate-200 dark:border-[#333] hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch Camera</span>
              </button>

              <button
                type="button"
                disabled={isInitializing || !!cameraError}
                onClick={handleCaptureFrame}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
