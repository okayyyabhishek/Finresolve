import React from 'react';
import { motion } from 'framer-motion';

interface ConfidenceMeterProps {
  score: number; // 0.0 to 1.0 or 0 to 100
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  score,
  label,
  size = 110,
  strokeWidth = 8,
  className = ''
}) => {
  // Normalize score to percentage 0-100
  const percentage = score > 1 ? Math.min(score, 100) : Math.round(score * 100);

  // Color selection
  let color = '#ef4444'; // Red (<60%)
  if (percentage >= 85) {
    color = '#10b981'; // Emerald (>=85%)
  } else if (percentage >= 60) {
    color = '#f59e0b'; // Amber (60-84%)
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-200 dark:text-slate-800"
          />
          {/* Animated Gauge Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Percentage Display - Ultra High Contrast & Legible */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          >
            {percentage}%
          </motion.span>
        </div>
      </div>

      {/* Label */}
      <span className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">
        {label}
      </span>
    </div>
  );
};
