import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { EvidenceItem } from '../../types';
import { GitCommit, Copy, Check, ChevronDown, ChevronUp, Database, FileSpreadsheet, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

interface EvidenceChainProps {
  evidence: EvidenceItem[];
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ evidence }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('bank') || s.includes('settlement')) return FileSpreadsheet;
    if (s.includes('payment') || s.includes('database')) return Database;
    if (s.includes('agent') || s.includes('gemini')) return Cpu;
    return ShieldAlert;
  };

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <GitCommit size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Audit-Grade Evidence Chain
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable causal verification sequence gathered by autonomous tools
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
          {evidence.length} Verified Evidence Nodes
        </span>
      </div>

      {evidence.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          No secondary evidence items required for this case.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-violet-500 before:to-emerald-500">
          {evidence.map((item, idx) => {
            const Icon = getSourceIcon(item.source);
            const isExpanded = !!expandedItems[item.id];
            const isCopied = copiedId === item.id;

            return (
              <motion.div
                key={`${item.id || 'ev'}-${item.source || 'src'}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative"
              >
                {/* Timeline Glowing Node Dot */}
                <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-[#0a0a0f] border-2 border-indigo-500 flex items-center justify-center shadow-glow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                </div>

                {/* Evidence Item Box */}
                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-indigo-950/20 border border-slate-200 dark:border-indigo-500/25 hover:border-indigo-400 transition-all space-y-2 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {item.id}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Icon size={13} className="text-indigo-500" />
                        <span>{item.source}</span>
                      </span>

                      <button
                        onClick={() => handleCopy(item.id, item.data)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200 dark:hover:bg-indigo-900/40 transition-colors"
                        title="Copy JSON Payload"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {item.description}
                  </p>

                  {/* Raw Data Payload Inspector */}
                  {item.data && Object.keys(item.data).length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span>{isExpanded ? 'Hide Raw Document JSON' : 'Inspect Raw Document JSON'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {isExpanded && (
                        <motion.pre
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800"
                        >
                          {JSON.stringify(item.data, null, 2)}
                        </motion.pre>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
