'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Megaphone,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  Smartphone,
} from 'lucide-react';

interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  libraryId?: string;
  libraryName?: string;
  onSelectStudent?: (studentId: string) => void;
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

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  libraryId,
  libraryName,
  onSelectStudent,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRunningSweep, setIsRunningSweep] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'EXPIRING' | 'BROADCAST'>('ALL');

  // Check browser push permission and current subscription
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsPushSubscribed(Boolean(sub));
          });
        });
      }
    }

    fetchNotifications();
  }, [isOpen, libraryId, userEmail]);

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const params = new URLSearchParams();
      if (libraryId) params.append('libraryId', libraryId);
      if (userEmail) params.append('userEmail', userEmail);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleTogglePushNotifications = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatusMessage('Push notifications are not supported on this browser/device.');
      return;
    }

    setIsToggling(true);
    setStatusMessage(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();

      if (isPushSubscribed && existingSub) {
        // Disallow / Unsubscribe
        await existingSub.unsubscribe();
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existingSub.endpoint }),
        });
        setIsPushSubscribed(false);
        setStatusMessage('Push notifications turned OFF (Disallowed).');
      } else {
        // Allow / Subscribe
        const reqPermission = await Notification.requestPermission();
        setPermission(reqPermission);

        if (reqPermission !== 'granted') {
          setStatusMessage('Permission was not granted. Please allow notifications in your browser settings.');
          setIsToggling(false);
          return;
        }

        // Fetch VAPID public key
        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        const vapidData = await vapidRes.json();
        const publicKey = vapidData.publicKey;

        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Register with backend
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSub.toJSON(),
            userEmail,
            libraryId,
          }),
        });

        setIsPushSubscribed(true);
        setStatusMessage('Push notifications ALLOWED! You will now receive background alerts.');

        // Show local confirmation notification
        reg.showNotification('seeLibrary Alerts Enabled', {
          body: 'You will receive real-time alerts when student memberships expire or admins broadcast.',
          icon: '/icons/icon-192x192.png',
        });
      }
    } catch (err: any) {
      console.error('Push notification toggle error:', err);
      setStatusMessage(err.message || 'Failed to update push notification setting.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);
    try {
      let endpoint = '';
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) endpoint = sub.endpoint;
      }

      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          libraryId,
          userEmail,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage('Test notification dispatched! Check your phone/desktop notification banner.');
        fetchNotifications();
      } else {
        setStatusMessage(data.message || 'Failed to send test notification.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Error triggering test notification.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRunExpirySweep = async () => {
    setIsRunningSweep(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/notifications/cron', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Sweep finished: ${data.alertsDispatched} expiry alert(s) dispatched to device.`);
        fetchNotifications();
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to trigger expiry check.');
    } finally {
      setIsRunningSweep(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true, libraryId, userEmail }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'EXPIRING') return n.type === 'STUDENT_EXPIRING';
    if (selectedFilter === 'BROADCAST') return n.type === 'ADMIN_BROADCAST';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 [color-scheme:light]">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Notification Center</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                PWA Service Worker Push Alerts & Student Expirations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Permission & Toggle Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border border-indigo-100 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                    isPushSubscribed && permission === 'granted'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPushSubscribed && permission === 'granted' ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Push Notifications on this Device
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isPushSubscribed && permission === 'granted'
                      ? 'Allowed — Service Worker active & receiving alerts'
                      : permission === 'denied'
                      ? 'Blocked in browser settings'
                      : 'Disabled — Turn ON to receive background alerts'}
                  </p>
                </div>
              </div>

              {/* Allow / Disallow Toggle Switch */}
              <button
                type="button"
                onClick={handleTogglePushNotifications}
                disabled={isToggling}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPushSubscribed && permission === 'granted' ? 'bg-indigo-600' : 'bg-slate-300'
                } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isPushSubscribed && permission === 'granted' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-indigo-50/80">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                <span>{isSendingTest ? 'Sending...' : 'Send Test Push'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunExpirySweep}
                disabled={isRunningSweep}
                title="Manually trigger 3-hour student expiry check"
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningSweep ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Check Expirations</span>
                <span className="sm:hidden">Check</span>
              </button>
            </div>

            {statusMessage && (
              <div className="text-[11px] font-medium text-indigo-900 bg-indigo-100/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* 3-Hour Automation Notice Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed text-amber-900">
              <span className="font-bold">Automated 3-Hour Sweeper Active:</span> The server scans all student memberships every 3 hours. When a student has ≤ 3 days left or is expired, a push alert is automatically sent to your device through the Service Worker.
            </div>
          </div>

          {/* Notification Inbox Header & Filter Tabs */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Notification Inbox
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                  selectedFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('EXPIRING')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                  selectedFilter === 'EXPIRING'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Expiring
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('BROADCAST')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                  selectedFilter === 'BROADCAST'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Broadcasts
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {isLoadingNotifications ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When student memberships are expiring or admin broadcasts occur, they will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isExpiring = notif.type === 'STUDENT_EXPIRING';
                const isBroadcast = notif.type === 'ADMIN_BROADCAST';

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      notif.isRead
                        ? 'bg-white border-slate-200 opacity-90'
                        : isExpiring
                        ? 'bg-amber-50/40 border-amber-200'
                        : isBroadcast
                        ? 'bg-indigo-50/40 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                          isExpiring
                            ? 'bg-amber-100 text-amber-700'
                            : isBroadcast
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isExpiring ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : isBroadcast ? (
                          <Megaphone className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {notif.title}
                          </h5>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {notif.body}
                        </p>

                        {/* Action if student is attached */}
                        {isExpiring && notif.data?.studentId && onSelectStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudent(notif.data.studentId);
                              onClose();
                            }}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 transition"
                          >
                            <span>View Student Profile & Collect Fee</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>PWA Service Worker Push Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
