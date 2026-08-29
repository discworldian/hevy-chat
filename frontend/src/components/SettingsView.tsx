import { useState, useEffect } from 'react';
import * as api from '../api.js';
import ErrorBanner from './ErrorBanner.jsx';

interface EquipmentItem {
  id: string;
  type: 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'band' | 'kettlebell' | 'plate' | 'bar' | 'other';
  name: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  increment?: number;
  notes?: string;
}

export default function SettingsView() {
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [homeEquipment, setHomeEquipment] = useState<EquipmentItem[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);

  const [formData, setFormData] = useState({
    type: 'dumbbell' as EquipmentItem['type'],
    name: '',
    minWeightKg: '',
    maxWeightKg: '',
    increment: '',
    notes: '',
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoadingEquipment(true);
    setEquipmentError(null);
    try {
      const result = (await api.getEquipment('home')) as { location: string; equipment: EquipmentItem[] };
      setHomeEquipment(result.equipment);
    } catch (err: any) {
      setEquipmentError(err.message || 'Failed to load equipment');
    } finally {
      setLoadingEquipment(false);
    }
  };

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

  const handleDeleteEquipment = async (id: string) => {
    const updated = homeEquipment.filter((e) => e.id !== id);
    setSavingEquipment(true);
    try {
      await api.updateHomeEquipment(updated);
      setHomeEquipment(updated);
    } catch (err: any) {
      setEquipmentError(err.message || 'Failed to delete equipment');
    } finally {
      setSavingEquipment(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!formData.name.trim()) {
      setEquipmentError('Equipment name is required');
      return;
    }

    const newItem: EquipmentItem = {
      id: `${Date.now()}`,
      type: formData.type,
      name: formData.name,
      minWeightKg: formData.minWeightKg ? parseFloat(formData.minWeightKg) : undefined,
      maxWeightKg: formData.maxWeightKg ? parseFloat(formData.maxWeightKg) : undefined,
      increment: formData.increment ? parseFloat(formData.increment) : undefined,
      notes: formData.notes || undefined,
    };

    const updated = [...homeEquipment, newItem];
    setSavingEquipment(true);
    try {
      await api.updateHomeEquipment(updated);
      setHomeEquipment(updated);
      setFormData({
        type: 'dumbbell',
        name: '',
        minWeightKg: '',
        maxWeightKg: '',
        increment: '',
        notes: '',
      });
      setShowAddForm(false);
    } catch (err: any) {
      setEquipmentError(err.message || 'Failed to add equipment');
    } finally {
      setSavingEquipment(false);
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

        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '4px' }}>
          <div style={{ fontWeight: 500, marginBottom: '8px' }}>Home Equipment</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Manage equipment available at home for workout planning.
          </div>

          {loadingEquipment ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <>
              {homeEquipment.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {homeEquipment.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        marginBottom: '6px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {item.type}
                          {item.minWeightKg || item.maxWeightKg
                            ? ` • ${item.minWeightKg || '-'}–${item.maxWeightKg || '-'}kg`
                            : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEquipment(item.id)}
                        disabled={savingEquipment}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--error)',
                          color: 'var(--error)',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          cursor: savingEquipment ? 'not-allowed' : 'pointer',
                          opacity: savingEquipment ? 0.6 : 1,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {showAddForm ? '✕ Cancel' : '+ Add Equipment'}
              </button>

              {showAddForm && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Hex Dumbbells"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as EquipmentItem['type'] })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="dumbbell">Dumbbell</option>
                        <option value="barbell">Barbell</option>
                        <option value="machine">Machine</option>
                        <option value="cable">Cable</option>
                        <option value="band">Band</option>
                        <option value="kettlebell">Kettlebell</option>
                        <option value="plate">Plate</option>
                        <option value="bar">Bar</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Min Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.minWeightKg}
                          onChange={(e) => setFormData({ ...formData, minWeightKg: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="50"
                          value={formData.maxWeightKg}
                          onChange={(e) => setFormData({ ...formData, maxWeightKg: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Increment (kg) - optional</label>
                      <input
                        type="number"
                        placeholder="e.g., 2.5"
                        value={formData.increment}
                        onChange={(e) => setFormData({ ...formData, increment: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      onClick={handleAddEquipment}
                      disabled={savingEquipment}
                      style={{
                        padding: '8px 16px',
                        background: savingEquipment ? 'var(--text-muted)' : 'var(--accent)',
                        color: savingEquipment ? 'var(--text)' : 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingEquipment ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {savingEquipment ? 'Saving...' : 'Add Equipment'}
                    </button>
                  </div>
                </div>
              )}

              {equipmentError && <ErrorBanner message={`Equipment error: ${equipmentError}`} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
