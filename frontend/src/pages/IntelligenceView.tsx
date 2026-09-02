import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EvaluationMetricsData } from '../types';
import { BrainCircuit, Activity, BarChart3, TrendingUp, Zap, Target, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const IntelligenceView: React.FC = () => {
  const [metrics, setMetrics] = useState<EvaluationMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const metricsData = await api.getEvaluationMetrics();
        setMetrics(metricsData);
      } catch (err) {
        console.error('Failed to load intelligence data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Policy Accuracy',
      value: `${metrics?.autoResolutionAccuracy ?? 0}%`,
      icon: Target,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'False Auto-Resolution',
      value: `${metrics?.falseAutoResolutionRate ?? 0}%`,
      icon: AlertTriangle, // Wait, I didn't import AlertTriangle here
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    },
    {
      label: 'Avg Confidence',
      value: `${metrics?.exceptionDetectionAccuracy ?? 0}%`,
      icon: BrainCircuit,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      label: 'Resolution Speed',
      value: '< 50ms', // Mocked performance stat
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BrainCircuit className="text-indigo-500" />
          AI Intelligence & Metrics
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Performance metrics for the automated policy and evaluation engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon || Activity;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={kpi.label}
              className="glass-panel rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={64} className={kpi.color} />
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${kpi.bg} ${kpi.color}`}>
                <Icon size={20} />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {kpi.value}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {kpi.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart Placeholder */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Resolution Trends</h3>
            <BarChart3 className="text-slate-400" />
          </div>
          <div className="h-64 flex items-end justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
            {/* Mock bars */}
            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
              <div key={i} className="w-full bg-slate-100 dark:bg-white/5 rounded-t-sm relative group cursor-pointer h-full flex items-end">
                <div 
                  className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400" 
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-xs text-slate-500">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Engine Diagnostics */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Engine Diagnostics</h3>
            <Activity className="text-slate-400" />
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Policy Gate Accuracy</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{metrics?.autoResolutionAccuracy ?? 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${metrics?.autoResolutionAccuracy ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Measures how often the automated policy engine correctly flags exceptions against ground truth.</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Detection Accuracy</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{metrics?.exceptionDetectionAccuracy ?? 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full" 
                  style={{ width: `${metrics?.exceptionDetectionAccuracy ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Overall accuracy of detecting actual exceptions in the batch.</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Escalation Rate</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {metrics?.totalActualExceptions ? Math.round((metrics.totalEscalated / metrics.totalActualExceptions) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${metrics?.totalActualExceptions ? Math.round((metrics.totalEscalated / metrics.totalActualExceptions) * 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Percentage of exceptions requiring manual review.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
