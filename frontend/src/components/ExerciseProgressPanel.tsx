import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as api from '../api.js';
import type { ExerciseCycleProgress, ExerciseProgressSession } from '../types.js';
import ErrorBanner from './ErrorBanner.jsx';

interface Props {
  templateId: string;
  exerciseName: string;
  cycleId?: string;
  onClose: () => void;
}

export default function ExerciseProgressPanel({ templateId, exerciseName, cycleId, onClose }: Props) {
  const [data, setData] = useState<ExerciseCycleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = (await api.getExerciseCycleProgress(templateId, cycleId)) as ExerciseCycleProgress;
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [templateId, cycleId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading progress...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ErrorBanner message={error} />
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No sessions recorded yet for this exercise in the cycle.
      </div>
    );
  }

  const sessions = data.sessions;

  // Prepare line chart data
  const lineData = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    e1rm: Math.round(s.estimated1RM),
    volume: Math.round(s.bestSetVolume),
  }));

  // Get motivational statement based on progress pattern
  const getMotivatinalMessage = () => {
    if (sessions.length < 2) return 'Nice start. Keep going.';

    const recentSessions = sessions.slice(-3);
    const allGreen = recentSessions.every((s) => s.sets.every((set) => set.classification === 'exceeded'));
    if (allGreen) {
      return 'You\'re crushing this. Time to go heavier.';
    }

    const improving = recentSessions[recentSessions.length - 1].estimated1RM > sessions[0].estimated1RM;
    if (improving) {
      return 'Steady climb. Progressive overload is working.';
    }

    return 'Consistency is the game. You showed up, and that matters.';
  };

  // Prepare heatmap data: weeks as columns, sets as rows
  const maxSetsPerSession = Math.max(...sessions.map((s) => s.sets.length));
  const heatmapWeeks = [];
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const weekNum = Math.floor(i / 3) + 1; // Approximately 3 sessions per week
    heatmapWeeks.push({ weekNum, sessionIdx: i, session });
  }

  return (
    <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{exerciseName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sessions.length} sessions tracked</div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {/* e1RM Trend */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Estimated 1RM Trend</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '12px',
              }}
            />
            <Line type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Best Set Volume */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Best Set Volume (Weight × Reps)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '12px',
              }}
            />
            <Line type="monotone" dataKey="volume" stroke="var(--ok)" strokeWidth={2} dot={{ fill: 'var(--ok)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rep Heatmap */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Rep Performance Heatmap</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Green = exceeded • Neutral = hit • Red = missed
        </div>

        {/* Heatmap grid: weeks as columns, sets as rows */}
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '1px', minWidth: 'max-content' }}>
            {/* Row labels (set indices) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '30px', paddingRight: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', height: '20px', display: 'flex', alignItems: 'center' }}>
                Set
              </div>
              {Array.from({ length: maxSetsPerSession }, (_, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    width: '30px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <div style={{ display: 'flex', gap: '1px' }}>
              {heatmapWeeks.map((w) =>
                sessions[w.sessionIdx] ? (
                  <div key={w.sessionIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <div
                      style={{
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        width: '24px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      W{w.weekNum}
                    </div>
                    {Array.from({ length: maxSetsPerSession }, (_, setIdx) => {
                      const set = sessions[w.sessionIdx].sets[setIdx];
                      let bg = 'var(--border)'; // No data
                      if (set) {
                        if (set.classification === 'exceeded') {
                          bg = 'var(--ok)';
                        } else if (set.classification === 'missed') {
                          bg = 'var(--error)';
                        } else {
                          bg = 'var(--text-muted)';
                        }
                      }
                      const tooltipText = set ? `${set.reps} reps (target: ${set.targetReps})` : 'N/A';
                      return (
                        <div
                          key={setIdx}
                          title={tooltipText}
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: bg,
                            borderRadius: '2px',
                            opacity: set ? 1 : 0.3,
                            cursor: set ? 'pointer' : 'default',
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Motivational message */}
      <div
        style={{
          padding: '12px',
          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          borderRadius: '4px',
          fontSize: '12px',
          fontStyle: 'italic',
          color: 'var(--text)',
          borderLeft: `3px solid var(--accent)`,
        }}
      >
        {getMotivatinalMessage()}
      </div>
    </div>
  );
}
