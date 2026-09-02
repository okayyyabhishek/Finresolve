import React from 'react';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = ''
}) => {
  const normalized = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let dotColor = 'bg-slate-500 dark:bg-slate-400';
  let label = status.replace(/_/g, ' ');
  let pulse = false;

  switch (normalized) {
    case 'detected':
      styles = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-600/50';
      dotColor = 'bg-slate-500 dark:bg-slate-400';
      label = 'Detected';
      break;

    case 'investigating':
      styles = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-500/40 shadow-glow-sm';
      dotColor = 'bg-blue-600 dark:bg-blue-400';
      label = 'Investigating';
      pulse = true;
      break;

    case 'auto_resolved':
      styles = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40 shadow-glow-success';
      dotColor = 'bg-emerald-600 dark:bg-emerald-400';
      label = 'Auto Resolved';
      break;

    case 'escalated':
      styles = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/40';
      dotColor = 'bg-amber-600 dark:bg-amber-400';
      label = 'Escalated';
      break;

    case 'human_approved':
      styles = 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-500/40 shadow-glow-success';
      dotColor = 'bg-teal-600 dark:bg-teal-400';
      label = 'Human Approved';
      break;

    case 'human_rejected':
      styles = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40 shadow-glow-danger';
      dotColor = 'bg-rose-600 dark:bg-rose-400';
      label = 'Human Rejected';
      break;

    case 'matched':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-transparent dark:text-emerald-400 dark:border-emerald-500/60';
      dotColor = 'bg-emerald-600 dark:bg-emerald-400';
      label = 'Matched';
      break;

    default:
      styles = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-500 dark:bg-slate-400';
      break;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider ${sizeClasses} ${styles} ${className}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} ${
          pulse ? 'animate-ping' : ''
        }`}
      />
      {label}
    </span>
  );
};
