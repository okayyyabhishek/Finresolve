import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  UploadCloud,
  LayoutDashboard,
  X
} from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen = false,
  setMobileOpen
}) => {
  const navItems = [
    {
      name: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'Exceptions',
      path: '/investigations',
      icon: Search,
      badge: 'Triage'
    },
    {
      name: 'Audit Ledger',
      path: '/audit-report',
      icon: ShieldCheck,
      badge: 'Logs'
    },
    {
      name: 'Intelligence',
      path: '/intelligence',
      icon: Activity,
      badge: 'AI'
    },
    {
      name: 'Data Ingestion',
      path: '/ingestion',
      icon: UploadCloud,
      badge: null
    }
  ];

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop Collapsible & Mobile Slide-Over Drawer) */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 md:z-30 flex flex-col justify-between
          border-r border-slate-200 dark:border-white/5 backdrop-blur-xl
          bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200
          transition-all duration-300 shadow-xl md:shadow-none
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-white/5">
            <Logo size={28} showText={!collapsed || mobileOpen} />
            
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className="flex md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13px]
                    transition-all duration-200 group
                    ${
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
                    }
                    ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}
                  `}
                  title={collapsed && !mobileOpen ? item.name : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {(!collapsed || mobileOpen) && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer / Status */}
        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
          {!collapsed || mobileOpen ? (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs border border-emerald-200/60 dark:border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-emerald-800 dark:text-emerald-400 truncate">System Active</div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/60 font-mono">FINRESOLVE PROD</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" title="System Active">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <ThemeToggle placement="top-left" compact={true} />
            {(!collapsed || mobileOpen) && (
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono">v1.2.0</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
