import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, showText = true, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Hexagonal Shield */}
        <polygon
          points="50,6 88,26 88,68 50,94 12,68 12,26"
          fill="rgba(18, 18, 30, 0.95)"
          stroke="url(#logoGrad)"
          strokeWidth="4.5"
          filter="url(#logoGlow)"
        />

        {/* FR Interlocking Lines */}
        <path
          d="M34 32 L66 32 M34 32 L34 68 M34 48 L56 48"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M56 32 C65 32 68 38 68 44 C68 48 64 52 56 52 L68 68"
          stroke="url(#logoGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Node */}
        <circle cx="50" cy="50" r="3.5" fill="#22c55e" filter="url(#logoGlow)" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400 font-mono">
            FINRESOLVE
          </span>
          <span className="text-[11px] text-slate-400 uppercase tracking-widest -mt-1 font-medium">
            Settlement Controller
          </span>
        </div>
      )}
    </div>
  );
};
