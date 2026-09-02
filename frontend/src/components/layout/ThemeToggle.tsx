import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { Palette, Check, Sun, Moon, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  placement?: 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  placement = 'bottom-right',
  compact = false
}) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes: { id: ThemeMode; name: string; icon: any; color: string; desc: string }[] = [
    {
      id: 'dark',
      name: 'Dark Mode',
      icon: Moon,
      color: 'bg-indigo-500',
      desc: 'Professional dark aesthetic'
    },
    {
      id: 'light',
      name: 'Light Mode',
      icon: Sun,
      color: 'bg-amber-500',
      desc: 'Clean high-contrast light'
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentThemeObj = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentThemeObj.icon;

  // Position classes depending on placement
  const getDropdownPositionClass = () => {
    switch (placement) {
      case 'bottom-right':
        return 'top-full right-0 mt-2';
      case 'bottom-left':
        return 'top-full left-0 mt-2';
      case 'top-left':
        return 'bottom-full left-0 mb-2';
      case 'top-right':
        return 'bottom-full right-0 mb-2';
      default:
        return 'top-full right-0 mt-2';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border border-slate-300 dark:border-indigo-500/30 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium transition-all shadow-sm group ${
          compact ? 'p-2' : 'px-3 py-1.5'
        }`}
        title={`Current Theme: ${currentThemeObj.name}. Click to change.`}
        aria-label="Theme Selector"
      >
        <div className={`w-2 h-2 rounded-full ${currentThemeObj.color} group-hover:scale-125 transition-transform`} />
        <CurrentIcon size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        {!compact && (
          <>
            <span className="text-[11px] font-sans font-semibold truncate max-w-[100px]">{currentThemeObj.name}</span>
            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement.startsWith('bottom') ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement.startsWith('bottom') ? -6 : 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${getDropdownPositionClass()} w-56 p-2 rounded-2xl bg-white dark:bg-[#0e0e18] backdrop-blur-2xl border border-slate-200 dark:border-indigo-500/40 shadow-2xl z-50 space-y-1`}
          >
            <div className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Select Theme Palette
            </div>

            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold font-sans">{t.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono leading-none">{t.desc}</div>
                    </div>
                  </div>

                  {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
