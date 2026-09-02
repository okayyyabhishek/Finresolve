import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { OverviewView } from './pages/OverviewView';
import { InvestigationView } from './pages/InvestigationView';
import { AuditReportView } from './pages/AuditReportView';
import { IntelligenceView } from './pages/IntelligenceView';
import { UploadView } from './pages/UploadView';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<OverviewView />} />
            <Route path="investigations" element={<InvestigationView />} />
            <Route path="audit-report" element={<AuditReportView />} />
            <Route path="audit" element={<Navigate to="/audit-report" replace />} />
            <Route path="evaluation" element={<Navigate to="/audit-report" replace />} />
            <Route path="intelligence" element={<IntelligenceView />} />
            <Route path="ingestion" element={<UploadView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
