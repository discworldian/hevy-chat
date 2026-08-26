import { useEffect, useState } from 'react';
import * as api from '../api.js';
import type { ExercisePlan } from '../types.js';
import ErrorBanner from './ErrorBanner.jsx';

interface Props {
  location: 'home' | 'gym';
}

export default function PlanView({ location }: Props) {
  const [plans, setPans] = useState<ExercisePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = (await api.getPlan(location)) as { exercisePlans: ExercisePlan[] };
        setPans(data.exercisePlans || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location]);

  if (loading) return <div className="spinner" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="panel">
      <h2>8-Week Progressive Overload Plan</h2>
      {plans.length === 0 ? (
        <div className="empty-state">No exercises with plans yet. Refresh and log some workouts.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map((plan) => (
            <div key={plan.exerciseTemplateId} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>{plan.title}</strong>
                <span className={`suggestion-badge ${plan.status}`}>{plan.status}</span>
              </div>

              {plan.status === 'ok' && plan.weeks && (
                <div style={{ fontSize: '12px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Week</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Plan</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Weight (kg)</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.weeks.map((week) => (
                        <tr key={week.week} style={{ borderBottom: '1px solid var(--border)', background: week.actual ? 'var(--ok-bg)' : 'transparent' }}>
                          <td style={{ padding: '4px' }}>W{week.week}</td>
                          <td style={{ padding: '4px' }}>
                            {week.targetSets}x{week.targetReps}
                            {week.actual && week.loggedReps && ` → ${week.loggedReps}`}
                          </td>
                          <td style={{ padding: '4px' }}>
                            {week.actual && week.loggedWeightKg ? `${week.loggedWeightKg.toFixed(1)}` : week.weightKg.toFixed(1)}
                          </td>
                          <td style={{ padding: '4px', fontSize: '10px', color: week.actual ? 'var(--ok)' : 'var(--text-muted)' }}>
                            {week.actual ? '✓ Logged' : 'Projected'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                      Restart Plan
                    </button>
                  </div>
                </div>
              )}

              {plan.status === 'unavailable' && (
                <div className="empty-state" style={{ fontSize: '12px' }}>
                  Not available at {location}: needs {plan.missingEquipment?.join(', ')}
                </div>
              )}

              {plan.status === 'insufficient_data' && (
                <div className="empty-state" style={{ fontSize: '12px' }}>
                  Need more sessions to generate a plan ({plan.sessionsCount || 0} logged)
                </div>
              )}

              {plan.status === 'cardio' && (
                <div className="empty-state" style={{ fontSize: '12px' }}>
                  Cardio/duration exercise — progression logic not yet modeled
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
