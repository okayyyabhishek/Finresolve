import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { CoverageRiskSweepData } from '../../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { TrendingUp, Sparkles, Sliders } from 'lucide-react';

interface CoverageRiskChartProps {
  data: CoverageRiskSweepData | null;
}

export const CoverageRiskChart: React.FC<CoverageRiskChartProps> = ({ data }) => {
  const [interactiveTau, setInteractiveTau] = useState<number>(0.85);

  const points = data?.points || [];

  if (!data || points.length === 0) {
    return (
      <GlassCard className="p-8 text-center text-xs text-slate-400 font-medium">
        No coverage-risk sweep data available for this batch. Run batch pipeline to evaluate.
      </GlassCard>
    );
  }

  // Find simulated point based on slider
  const closestPoint = points.reduce((prev, curr) =>
    Math.abs(curr.threshold - interactiveTau) < Math.abs(prev.threshold - interactiveTau) ? curr : prev
  );

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3.5 rounded-xl bg-slate-900/95 text-white border border-indigo-500/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[220px]">
          <div className="font-bold text-indigo-300 border-b border-slate-800 pb-1 flex justify-between">
            <span>Confidence Threshold (τ):</span>
            <span>{label}</span>
          </div>
          <div className="text-emerald-400 flex justify-between">
            <span>Automation Coverage:</span>
            <span className="font-bold">{payload[0]?.value}%</span>
          </div>
          <div className="text-indigo-400 flex justify-between">
            <span>Decision Accuracy:</span>
            <span className="font-bold">{payload[1]?.value}%</span>
          </div>
          <div className="text-rose-400 flex justify-between">
            <span>Financial Risk:</span>
            <span className="font-bold">{payload[2]?.payload?.financialExposureFormatted || `₹${payload[2]?.value}`}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25 space-y-6">
      {/* Header with Title and Optimal Operating Point */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-indigo-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Coverage-Risk Trade-Off Curve (21-Point Empirical Sweep)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ground-Truth isolated benchmark: Autonomy Coverage % vs. Accuracy % vs. ₹ Financial Risk Exposure
          </p>
        </div>

        {/* Optimal Trade-off Pill */}
        {data.optimalMetrics && (
          <div className="flex items-center gap-2.5 p-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-400/40 text-xs">
            <Sparkles size={16} className="text-emerald-500 animate-pulse flex-shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Optimal Operating Point: τ = {(data.optimalThreshold ?? 0.85).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {(data.optimalMetrics.coverage ?? 0).toFixed(1)}% Coverage • {(data.optimalMetrics.accuracy ?? 100).toFixed(1)}% Accuracy • ₹0.00 Risk
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />

            <XAxis
              dataKey="threshold"
              label={{ value: 'Confidence Threshold (τ)', position: 'insideBottomRight', offset: -5, fill: '#8884d8', fontSize: 11 }}
              tick={{ fontSize: 10, fill: '#8884d8' }}
              domain={[0, 1]}
            />

            {/* Left Y Axis: Percentage (Coverage & Accuracy) */}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#8884d8' }}
              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#8884d8', fontSize: 11 }}
            />

            {/* Right Y Axis: Monetary Risk Exposure (₹) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#f43f5e' }}
              label={{ value: 'Financial Risk (₹)', angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 11 }}
            />

            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif' }} />

            {/* Production Policy Gate Reference Line */}
            <ReferenceLine
              yAxisId="left"
              x={0.85}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: 'PROD GATE (τ=0.85)', position: 'top', fill: '#6366f1', fontSize: 10 }}
            />

            {/* Interactive Threshold Reference Line */}
            <ReferenceLine
              yAxisId="left"
              x={interactiveTau}
              stroke="#f59e0b"
              strokeDasharray="2 2"
              strokeWidth={2}
              label={{ value: `SIM: τ=${interactiveTau.toFixed(2)}`, position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10 }}
            />

            {/* Area & Lines */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="coverage"
              name="Automation Coverage (%)"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#coverageGradient)"
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accuracy"
              name="Decision Accuracy (%)"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#6366f1' }}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="financialExposure"
              name="Financial Risk Exposure (₹)"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={{ r: 2, fill: '#f43f5e' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Confidence Threshold Simulation Slider */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-indigo-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Sliders size={16} className="text-amber-500" />
            <span>Interactive Policy Threshold Simulator:</span>
            <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">τ = {interactiveTau.toFixed(2)}</span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Drag to simulate risk/coverage tradeoffs
          </div>
        </div>

        <input
          id="tau-policy-threshold-slider"
          name="tauPolicyThresholdSlider"
          aria-label="Interactive policy threshold tau slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={interactiveTau}
          onChange={(e) => setInteractiveTau(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />

        {/* Live Simulation Output Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0e0e18] border border-slate-200 dark:border-slate-800 text-xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Simulated Automation:</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {(closestPoint?.coverage ?? 0).toFixed(1)}% Coverage
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{closestPoint?.autoResolvedCount ?? 0} settlements automated</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0e0e18] border border-slate-200 dark:border-slate-800 text-xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Simulated Accuracy:</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {(closestPoint?.accuracy ?? 100).toFixed(1)}% Precision
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{closestPoint?.escalatedCount ?? 0} routed to supervisor</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0e0e18] border border-slate-200 dark:border-slate-800 text-xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Financial Risk Exposure:</div>
            <div className={`text-lg font-bold mt-0.5 ${(closestPoint?.financialExposure ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {closestPoint?.financialExposureFormatted || `₹${(closestPoint?.financialExposure ?? 0).toFixed(2)}`}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {(closestPoint?.financialExposure ?? 0) === 0 ? 'Zero false resolution risk' : 'Potential misallocation'}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
