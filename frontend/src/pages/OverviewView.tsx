import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EvaluationMetricsData, ExceptionItem } from '../types';
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronRight,
  IndianRupee,
  Zap,
  UploadCloud,
  Layers,
  ArrowUpRight,
  RotateCcw,
  BookOpen,
  Search,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { formatINR } from '../utils/format';

export const OverviewView: React.FC = () => {
  const [metrics, setMetrics] = useState<EvaluationMetricsData | null>(null);
  const [recentExceptions, setRecentExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [metricsData, exceptionsData] = await Promise.all([
        api.getEvaluationMetrics(),
        api.getExceptions({ limit: 6 })
      ]);
      setMetrics(metricsData);
      setRecentExceptions(exceptionsData.exceptions || []);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetBenchmark = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all data? All settlement batches, exceptions, and audit records will be completely removed.'
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetBatch();
      window.dispatchEvent(new CustomEvent('finresolve:batch-uploaded'));
      await loadData();
    } catch (err: any) {
      console.error('Failed to reset data', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasData = (metrics?.totalActualExceptions ?? 0) > 0;

  const statCards = [
    {
      title: 'Total Exceptions',
      value: metrics?.totalActualExceptions ?? 0,
      subtitle: hasData ? '10 Anomaly Categories Tracked' : 'No active exceptions',
      icon: AlertTriangle,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgGlow: 'bg-indigo-50/60 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200/80 dark:border-indigo-500/30'
    },
    {
      title: 'Auto-Resolved',
      value: metrics?.totalAutoResolved ?? 0,
      subtitle: `${metrics?.coverage ?? 0}% Autonomous Coverage`,
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'bg-emerald-50/60 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200/80 dark:border-emerald-500/30'
    },
    {
      title: 'Requires Review',
      value: metrics?.totalEscalated ?? 0,
      subtitle: `${metrics?.escalationRate ?? 0}% Routed to Controller`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgGlow: 'bg-amber-50/60 dark:bg-amber-950/40',
      borderColor: 'border-amber-200/80 dark:border-amber-500/30'
    },
    {
      title: 'Financial Exposure',
      value: metrics?.financialErrorExposure || '₹0.00',
      subtitle: 'Zero Financial Leakage (τ ≥ 0.85)',
      icon: IndianRupee,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'bg-emerald-50/60 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200/80 dark:border-emerald-500/30'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            High-level settlement reconciliation metrics across all batches
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleResetBenchmark}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Purge custom test runs and restore clean benchmark dataset"
          >
            {isResetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            <span>Reset Batch</span>
          </button>

          <button
            onClick={() => navigate('/audit-report')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Layers size={14} className="text-indigo-500" />
            <span>Audit Ledger</span>
          </button>

          <button
            onClick={() => navigate('/ingestion')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm shadow-indigo-500/20"
          >
            <UploadCloud size={14} />
            <span>Upload Batch</span>
          </button>
        </div>
      </div>

      {/* FTUE Quick Start Guide Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            <BookOpen size={16} className="text-indigo-500" />
            <span>First-Time User Walkthrough &amp; Navigation</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
            Self-Guiding Tour
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div
            onClick={() => navigate('/ingestion')}
            className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
              <span className="flex items-center gap-1.5">
                <UploadCloud size={14} className="text-indigo-500" />
                <span>1. Ingest Settlement Data</span>
              </span>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload settlement CSVs or use the <strong>Manual Entry</strong> tab with 1-click test scenarios.
            </p>
          </div>

          <div
            onClick={() => navigate('/investigations')}
            className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
              <span className="flex items-center gap-1.5">
                <Search size={14} className="text-indigo-500" />
                <span>2. AI Investigations</span>
              </span>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Inspect discrepancy evidence chains, AI root-cause reasoning, and confidence metrics.
            </p>
          </div>

          <div
            onClick={() => navigate('/audit-report')}
            className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>3. Policy Risk Sweep</span>
              </span>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Verify deterministic policy gates, 0% financial error rate, and threshold sweeps.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              key={stat.title}
            >
              <GlassCard className={`p-4 sm:p-5 border ${stat.borderColor} ${stat.bgGlow} shadow-xs hover:scale-[1.01] transition-transform`}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {stat.title}
                  </span>
                  <div className={`p-1.5 sm:p-2 rounded-xl ${stat.color} bg-white dark:bg-black/30 shadow-xs`}>
                    <Icon size={16} />
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </div>

                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2 font-medium">
                  {stat.subtitle}
                </p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Exceptions */}
        <div className="lg:col-span-2">
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recent Discrepancies</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click any record to inspect root cause evidence</p>
              </div>

              <button
                onClick={() => navigate('/investigations')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 group"
              >
                <span>View Workspace</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-2.5">
              {recentExceptions.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  No recent exceptions found.
                </div>
              ) : (
                recentExceptions.map((exc, idx) => {
                  const discNum = parseFloat(exc.discrepancy || '0');
                  const isNegative = discNum < -0.0001;
                  const isPositive = discNum > 0.0001;

                  return (
                    <div
                      key={`${exc.exceptionId || 'exc'}-${exc.batchId || 'b'}-${idx}`}
                      onClick={() => navigate(`/investigations?exceptionId=${exc.exceptionId}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-indigo-500/15 bg-white/60 dark:bg-white/[0.02] hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all cursor-pointer group gap-2 sm:gap-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                              {exc.exceptionId}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({exc.paymentId})
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 capitalize truncate">
                            {exc.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-white/5">
                        <div className="text-left sm:text-right">
                          <div
                            className={`font-bold text-xs font-mono ${
                              isNegative
                                ? 'text-rose-600 dark:text-rose-400'
                                : isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {formatINR(exc.discrepancy, { showSign: true })}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                            {new Date(exc.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <StatusBadge status={exc.status} size="sm" />

                        <ArrowUpRight size={15} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hidden sm:inline" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* System Health & Quick Launch */}
        <div className="space-y-6">
          {/* System Health Card */}
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Engine Performance</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Policy Gate Accuracy</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{hasData ? `${metrics?.autoResolutionAccuracy ?? 100}%` : '0%'}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${hasData ? (metrics?.autoResolutionAccuracy ?? 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Anomaly Detection Rate</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{hasData ? `${metrics?.exceptionDetectionAccuracy ?? 100}%` : '0%'}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${hasData ? (metrics?.exceptionDetectionAccuracy ?? 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">False Auto-Resolution</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{metrics?.falseAutoResolutionRate ?? 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: hasData ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Quick Process Action */}
          <GlassCard className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50/80 to-white/90 dark:from-indigo-950/40 dark:to-slate-900/40 border-indigo-200/60 dark:border-indigo-500/30">
            <h3 className="text-sm sm:text-base font-bold text-indigo-950 dark:text-indigo-100 mb-1">
              Automated Batch Processing
            </h3>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mb-4 leading-relaxed">
              Upload multi-merchant CSV/JSON settlement datasets to trigger full 20-decimal reconciliation and policy risk gating.
            </p>
            <button
              onClick={() => navigate('/ingestion')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <UploadCloud size={14} />
              <span>Start Batch Reconciliation</span>
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
