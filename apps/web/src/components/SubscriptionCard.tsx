'use client';

import React, { useState } from 'react';
import { Crown, Check, ArrowUpRight, Tag, ShieldCheck, CreditCard } from 'lucide-react';

interface SubscriptionCardProps {
  currentPlanName: string;
  status: string;
  validUntil: string;
  onUpgrade?: (planId: string, couponCode?: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  currentPlanName,
  status,
  validUntil,
  onUpgrade,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState<number | null>(null);

  const plans = [
    { id: 'BASIC', name: 'Basic Growth', price: 999, seats: 50, popular: false },
    { id: 'PRO', name: 'Professional Hub', price: 1999, seats: 200, popular: true },
    { id: 'ENTERPRISE', name: 'Enterprise Multi-Branch', price: 4999, seats: 1000, popular: false },
  ];

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === 'LIBRARY20') {
      const p = plans.find((x) => x.id === selectedPlan);
      if (p) setDiscount(Math.round(p.price * 0.2));
    } else {
      alert('Invalid coupon code. Try LIBRARY20');
      setDiscount(null);
    }
  };

  const selectedPlanObj = plans.find((x) => x.id === selectedPlan)!;
  const finalPrice = discount ? selectedPlanObj.price - discount : selectedPlanObj.price;

  return (
    <div className="space-y-4">
      {/* Current Subscription Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Active SaaS Plan</span>
              <h3 className="text-lg font-bold text-white leading-tight">{currentPlanName}</h3>
            </div>
          </div>
          <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            {status}
          </span>
        </div>

        <div className="border-t border-indigo-800/50 pt-3 flex items-center justify-between text-xs text-indigo-200">
          <span>Valid Until: <strong>{validUntil}</strong></span>
          <span>Auto-Renew: <strong>Off</strong></span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          Change or Upgrade Plan <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Upgrade Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Select SaaS Plan</h3>
                <p className="text-xs text-slate-500">Pick a plan tailored to your library size</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Plan Cards */}
            <div className="space-y-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlan(p.id);
                    setDiscount(null);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedPlan === p.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                        {p.popular && (
                          <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">Up to {p.seats} seats</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900">₹{p.price}</span>
                      <span className="text-[10px] text-slate-400 block">/month</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Coupon code (e.g. LIBRARY20)"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Apply
              </button>
            </div>

            {/* Price Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Base Price</span>
                <span>₹{selectedPlanObj.price}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                <span>Total Due</span>
                <span>₹{finalPrice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onUpgrade?.(selectedPlan, coupon || undefined);
                alert(`Proceeding to checkout with Razorpay/Cashfree for ₹${finalPrice}`);
                setIsModalOpen(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CreditCard className="w-4 h-4" /> Pay ₹{finalPrice} via Gateway
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
