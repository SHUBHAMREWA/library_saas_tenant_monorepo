'use client';

import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Filter,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  Trash2,
  Users,
} from 'lucide-react';

export type KanbanStage = 'INQUIRY' | 'AWAITING_KYC' | 'FEE_DUE' | 'ACTIVE' | 'ALUMNI';

export interface KanbanLead {
  id: string;
  fullName: string;
  phone: string;
  studyPurpose: string;
  stage: KanbanStage;
  shift: string;
  amountDue?: number;
  lastContact: string;
  kycUploaded?: boolean;
}

const STAGE_CONFIG: Record<
  KanbanStage,
  { label: string; badgeColor: string; headerBg: string; icon: any }
> = {
  INQUIRY: {
    label: 'Inquiries',
    badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    headerBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200',
    icon: Sparkles,
  },
  AWAITING_KYC: {
    label: 'Awaiting KYC',
    badgeColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    headerBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200',
    icon: FileCheck,
  },
  FEE_DUE: {
    label: 'Fee Due',
    badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    headerBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200',
    icon: AlertCircle,
  },
  ACTIVE: {
    label: 'Active Students',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  ALUMNI: {
    label: 'Alumni / Archived',
    badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    headerBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200',
    icon: Clock,
  },
};

const STAGE_ORDER: KanbanStage[] = ['INQUIRY', 'AWAITING_KYC', 'FEE_DUE', 'ACTIVE', 'ALUMNI'];

interface KanbanBoardProps {
  libraryId?: string;
}

export function KanbanBoard({ libraryId }: KanbanBoardProps) {
  const [leads, setLeads] = useState<KanbanLead[]>([]);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [activeStageTab, setActiveStageTab] = useState<KanbanStage>('INQUIRY');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadGoal, setLeadGoal] = useState('');
  const [leadShift, setLeadShift] = useState('Morning');
  const [leadStage, setLeadStage] = useState<KanbanStage>('INQUIRY');

  const storageKey = `seelibrary_leads_${libraryId || 'default'}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setLeads(JSON.parse(saved));
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    }
  }, [storageKey]);

  const updateLeads = (newLeads: KanbanLead[]) => {
    setLeads(newLeads);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLeads));
    } catch {}
  };

  const moveStage = (leadId: string, direction: 'forward' | 'backward') => {
    const updated = leads.map((lead) => {
      if (lead.id !== leadId) return lead;
      const currentIndex = STAGE_ORDER.indexOf(lead.stage);
      const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0 || newIndex >= STAGE_ORDER.length) return lead;
      return {
        ...lead,
        stage: STAGE_ORDER[newIndex],
        lastContact: 'Just now',
      };
    });
    updateLeads(updated);
  };

  const handleDeleteLead = (leadId: string) => {
    const updated = leads.filter((l) => l.id !== leadId);
    updateLeads(updated);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) return;

    const newLead: KanbanLead = {
      id: `lead-${Date.now()}`,
      fullName: leadName.trim(),
      phone: leadPhone.trim(),
      studyPurpose: leadGoal.trim() || 'General Study',
      stage: leadStage,
      shift: leadShift,
      lastContact: 'Just now',
      kycUploaded: false,
    };

    updateLeads([newLead, ...leads]);
    setLeadName('');
    setLeadPhone('');
    setLeadGoal('');
    setLeadShift('Morning');
    setLeadStage('INQUIRY');
    setIsAddModalOpen(false);
  };

  const filteredLeads = leads.filter((lead) => {
    if (selectedShiftFilter !== 'ALL' && lead.shift !== selectedShiftFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 text-slate-900 dark:text-white transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121212] p-3.5 rounded-xl border border-slate-200 dark:border-[#262626] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 dark:text-[#737373]" />
          <span className="text-xs font-semibold text-slate-600 dark:text-[#a8a8a8] uppercase tracking-wider">
            Shift Filter:
          </span>
          <div className="flex gap-1">
            {['ALL', 'Morning', 'Evening', 'Full Day'].map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => setSelectedShiftFilter(shift)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedShiftFilter === shift
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-[#1e1e1e] text-slate-600 dark:text-[#a8a8a8] hover:bg-slate-200 dark:hover:bg-[#262626] dark:hover:text-white'
                }`}
              >
                {shift}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs text-slate-500 dark:text-[#a8a8a8] font-medium">
            Total in pipeline: <strong className="text-slate-900 dark:text-white font-bold">{filteredLeads.length}</strong>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      <div className="flex sm:hidden overflow-x-auto no-scrollbar gap-1.5 pb-1">
        {STAGE_ORDER.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const count = filteredLeads.filter((l) => l.stage === stage).length;
          const isSelected = activeStageTab === stage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStageTab(stage)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] text-slate-600 dark:text-[#a8a8a8]'
              }`}
            >
              <span>{config.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-[#202022] text-slate-700 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGE_ORDER.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const stageLeads = filteredLeads.filter((l) => l.stage === stage);
          const IconComponent = config.icon;
          const isMobileVisible = activeStageTab === stage;

          return (
            <div
              key={stage}
              className={`flex flex-col bg-slate-100/80 dark:bg-[#141414] rounded-2xl p-2.5 border border-slate-200/80 dark:border-[#262626] min-h-[320px] ${
                isMobileVisible ? 'flex' : 'hidden sm:flex'
              }`}
            >
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-2.5 ${config.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  <h4 className="text-xs font-bold">{config.label}</h4>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/60 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 flex-1">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-10 px-2 border-2 border-dashed border-slate-200 dark:border-[#262626] rounded-xl flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-400 dark:text-[#737373] font-medium">No records in this stage</p>
                    {stage === 'INQUIRY' && (
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Inquiry
                      </button>
                    )}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const currentIndex = STAGE_ORDER.indexOf(lead.stage);
                    const canMoveBack = currentIndex > 0;
                    const canMoveForward = currentIndex < STAGE_ORDER.length - 1;

                    return (
                      <div
                        key={lead.id}
                        className="bg-white dark:bg-[#1c1c1e] rounded-xl p-3 shadow-sm border border-slate-200 dark:border-[#262626] hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {lead.fullName}
                          </h5>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {lead.shift}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-slate-300 dark:text-[#737373] hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-[#a8a8a8] mb-2">{lead.studyPurpose}</p>

                        {lead.amountDue && lead.amountDue > 0 && (
                          <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
                            <span>₹{lead.amountDue} Due</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${lead.phone}`}
                              className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#363636] flex items-center justify-center text-slate-600 dark:text-[#f5f5f5] hover:bg-slate-100 dark:hover:bg-[#262626] active:scale-95 transition-transform"
                              title="Call Lead"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/91${lead.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-95 transition-transform"
                              title="WhatsApp Message"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <div className="flex items-center gap-1">
                            {canMoveBack && (
                              <button
                                type="button"
                                onClick={() => moveStage(lead.id, 'backward')}
                                className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#363636] flex items-center justify-center text-slate-600 dark:text-[#f5f5f5] hover:bg-slate-100 dark:hover:bg-[#262626] active:scale-95 cursor-pointer"
                                title="Move Back"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canMoveForward && (
                              <button
                                type="button"
                                onClick={() => moveStage(lead.id, 'forward')}
                                className="h-8 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition-all cursor-pointer"
                                title="Advance Stage"
                              >
                                <span>Next</span>
                                <ArrowRight className="w-3.5 h-3.5" />
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
          );
        })}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-5 text-white relative">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-6 h-6" />
                <h3 className="text-xl font-bold">Add Admission Lead / Inquiry</h3>
              </div>
              <p className="text-xs text-indigo-100">
                Track candidate inquiries across the admission funnel
              </p>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Exam / Study Purpose
                </label>
                <input
                  type="text"
                  value={leadGoal}
                  onChange={(e) => setLeadGoal(e.target.value)}
                  placeholder="e.g. UPSC Prelims, CA, NEET, SSC"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                  <select
                    value={leadShift}
                    onChange={(e) => setLeadShift(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stage</label>
                  <select
                    value={leadStage}
                    onChange={(e) => setLeadStage(e.target.value as KanbanStage)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="INQUIRY">Inquiry</option>
                    <option value="AWAITING_KYC">Awaiting KYC</option>
                    <option value="FEE_DUE">Fee Due</option>
                    <option value="ACTIVE">Active Student</option>
                    <option value="ALUMNI">Alumni</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
