'use client';

import React from 'react';

/**
 * Base atomic Skeleton block with pulse shimmer.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200/80 dark:bg-[#1c1c1e] animate-pulse rounded-lg transition-colors ${className}`}
    />
  );
}

/**
 * Occupancy Donut / Trend Chart Skeleton
 */
export function DashboardChartSkeleton() {
  return (
    <section className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-4 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 sm:w-56" />
          <Skeleton className="h-3 w-32 sm:w-40" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
        {/* Circle Ring Shimmer */}
        <div className="w-36 h-36 rounded-full border-8 border-slate-200 dark:border-[#1c1c1e] flex items-center justify-center animate-pulse">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-[#161616] flex flex-col items-center justify-center gap-1">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="space-y-3 w-full max-w-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-8" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-8" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-8" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Seat Grid & Hall Inventory Skeleton
 */
export function SeatGridSkeleton() {
  return (
    <section className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 shadow-xs space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#262626] pb-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Room Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-7 w-24 rounded-xl shrink-0" />
        <Skeleton className="h-7 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-7 w-32 rounded-xl shrink-0" />
      </div>

      {/* Row Containers with Seat Boxes */}
      <div className="space-y-4 pt-2">
        {[1, 2].map((rowIdx) => (
          <div
            key={rowIdx}
            className="p-4 rounded-xl border border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {Array.from({ length: 8 }).map((_, seatIdx) => (
                <Skeleton
                  key={seatIdx}
                  className="aspect-square rounded-xl bg-slate-200 dark:bg-[#1c1c1e]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Student List Directory Skeleton
 */
export function StudentListSkeleton() {
  return (
    <section className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121212] p-3 rounded-xl border border-slate-200 dark:border-[#262626]">
        <Skeleton className="h-10 w-full sm:max-w-xs rounded-xl" />
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Skeleton className="h-8 w-16 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Student Cards List */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-32 sm:w-44" />
                <Skeleton className="h-3 w-24 sm:w-36" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Fee Transactions & Ledger Skeleton
 */
export function TransactionsSkeleton() {
  return (
    <section className="space-y-4">
      {/* Metric summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-slate-200 dark:border-[#262626] space-y-2"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* Ledger list */}
      <div className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616] flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Lead Kanban Board Skeleton
 */
export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((colIdx) => (
        <div
          key={colIdx}
          className="bg-slate-50 dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-3 space-y-3 min-h-[350px]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#262626]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {[1, 2].map((cardIdx) => (
            <div
              key={cardIdx}
              className="bg-white dark:bg-[#1c1c1e] p-3 rounded-xl border border-slate-200 dark:border-[#262626] space-y-2"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
              <div className="pt-2 flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Subscription Card Skeleton
 */
export function SubscriptionSkeleton() {
  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#262626]">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616] space-y-2"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Super Admin Console Skeleton
 */
export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 bg-slate-800" />
          <Skeleton className="h-3.5 w-72 bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-lg bg-slate-800" />
          <Skeleton className="h-9 w-36 rounded-lg bg-slate-800" />
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
          >
            <Skeleton className="h-3 w-16 bg-slate-800" />
            <Skeleton className="h-6 w-14 bg-slate-800" />
            <Skeleton className="h-2.5 w-20 bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Data Table Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <Skeleton className="h-5 w-36 bg-slate-800" />
          <Skeleton className="h-8 w-44 rounded-lg bg-slate-800" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44 bg-slate-800" />
              <Skeleton className="h-3 w-32 bg-slate-800" />
            </div>
            <Skeleton className="h-7 w-24 rounded-lg bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Dashboard Skeleton (Mobile & Desktop Responsive)
 * Used as root loading state during network sync and hydration.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-8 bg-slate-50 dark:bg-black md:pl-64 transition-colors select-none">
      {/* Desktop Sidebar Skeleton (md: and up) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-black border-r border-slate-200 dark:border-[#262626] p-4 justify-between z-30 transition-colors">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>

          {/* Library Branch Selector */}
          <div className="p-2.5 rounded-xl border border-slate-100 dark:border-[#262626] bg-slate-50/70 dark:bg-[#121212]">
            <Skeleton className="h-3 w-20 mb-1.5" />
            <Skeleton className="h-4 w-36" />
          </div>

          {/* Nav Items */}
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <Skeleton className="w-5 h-5 rounded-md shrink-0" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom User Area */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#262626] space-y-3">
          <Skeleton className="h-8 w-full rounded-xl" />
          <div className="flex items-center gap-3 px-2">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header Skeleton (Mobile only) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-[#262626] px-4 py-3 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </header>

      {/* Desktop Top Bar Skeleton (Desktop only) */}
      <header className="hidden md:flex sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-[#262626] px-6 py-3 items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-4 w-24" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-4">
        {/* Visual Chart Skeleton */}
        <DashboardChartSkeleton />

        {/* 2 Quick Glance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-slate-200 dark:border-[#262626] space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="bg-white dark:bg-[#121212] p-4 rounded-xl border border-slate-200 dark:border-[#262626] space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Quick Actions Bar Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>

        {/* Study Rooms Section Skeleton */}
        <div className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#262626]">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2.5 w-48" />
            </div>
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#161616] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-[#262626] space-y-2">
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar Skeleton */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-[#262626] px-2 py-2 flex justify-around items-center transition-colors">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="w-8 h-2 rounded" />
          </div>
        ))}
      </nav>
    </div>
  );
}
