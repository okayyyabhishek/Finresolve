import React from 'react';
import { GlassCard } from '../shared/GlassCard';
import { EvaluationMetricsData } from '../../types';
import { IndianRupee, Layers, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface FinancialSummaryProps {
  metrics: EvaluationMetricsData | null;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <GlassCard key={i} className="p-4 animate-pulse h-24">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-2" />
            <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
          </GlassCard>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Processed Transactions',
      value: `${metrics?.totalRecords ?? 0} Records`,
      subtitle: `${metrics?.totalActualMatched ?? 0} normal • ${metrics?.totalActualExceptions ?? 0} exceptions`,
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      title: 'Autonomous Resolutions',
      value: `${metrics?.totalAutoResolved ?? 0} Resolved`,
      subtitle: `${((metrics?.autoResolutionAccuracy ?? 100)).toFixed(1)}% decision accuracy`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Financial Error Exposure',
      value: metrics?.financialErrorExposure || '₹0.00',
      subtitle: (metrics?.falseAutoResolutionRate ?? 0) === 0 ? 'Zero false resolution exposure' : 'Potential risk exposure',
      icon: IndianRupee,
      color: (metrics?.financialErrorExposureRaw ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Supervisor Escalations',
      value: `${metrics?.totalEscalated ?? 0} Routed`,
      subtitle: `${((metrics?.escalationRate ?? 0)).toFixed(1)}% escalation to controller`,
      icon: ShieldCheck,
      color: 'text-amber-600 dark:text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <GlassCard key={c.title || `fin-card-${idx}`} className="p-4 border border-slate-200 dark:border-indigo-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-black/30 ${c.color}`}>
                <Icon size={16} />
              </div>
            </div>

            <div className={`text-xl font-bold tracking-tight my-1 ${c.color}`}>
              {c.value}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
              {c.subtitle}
            </p>
          </GlassCard>
        );
      })}
    </div>
  );
};
