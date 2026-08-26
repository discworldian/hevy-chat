import type { ReactNode } from 'react';

interface Props {
  activeTab: 'history' | 'plan' | 'charts';
  setActiveTab: (tab: 'history' | 'plan' | 'charts') => void;
  location: 'home' | 'gym';
  setLocation: (loc: 'home' | 'gym') => void;
}

export default function AppHeader({ activeTab, setActiveTab, location, setLocation }: Props) {
  return (
    <div className="app-header">
      <div className="app-header-title-row">
        <h1 className="app-title">
          <span className="zebra-badge">🏋️</span>
          Hevy Chat
        </h1>
        <div className="location-toggle">
          <button
            className={location === 'home' ? 'active' : ''}
            onClick={() => setLocation('home')}
          >
            Home
          </button>
          <button
            className={location === 'gym' ? 'active' : ''}
            onClick={() => setLocation('gym')}
          >
            Gym
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={activeTab === 'plan' ? 'active' : ''}
          onClick={() => setActiveTab('plan')}
        >
          8-Week Plan
        </button>
        <button
          className={activeTab === 'charts' ? 'active' : ''}
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </button>
      </div>
    </div>
  );
}
