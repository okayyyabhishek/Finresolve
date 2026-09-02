import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = false,
  hoverEffect = true,
  ...motionProps
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hoverEffect ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`
        relative rounded-xl backdrop-blur-xl
        bg-white/85 dark:bg-[#12121e]/80
        border border-slate-200/90 dark:border-indigo-500/20
        text-slate-900 dark:text-slate-200
        ${glow ? 'shadow-glow-md' : 'shadow-md shadow-slate-200/40 dark:shadow-black/20'}
        ${hoverEffect ? 'hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:shadow-lg dark:hover:shadow-glow-sm' : ''}
        transition-all duration-200
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};
