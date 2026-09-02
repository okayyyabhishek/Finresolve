import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import {
  Activity,
  UploadCloud,
  Menu,
  LayoutDashboard,
  Search,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';
import { api } from '../../api/client';
import { ControllerCopilot } from '../shared/ControllerCopilot';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { Logo } from './Logo';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerMetrics, setHeaderMetrics] = useState<{
    financialErrorExposure: string;
    autoResolutionAccuracy: number;
  } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Close mobile drawer when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchMetrics = () => {
      api
        .getEvaluationMetrics()
        .then((data) => {
          setHeaderMetrics({
            financialErrorExposure: data.financialErrorExposure || '₹0.00',
            autoResolutionAccuracy: data.autoResolutionAccuracy ?? 100
          });
        })
        .catch(() => {
          // Silently fallback to defaults
        });
    };

    fetchMetrics();
    window.addEventListener('finresolve:batch-uploaded', fetchMetrics);
    return () => window.removeEventListener('finresolve:batch-uploaded', fetchMetrics);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Overview',
          subtitle: 'High-level metrics and system status'
        };
      case '/investigations':
        return {
          title: 'Exception Workspace',
          subtitle: 'Real-time anomaly triage and deterministic policy safety'
        };
      case '/audit-report':
      case '/evaluation':
        return {
          title: 'Audit Ledger',
          subtitle: 'Immutable record of policy decisions and human reviews'
        };
      case '/intelligence':
        return {
          title: 'Automation Intelligence',
          subtitle: 'Coverage-risk analytics and evaluation metrics'
        };
      case '/ingestion':
        return {
          title: 'Data Ingestion',
          subtitle: 'Upload and process settlement batches'
        };
      default:
        return {
          title: 'FINRESOLVE',
          subtitle: 'Selective-Autonomy Settlement Controller'
        };
    }
  };

  const pageInfo = getPageTitle();

  const mobileBottomNavItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Exceptions', path: '/investigations', icon: Search },
    { name: 'Audit', path: '/audit-report', icon: ShieldCheck },
    { name: 'AI Intel', path: '/intelligence', icon: BrainCircuit },
    { name: 'Ingest', path: '/ingestion', icon: UploadCloud }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--bg-primary)] text-slate-900 dark:text-slate-200 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar (Desktop Collapsible & Mobile Slide-Over Drawer) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        } pb-20 md:pb-8`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-white/5 backdrop-blur-xl bg-white/85 dark:bg-[#0a0f1c]/85 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Mobile Logo Mark */}
            <div className="md:hidden flex items-center">
              <Logo size={24} showText={false} />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {pageInfo.title}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate mt-0.5">
                {pageInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Live Financial Metrics Ticker */}
            <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Activity size={13} className="text-emerald-500" />
                <span>{headerMetrics?.financialErrorExposure ?? '₹0.00'} Risk</span>
              </div>
              <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
              <div className="text-slate-600 dark:text-slate-300">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1">
                  {headerMetrics?.autoResolutionAccuracy ?? 100}%
                </span>
                Accuracy
              </div>
            </div>

            {/* Upload Batch Button */}
            {location.pathname !== '/ingestion' && (
              <button
                onClick={() => navigate('/ingestion')}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                <UploadCloud size={14} />
                <span className="hidden xs:inline sm:inline">Upload Batch</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Body View */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto min-w-0">
          <ErrorBoundary fallbackTitle="Page View Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-[#0a0f1c]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 flex items-center justify-around shadow-lg">
        {mobileBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''}`}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Global AI Settlement Copilot */}
      <ControllerCopilot activeExceptionId={searchParams.get('exceptionId')} />
    </div>
  );
};
