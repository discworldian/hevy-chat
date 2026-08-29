import { useEffect, useState } from 'react';
import * as api from '../api.js';
import ErrorBanner from './ErrorBanner.jsx';
import MuscleVolumeRadar from './charts/MuscleVolumeRadar.jsx';

interface MuscleRadarData {
  muscle: string;
  cycleStart: number;
  cycleEnd: number;
}

interface CompoundCard {
  templateId: string;
  title: string;
  startWeightKg: number;
  endWeightKg: number;
  startE1RM: number;
  endE1RM: number;
  percentChange: number;
}

interface CycleReportData {
  cycleId: string;
  startDate: string;
  endDate: string;
  compoundSummary: CompoundCard[];
  muscleRadarData: MuscleRadarData[];
  consistency: {
    sessionsComplanned: number;
    sessionsCompleted: number;
    percentComplete: number;
    longestStreak: number;
  };
  motivationalSummary: {
    totalVolumeKg: number;
    bestPRExercise: string;
    bestPRPercent: number;
    animalComparison: string;
    scienceTidbit: string;
  };
}

interface Props {
  cycleId?: string;
}

export default function CycleReportView({ cycleId }: Props) {
  const [data, setData] = useState<CycleReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = (await api.getCycleReport(cycleId)) as CycleReportData;
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [cycleId]);

  if (loading) {
    return (
      <div className="panel">
        <h2>Cycle Report</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading report...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Cycle Report</h2>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel">
        <h2>Cycle Report</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No cycle data available.
        </div>
      </div>
    );
  }

  const getColorForChange = (pct: number) => {
    if (pct > 2) return 'var(--ok)';
    if (pct < -2) return 'var(--error)';
    return 'var(--text-muted)';
  };

  // Prepare radar data for chart (normalize like in ChartsView)
  const radarData = data.muscleRadarData.map((d) => ({
    muscle: d.muscle,
    thisWeek: d.cycleEnd,
    lastWeek: d.cycleStart,
  }));

  return (
    <div className="panel">
      <h2>Cycle Report</h2>

      {/* Header */}
      <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Cycle: {new Date(data.startDate).toLocaleDateString()} → {new Date(data.endDate).toLocaleDateString()}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>8-Week Training Cycle Summary</div>
      </div>

      {/* 9a. Compound Lift Summary */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Compound Lift Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {data.compoundSummary.map((compound) => (
            <div key={compound.templateId} style={{ padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: `1px solid ${getColorForChange(compound.percentChange)}` }}>
              <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '8px' }}>{compound.title}</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>
                Weight: {compound.startWeightKg}kg → {compound.endWeightKg}kg
              </div>
              <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                e1RM: {compound.startE1RM} → {compound.endE1RM}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: getColorForChange(compound.percentChange),
                  marginBottom: '4px',
                }}
              >
                {compound.percentChange > 0 ? '+' : ''}{compound.percentChange}%
              </div>
              {compound.percentChange > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--ok)', fontStyle: 'italic' }}>
                  {compound.percentChange > 5 ? '🔥 Solid gains!' : 'Good consistency'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 9b. Muscle Volume Radar */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-muted)' }}>
          MUSCLE VOLUME: CYCLE START VS END
        </div>
        <MuscleVolumeRadar
          data={radarData}
          title="Muscle Group Volume Comparison"
          loading={false}
          error={null}
        />
      </div>

      {/* 9c. Consistency Score */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Consistency & Adherence</div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>Sessions Completed</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
              {data.consistency.sessionsCompleted}/{data.consistency.sessionsComplanned}
            </div>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: 'var(--bg)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--accent)',
                width: `${data.consistency.percentComplete}%`,
                transition: 'width 300ms ease',
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
            {data.consistency.percentComplete}% complete
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg)',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Longest streak</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ok)' }}>
            {data.consistency.longestStreak} consecutive weeks
          </div>
        </div>
      </div>

      {/* 9d. Motivational Summary */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Cycle Summary</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Volume Lifted</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
              {data.motivationalSummary.totalVolumeKg.toLocaleString()}kg
            </div>
          </div>

          {data.motivationalSummary.bestPRExercise && (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px', borderLeft: '3px solid var(--ok)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Best PR This Cycle</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{data.motivationalSummary.bestPRExercise}</div>
              <div style={{ fontSize: '13px', color: 'var(--ok)', marginTop: '4px', fontWeight: 500 }}>
                +{data.motivationalSummary.bestPRPercent}% e1RM
              </div>
            </div>
          )}

          <div
            style={{
              padding: '12px',
              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.6',
              borderLeft: '3px solid var(--accent)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>{data.motivationalSummary.animalComparison}</div>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg)',
              borderRadius: '6px',
              fontSize: '11px',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
            }}
          >
            <strong>💡 Science:</strong> {data.motivationalSummary.scienceTidbit}
          </div>
        </div>
      </div>
    </div>
  );
}
