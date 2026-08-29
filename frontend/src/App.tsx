import { useEffect, useState } from 'react';
import * as api from './api.js';
import type { HealthStatus } from './types.js';
import AppHeader from './components/AppHeader.jsx';
import HistoryView from './components/HistoryView.jsx';
import PlanView from './components/PlanView.jsx';
import ChartsView from './components/ChartsView.jsx';
import DraftWorkoutView from './components/DraftWorkoutView.jsx';
import SettingsView from './components/SettingsView.jsx';
import CycleReportView from './components/CycleReportView.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';

type Tab = 'history' | 'plan' | 'charts' | 'draft' | 'settings' | 'cycleReport';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [location, setLocation] = useState<'home' | 'gym'>('home');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = (await api.getHealth()) as HealthStatus;
        setHealth(result);

        if (!result.ok && !result.hevyKeyPresent) {
          setError(
            'Hevy API key not configured. Please set HEVY_API_KEY in backend/.env and restart the server.',
          );
          return;
        }

        // Don't auto-refresh on load (too slow with large history)
        // User can manually refresh via API if needed
      } catch (err: any) {
        setError(err.message || 'Failed to connect to backend');
      }
    };

    initApp();
  }, []);

  if (!health) {
    return (
      <div className="app">
        <div className="spinner" />
      </div>
    );
  }

  if (!health.ok) {
    return (
      <div className="app">
        <AppHeader activeTab={activeTab} setActiveTab={setActiveTab} location={location} setLocation={setLocation} />
        <ErrorBanner message={error || 'Backend not ready'} retryable={true} />
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader activeTab={activeTab} setActiveTab={setActiveTab} location={location} setLocation={setLocation} />

      {error && <ErrorBanner message={error} retryable={true} />}

      <div>
        {activeTab === 'history' && <HistoryView location={location} />}
        {activeTab === 'plan' && <PlanView location={location} />}
        {activeTab === 'charts' && <ChartsView />}
        {activeTab === 'draft' && <DraftWorkoutView location={location} />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'cycleReport' && <CycleReportView />}
      </div>

      <footer className="app-footer">
        <p>Hevy Chat — progressive overload coach + analytics</p>
      </footer>
    </div>
  );
}
