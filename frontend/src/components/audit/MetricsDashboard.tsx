import React from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { EvaluationMetricsData } from '../../types';
import { ShieldCheck, Target, CheckCircle2, TrendingUp, Zap, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricsDashboardProps {
  metrics: EvaluationMetricsData | null;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <GlassCard key={i} className="p-4 animate-pulse h-28">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3" />
            <div className="h-7 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
          </GlassCard>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Match Accuracy',
      value: metrics.matchAccuracy,
      suffix: '%',
      subtitle: 'Normal payments matched',
      icon: Target,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgGlow: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200 dark:border-indigo-500/30'
    },
    {
      title: 'Anomaly Detection',
      value: metrics.exceptionDetectionAccuracy,
      suffix: '%',
      subtitle: '10 anomaly types detected',
      icon: Zap,
      color: 'text-violet-600 dark:text-violet-400',
      bgGlow: 'bg-violet-50 dark:bg-violet-950/40',
      borderColor: 'border-violet-200 dark:border-violet-500/30'
    },
    {
      title: 'Auto-Resolution Accuracy',
      value: metrics.autoResolutionAccuracy,
      suffix: '%',
      subtitle: 'Zero false auto-resolutions',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30'
    },
    {
      title: 'Financial Error Exposure',
      valueText: metrics.financialErrorExposure,
      subtitle: 'Monetary risk to merchant',
      icon: IndianRupee,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30'
    },
    {
      title: 'Autonomy Coverage',
      value: metrics.coverage,
      suffix: '%',
      subtitle: `${metrics.totalAutoResolved} / ${metrics.totalActualExceptions} automated`,
      icon: TrendingUp,
      color: 'text-sky-600 dark:text-sky-400',
      bgGlow: 'bg-sky-50 dark:bg-sky-950/40',
      borderColor: 'border-sky-200 dark:border-sky-500/30'
    },
    {
      title: 'Supervisor Escalation',
      value: metrics.escalationRate,
      suffix: '%',
      subtitle: `${metrics.totalEscalated} routed to controller`,
      icon: ShieldCheck,
      color: 'text-amber-600 dark:text-amber-400',
      bgGlow: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title || `metric-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <GlassCard
              className={`p-4 border ${card.borderColor} ${card.bgGlow} shadow-sm hover:scale-[1.02] transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.color} bg-white dark:bg-black/30`}>
                  <Icon size={15} />
                </div>
              </div>

              <div className="flex items-baseline gap-1 my-1">
                {card.valueText ? (
                  <span className={`text-xl font-bold tracking-tight ${card.color}`}>
                    {card.valueText}
                  </span>
                ) : (
                  <>
                    <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                      <AnimatedNumber value={card.value || 0} precision={1} />
                    </span>
                    <span className="text-xs font-bold text-slate-500">{card.suffix}</span>
                  </>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-1 truncate">
                {card.subtitle}
              </p>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
};
