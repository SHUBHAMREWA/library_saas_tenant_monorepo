'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  ArrowUpRight,
  Tag,
  ShieldCheck,
  CreditCard,
  Calendar,
  Receipt,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';

export interface SubscriptionPaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string; // 'SUCCESS' | 'FAILED' | 'PENDING'
  provider: string;
  paymentId: string;
  orderId?: string;
  createdAt: string;
  planCode: string;
  planName: string;
  durationMonths: number;
  previousEndDate?: string | null;
  newEndDate?: string | null;
  discountApplied?: number;
  failureReason?: string | null;
  statusDetail?: string | null;
}

export interface AvailablePlanItem {
  id: string;
  code: string;
  name: string;
  price: number;
  originalPrice: number;
  durationMonths: number;
  badge?: string;
  description?: string;
}

interface SubscriptionCardProps {
  libraryId: string;
  currentPlanName: string;
  status: string;
  validUntil: string;
  daysRemaining?: number;
  isSuperAdmin?: boolean;
  userEmail?: string;
  onSubscriptionUpdated?: () => void;
  openUpgradeModalImmediately?: boolean;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  libraryId,
  currentPlanName,
  status,
  validUntil,
  daysRemaining,
  isSuperAdmin,
  userEmail,
  onSubscriptionUpdated,
  openUpgradeModalImmediately = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(openUpgradeModalImmediately);
  const [selectedPlanCode, setSelectedPlanCode] = useState('BASIC');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState<number | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentsHistory, setPaymentsHistory] = useState<SubscriptionPaymentRecord[]>([]);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlanItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  const defaultPlans: AvailablePlanItem[] = [
    {
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic Plan',
      price: 799,
      originalPrice: 999,
      durationMonths: 1,
      badge: 'Starter (1 Month)',
      description: '1 month full access to all features',
    },
    {
      id: 'plan-advance',
      code: 'ADVANCE',
      name: 'Advance Plan',
      price: 1999,
      originalPrice: 2499,
      durationMonths: 3,
      badge: 'Popular (3 Months)',
      description: '3 months full access with fees & receipts',
    },
    {
      id: 'plan-pro',
      code: 'PRO',
      name: 'Pro Plan',
      price: 6999,
      originalPrice: 9999,
      durationMonths: 12,
      badge: 'Best Value (1 Year)',
      description: '1 full year access with priority support',
    },
  ];

  const fetchSubscriptionData = async () => {
    if (!libraryId) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/libraries/${libraryId}/subscription`);
      if (res.ok) {
        const data = await res.json();
        if (data.payments) {
          setPaymentsHistory(data.payments);
        }
        if (data.availablePlans && Array.isArray(data.availablePlans) && data.availablePlans.length > 0) {
          setAvailablePlans(data.availablePlans);
          if (!data.availablePlans.some((p: any) => p.code === selectedPlanCode)) {
            setSelectedPlanCode(data.availablePlans[0].code);
          }
        }
        if (data.hasActiveSubscription && status !== 'ACTIVE' && onSubscriptionUpdated) {
          onSubscriptionUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [libraryId]);

  useEffect(() => {
    if (openUpgradeModalImmediately) {
      setIsModalOpen(true);
    }
  }, [openUpgradeModalImmediately]);

  const currentPlanList = availablePlans.length > 0 ? availablePlans : defaultPlans;
  const activeSelectedPlan = currentPlanList.find((x) => x.code === selectedPlanCode) || currentPlanList[0];
  const baseTotal = activeSelectedPlan ? activeSelectedPlan.price : 799;
  const finalPrice = discount !== null ? Math.max(0, baseTotal - discount) : baseTotal;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    const clean = coupon.trim().toUpperCase();

    // Instant local shortcuts
    if (clean === 'LIBRARY20' || clean === 'WELCOME50' || clean === 'ADMIN100') {
      let disc = 0;
      if (clean === 'WELCOME50') disc = Math.round(baseTotal * 0.5);
      else if (clean === 'LIBRARY20') disc = Math.round(baseTotal * 0.2);
      else if (clean === 'ADMIN100') disc = baseTotal;

      setDiscount(disc);
      setCouponFeedback({
        type: 'success',
        message: `Coupon '${clean}' applied! You saved ₹${disc.toLocaleString('en-IN')}.`,
      });
      return;
    }

    // Server-side dynamic validation for any admin-created coupon
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, amount: baseTotal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscount(data.discountAmount);
        setCouponFeedback({
          type: 'success',
          message: `Coupon '${clean}' applied! You saved ₹${data.discountAmount.toLocaleString('en-IN')}.`,
        });
      } else {
        setDiscount(null);
        setCouponFeedback({
          type: 'error',
          message: data.error || `Coupon '${clean}' is invalid. Try WELCOME50 or LIBRARY20.`,
        });
      }
    } catch {
      setDiscount(null);
      setCouponFeedback({
        type: 'error',
        message: `Unable to validate coupon '${clean}'.`,
      });
    }
  };

  const handleProceedPayment = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create order on backend with Razorpay REST API
      const orderRes = await fetch(`/api/libraries/${libraryId}/subscription/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || '',
        },
        body: JSON.stringify({
          planCode: activeSelectedPlan.code,
          couponCode: discount !== null ? coupon.trim().toUpperCase() : undefined,
          userEmail,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        alert(orderData.error || 'Failed to initiate payment order');
        setIsSubmitting(false);
        return;
      }

      // If 100% discount free bypass (e.g. ADMIN100)
      if (orderData.bypassPayment || orderData.finalAmount <= 0) {
        const verifyRes = await fetch(`/api/libraries/${libraryId}/subscription/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail || '',
          },
          body: JSON.stringify({
            bypassPayment: true,
            planCode: activeSelectedPlan.code,
            couponCode: discount !== null ? coupon.trim().toUpperCase() : undefined,
            userEmail,
          }),
        });

        if (verifyRes.ok) {
          setIsModalOpen(false);
          setCoupon('');
          setDiscount(null);
          setCouponFeedback(null);
          await fetchSubscriptionData();
          if (onSubscriptionUpdated) {
            onSubscriptionUpdated();
          }
        } else {
          const err = await verifyRes.json();
          alert(err.error || 'Failed to activate subscription');
        }
        setIsSubmitting(false);
        return;
      }

      // 2. Dynamically load Razorpay Checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Could not load Razorpay gateway. Please check your internet connection and try again.');
        setIsSubmitting(false);
        return;
      }

      // 3. Open official Razorpay Checkout popup
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'Library Management SaaS',
        description: `${activeSelectedPlan.name} (${activeSelectedPlan.durationMonths} Months Plan)`,
        order_id: orderData.orderId,
        prefill: {
          email: userEmail || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            fetchSubscriptionData();
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Verify HMAC signature securely on server
            const verifyRes = await fetch(`/api/libraries/${libraryId}/subscription/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-email': userEmail || '',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planCode: activeSelectedPlan.code,
                couponCode: discount !== null ? coupon.trim().toUpperCase() : undefined,
                userEmail,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setIsModalOpen(false);
              setCoupon('');
              setDiscount(null);
              setCouponFeedback(null);
              await fetchSubscriptionData();
              if (onSubscriptionUpdated) {
                onSubscriptionUpdated();
              }
            } else {
              alert(verifyData.error || 'Razorpay payment verification failed');
              fetchSubscriptionData();
            }
          } catch (vErr: any) {
            alert(vErr.message || 'Error communicating with server after payment');
            fetchSubscriptionData();
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async function (resp: any) {
        try {
          await fetch(`/api/libraries/${libraryId}/subscription/record-failure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': userEmail || '',
            },
            body: JSON.stringify({
              razorpay_order_id: orderData.orderId,
              razorpay_payment_id: resp.error?.metadata?.payment_id || null,
              error_code: resp.error?.code || 'PAYMENT_FAILED',
              error_description: resp.error?.description || 'Transaction was declined or rejected',
              error_source: resp.error?.source,
              error_reason: resp.error?.reason,
              planCode: activeSelectedPlan.code,
              amount: orderData.finalAmount,
              userEmail,
            }),
          });
          fetchSubscriptionData();
        } catch (fErr) {
          console.error('Error reporting failure:', fErr);
        }
        alert(`Payment Rejected / Failed: ${resp.error?.description || 'Transaction was declined by bank'}`);
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Network error processing Razorpay subscription');
      setIsSubmitting(false);
    }
  };

  const isActive = status === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-indigo-900/50 space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Current SaaS Subscription
                </span>
                {isSuperAdmin && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    SUPER ADMIN PASS
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white leading-tight mt-0.5">
                {currentPlanName}
              </h3>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border self-start sm:self-auto ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isActive ? 'ACTIVE SUBSCRIPTION' : 'FREE TIER (NO SUB)'}
          </span>
        </div>

        {/* Validity & Stacking Info */}
        <div className="border-t border-indigo-900/60 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Valid Until:{' '}
              <strong className="text-white font-bold">{validUntil}</strong>
              {daysRemaining !== undefined && daysRemaining > 0 && (
                <span className="text-emerald-400 ml-1.5 font-semibold">
                  ({daysRemaining} day{daysRemaining > 1 ? 's' : ''} left)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Validity Stacking:{' '}
              <strong className="text-white">Active (Extends existing expiry)</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <span>{isActive ? 'Renew / Extend Subscription' : 'Upgrade to Active SaaS Plan'}</span>
          <ArrowUpRight className="w-4 h-4 text-indigo-600" />
        </button>
      </div>

      {/* Subscription Payment History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden [color-scheme:light]">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Subscription Payment History</h4>
              <p className="text-xs text-slate-500">Track all subscription purchases, extensions, initiated & rejected payments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setHistoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  historyFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({paymentsHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('SUCCESS')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  historyFilter === 'SUCCESS'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                Success ({paymentsHistory.filter((p) => p.status === 'SUCCESS').length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  historyFilter === 'PENDING'
                    ? 'bg-white text-amber-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                Initiated ({paymentsHistory.filter((p) => p.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('FAILED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  historyFilter === 'FAILED'
                    ? 'bg-white text-rose-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                Rejected ({paymentsHistory.filter((p) => p.status === 'FAILED').length})
              </button>
            </div>

            <button
              type="button"
              onClick={fetchSubscriptionData}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors"
              title="Refresh payment records"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading payment history...</div>
        ) : paymentsHistory.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No subscription payments yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              When you purchase or extend your plan, your transactions, validity extension records, and digital receipts will appear here.
            </p>
          </div>
        ) : paymentsHistory.filter((p) => historyFilter === 'ALL' || p.status === historyFilter).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No {historyFilter === 'PENDING' ? 'initiated' : historyFilter === 'FAILED' ? 'rejected / failed' : 'successful'} payments recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Validity</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment / Order Ref</th>
                  <th className="px-5 py-3 text-right">Status & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paymentsHistory
                  .filter((item) => historyFilter === 'ALL' || item.status === historyFilter)
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{item.planName}</span>
                        <span className="text-[10px] text-indigo-600 font-mono">{item.planCode}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg text-[11px]">
                            +{item.durationMonths} Month{item.durationMonths > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Not applied</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600 block">{item.paymentId}</span>
                        {item.orderId && (
                          <span className="text-[10px] text-slate-400 font-mono block">Order: {item.orderId}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        {item.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SUCCESS
                          </span>
                        ) : item.status === 'FAILED' ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              REJECTED / FAILED
                            </span>
                            {item.failureReason && (
                              <span
                                className="text-[10px] text-rose-600 max-w-[180px] truncate text-right font-medium"
                                title={item.failureReason}
                              >
                                {item.failureReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              INITIATED
                            </span>
                            <span className="text-[10px] text-amber-600 font-medium">Pending checkout</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200 [color-scheme:light] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Select SaaS Subscription Plan</h3>
                <p className="text-xs text-slate-500">All plans include 100% full platform features</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Plans List */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Duration Plan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentPlanList.map((p) => {
                  const isSelected = selectedPlanCode === p.code;
                  return (
                    <div
                      key={p.code}
                      onClick={() => {
                        setSelectedPlanCode(p.code);
                        setDiscount(null);
                        setCouponFeedback(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2.5 right-2 text-[9px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                          {p.badge}
                        </span>
                      )}

                      <div>
                        <div className="font-black text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] font-bold text-indigo-700 mt-0.5">
                          {p.durationMonths} {p.durationMonths === 1 ? 'Month' : p.durationMonths === 12 ? 'Year' : 'Months'}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          {p.description || 'Full features included'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline gap-1.5">
                        <span className="text-base font-black text-slate-900">₹{p.price}</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[11px] text-slate-400 line-through">₹{p.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Guarantee Callout */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All Features Included in Every Plan:</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                Unlimited Student Admissions • Room & Seat Allotment • Fee Collections & Digital Receipts • Complete Fee Ledger & Reports • WhatsApp & SMS Dues Alerts
              </p>
            </div>

            {/* Stacking Notice Banner */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Validity Extension Guarantee:</strong>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Paying for {activeSelectedPlan.name} will automatically add{' '}
                  <strong>+{activeSelectedPlan.durationMonths} month(s)</strong> onto your existing expiry date!
                </p>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Coupon Code (Optional)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50, LIBRARY20"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponFeedback && (
                <p className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${couponFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {couponFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {couponFeedback.message}
                </p>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Selected Plan</span>
                <span className="font-semibold text-slate-900">{activeSelectedPlan.name} ({activeSelectedPlan.durationMonths} Mo)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Plan Price</span>
                <span>₹{baseTotal}</span>
              </div>
              {discount !== null && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-2 text-sm">
                <span>Total Payable</span>
                <span className="text-base text-indigo-700">₹{finalPrice}</span>
              </div>
            </div>

            {/* Test Mode Helper Banner */}
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Test Mode Simulation Guide</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-snug">
                For test success, choose <strong>Netbanking</strong> (SBI / HDFC) or <strong>Cards</strong> (Indian RuPay: <code className="bg-amber-100 font-mono px-1 py-0.5 rounded text-amber-900 font-bold">6527 6589 0000 1005</code>, CVV: 123).
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleProceedPayment}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isSubmitting ? 'Opening Razorpay Gateway...' : `Pay ₹${finalPrice.toLocaleString('en-IN')} & Activate Plan`}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Secured by Razorpay • UPI, Cards & NetBanking</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
