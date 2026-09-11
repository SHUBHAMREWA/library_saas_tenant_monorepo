'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download, Bell, BellRing, Check } from 'lucide-react';

interface PWACompanionProps {
  userEmail?: string;
  libraryId?: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PWACompanion({ userEmail, libraryId }: PWACompanionProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);

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
      try {
        const isDismissed = sessionStorage.getItem('dismissed_push_prompt') === 'true';
        setIsPromptDismissed(isDismissed);
      } catch {
        // ignore
      }
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

  const handleDismissPushPrompt = () => {
    setIsPromptDismissed(true);
    try {
      sessionStorage.setItem('dismissed_push_prompt', 'true');
    } catch {
      // ignore
    }
  };

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    setIsEnablingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const reg = await navigator.serviceWorker.ready;

          // Fetch VAPID public key
          const vapidRes = await fetch('/api/notifications/vapid-public-key');
          const vapidData = await vapidRes.json();
          const publicKey = vapidData?.publicKey;

          if (publicKey) {
            const applicationServerKey = urlBase64ToUint8Array(publicKey);
            const newSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            });

            // Register push subscription with backend
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: newSub.toJSON(),
                userEmail,
                libraryId,
              }),
            });
          }

          // Show local confirmation alert
          reg.showNotification('seeLibrary Alerts Enabled', {
            body: 'You will now receive real-time alerts for student fee renewals and seat expiries.',
            icon: '/icons/icon-192x192.png',
          });
        }

        setShowSuccessBadge(true);
        setTimeout(() => {
          setIsPromptDismissed(true);
        }, 2200);
      } else {
        setIsPromptDismissed(true);
      }
    } catch (err) {
      console.error('[PWA] Failed to enable push notifications:', err);
      setIsPromptDismissed(true);
    } finally {
      setIsEnablingPush(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const showPushPrompt =
    !isPromptDismissed &&
    pushStatus === 'default' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  return (
    <>
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50 animate-pulse">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Offline Mode Active. Cached study center records are displayed.</span>
        </div>
      )}

      {/* Push Notification Permission Request Banner */}
      {showPushPrompt && (
        <div className="mx-3 sm:mx-4 mt-2 mb-2 p-3 sm:p-3.5 bg-gradient-to-r from-indigo-50/95 via-white to-blue-50/90 dark:from-[#1c1c24] dark:via-[#16161a] dark:to-[#1a1a24] border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {showSuccessBadge ? (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <BellRing className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {showSuccessBadge ? 'Push Alerts Enabled!' : 'Enable Real-Time Alerts'}
                </p>
                {!showSuccessBadge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-300 mt-0.5">
                {showSuccessBadge
                  ? 'Background alerts are active on this device.'
                  : 'Get instant notifications for student fee expiries, renewals & dues on this device.'}
              </p>
            </div>
          </div>
          {!showSuccessBadge && (
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleDismissPushPrompt}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isEnablingPush}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isEnablingPush ? 'Enabling...' : '⚡ Turn On Alerts'}</span>
              </button>
            </div>
          )}
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
