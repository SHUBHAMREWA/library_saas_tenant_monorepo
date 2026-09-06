'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download, Bell, Check } from 'lucide-react';

export function PWACompanion() {
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    setMounted(true);
    // 1. Service Worker Registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Online / Offline status monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // 3. BeforeInstallPrompt PWA event capture
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Notification permission check
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleEnablePush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPushStatus(permission);
        if (permission === 'granted') {
          // Show local confirmation notification
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('Notifications Enabled', {
              body: 'You will receive real-time alerts for student check-ins and fee renewals.',
              icon: '/icons/icon-192x192.png',
            });
          }
        }
      } catch (err) {
        console.error('[PWA] Failed to request notification permission:', err);
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50 animate-pulse">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Offline Mode Active. Cached study center records are displayed.</span>
        </div>
      )}

      {/* Optional Install to Home Screen Banner if prompt is available */}
      {canInstall && (
        <div className="mx-4 mt-2 mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-xs font-bold text-indigo-900">Install Library Hub App</p>
              <p className="text-[11px] text-indigo-700">Add to phone home screen for 1-tap launch</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 active:scale-95"
          >
            Install
          </button>
        </div>
      )}
    </>
  );
}
