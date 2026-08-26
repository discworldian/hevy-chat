import { useState } from 'react';
import * as api from '../api.js';
import ErrorBanner from './ErrorBanner.jsx';

export default function SettingsView() {
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncedCount(null);
    try {
      const result = (await api.refreshWorkouts()) as { synced: number; lastSyncedAt: string };
      setSyncedCount(result.synced);
    } catch (err: any) {
      setSyncError(err.message || 'Failed to sync workouts');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="panel">
      <h2>Settings</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '4px' }}>
          <div style={{ fontWeight: 500, marginBottom: '8px' }}>Refresh from Hevy</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Sync your latest workouts and exercises from Hevy. This updates the local cache with any new data.
          </div>
          <button
            onClick={handleRefresh}
            disabled={syncing}
            style={{
              padding: '8px 16px',
              background: syncing ? 'var(--text-muted)' : 'var(--accent)',
              color: syncing ? 'var(--text)' : 'var(--accent-contrast)',
              border: 'none',
              borderRadius: '4px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            {syncing ? 'Syncing...' : 'Refresh from Hevy'}
          </button>

          {syncedCount !== null && (
            <div style={{ fontSize: '12px', color: 'var(--ok)', marginTop: '8px' }}>
              ✓ Successfully synced {syncedCount} workouts
            </div>
          )}

          {syncError && <ErrorBanner message={`Sync failed: ${syncError}`} />}
        </div>
      </div>
    </div>
  );
}
