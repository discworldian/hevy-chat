
interface Props {
  activeTab: 'history' | 'plan' | 'charts' | 'draft' | 'settings';
  setActiveTab: (tab: 'history' | 'plan' | 'charts' | 'draft' | 'settings') => void;
  location: 'home' | 'gym';
  setLocation: (loc: 'home' | 'gym') => void;
}

export default function AppHeader({ activeTab, setActiveTab }: Props) {
  return (
    <div className="app-header">
      <div className="app-header-title-row">
        <h1 className="app-title">
          <span className="zebra-badge">🏋️</span>
          Hevy Chat
        </h1>
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
        <button
          className={activeTab === 'draft' ? 'active' : ''}
          onClick={() => setActiveTab('draft')}
        >
          Draft
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
