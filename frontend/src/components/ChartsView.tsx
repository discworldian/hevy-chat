import { useEffect, useState } from 'react';
import * as api from '../api.js';
import type { Workout } from '../types.js';
import ErrorBanner from './ErrorBanner.jsx';
import MuscleVolumeRadar from './charts/MuscleVolumeRadar.jsx';
import ExerciseProgressPanel from './ExerciseProgressPanel.jsx';

interface MuscleVolumeData {
  muscle: string;
  thisWeek: number;
  lastWeek: number;
}

interface RecentSummary {
  thisWeekVolume: number;
  lastWeekVolume: number;
  volumeTrend: { weekLabel: string; volume: number }[];
  recentPRs: { exerciseTitle: string; date: string; prTypes: string[]; daysAgo: number }[];
  streakWeeks: number;
}

export default function ChartsView() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [muscleVolumeData, setMuscleVolumeData] = useState<MuscleVolumeData[]>([]);
  const [recentSummary, setRecentSummary] = useState<RecentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [radarLoading, setRadarLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = (await api.getWorkouts()) as { workouts: Workout[] };
        setWorkouts(data.workouts || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadRadar = async () => {
      setRadarLoading(true);
      setRadarError(null);
      try {
        const result = (await api.getMuscleVolumeWeekly(2)) as any;
        if (result.weeks && result.weeks.length >= 2) {
          const weeks = result.weeks;
          const thisWeek = weeks[weeks.length - 1].muscleVolume;
          const lastWeek = weeks[weeks.length - 2].muscleVolume;

          const MUSCLE_GROUP_AXES = [
            'chest', 'shoulders', 'triceps', 'lats', 'upper_back', 'traps',
            'biceps', 'forearms', 'quadriceps', 'glutes', 'hamstrings',
            'calves', 'lower_back', 'adductors', 'abdominals',
          ];

          const data: MuscleVolumeData[] = MUSCLE_GROUP_AXES.map((muscle) => ({
            muscle,
            thisWeek: thisWeek[muscle] || 0,
            lastWeek: lastWeek[muscle] || 0,
          }));

          // Normalize by max for each muscle group so radar stays readable
          const maxByMuscle: Record<string, number> = {};
          for (const d of data) {
            maxByMuscle[d.muscle] = Math.max(d.thisWeek, d.lastWeek, 1);
          }

          const normalized = data.map((d) => ({
            ...d,
            thisWeek: d.thisWeek / maxByMuscle[d.muscle],
            lastWeek: d.lastWeek / maxByMuscle[d.muscle],
          }));

          setMuscleVolumeData(normalized);
        }
      } catch (err: any) {
        setRadarError(err.message);
      } finally {
        setRadarLoading(false);
      }
    };

    loadRadar();
  }, []);

  useEffect(() => {
    const loadRecentSummary = async () => {
      setSummaryLoading(true);
      try {
        const result = (await api.getRecentSummary()) as RecentSummary;
        setRecentSummary(result);
      } catch (err: any) {
        console.error('Failed to load recent summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    };

    loadRecentSummary();
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (loading) return <div className="panel"><h2>Analytics & Charts</h2><div className="empty-state">Loading...</div></div>;

  // Calculate stats
  const totalWorkouts = workouts.length;
  const now = new Date().getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const recentWorkouts = workouts.filter((w) => {
    const wTime = new Date(w.start_time).getTime();
    return now - wTime <= thirtyDaysMs;
  });

  const totalVolume = workouts.reduce((sum, w) => {
    return sum + w.exercises.reduce((exSum, ex) => {
      return exSum + ex.sets.reduce((setSum: any, set: any) => {
        if (set.type !== 'warmup' && set.weight_kg && set.reps) {
          return setSum + set.weight_kg * set.reps;
        }
        return setSum;
      }, 0);
    }, 0);
  }, 0);

  const avgSessionDuration = (() => {
    if (workouts.length === 0) return 0;
    const totalMs = workouts.reduce((sum, w) => {
      return sum + (new Date(w.end_time).getTime() - new Date(w.start_time).getTime());
    }, 0);
    return Math.round(totalMs / workouts.length / 60000);
  })();

  // Top exercises by volume
  const exerciseVolume: Record<string, { templateId: string; name: string; volume: number; sessions: number }> = {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (!exerciseVolume[exercise.exercise_template_id]) {
        exerciseVolume[exercise.exercise_template_id] = { templateId: exercise.exercise_template_id, name: exercise.title, volume: 0, sessions: 0 };
      }
      exerciseVolume[exercise.exercise_template_id].sessions++;

      for (const set of exercise.sets as any[]) {
        if (set.type !== 'warmup' && set.weight_kg && set.reps) {
          exerciseVolume[exercise.exercise_template_id].volume += set.weight_kg * set.reps;
        }
      }
    }
  }

  const topExercises = Object.values(exerciseVolume)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // Show progress panel if one is selected
  if (selectedExerciseId) {
    return (
      <div className="panel">
        <h2>Analytics & Charts</h2>
        <ExerciseProgressPanel
          templateId={selectedExerciseId}
          exerciseName={selectedExerciseName}
          onClose={() => {
            setSelectedExerciseId(null);
            setSelectedExerciseName('');
          }}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Analytics & Charts</h2>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Workouts</div>
          <div style={{ fontSize: '28px', fontWeight: 600 }}>{totalWorkouts}</div>
        </div>

        {recentSummary && (
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>This Week Volume</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{recentSummary.thisWeekVolume.toLocaleString()}kg</div>
              {recentSummary.lastWeekVolume > 0 && (
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: recentSummary.thisWeekVolume > recentSummary.lastWeekVolume ? 'var(--ok)' : 'var(--text-muted)',
                }}>
                  {recentSummary.thisWeekVolume > recentSummary.lastWeekVolume ? '↑' : '↓'}
                  {Math.round(Math.abs((recentSummary.thisWeekVolume - recentSummary.lastWeekVolume) / recentSummary.lastWeekVolume) * 100)}%
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Last 30 Days</div>
          <div style={{ fontSize: '28px', fontWeight: 600 }}>{recentWorkouts.length} workouts</div>
        </div>

        <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Duration</div>
          <div style={{ fontSize: '28px', fontWeight: 600 }}>{avgSessionDuration}m</div>
        </div>
      </div>

      {/* Muscle Volume Radar Chart */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <MuscleVolumeRadar data={muscleVolumeData} loading={radarLoading} error={radarError} />
      </div>

      {/* Recent Highlights */}
      {recentSummary && (
        <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>recent highlights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSummary.streakWeeks > 0 && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                🔥 <strong>{recentSummary.streakWeeks} week{recentSummary.streakWeeks > 1 ? 's' : ''} streak</strong> — You're consistent!
              </div>
            )}
            {recentSummary.recentPRs.length > 0 ? (
              recentSummary.recentPRs.map((pr, idx) => {
                const typeLabels: Record<string, string> = {
                  weight: 'weight',
                  reps: 'reps',
                  estimated1rm: '1RM',
                  totalVolume: 'total volume',
                  heaviestLift: 'heaviest lift',
                  highestVolumeSet: 'highest set',
                  distance: 'distance',
                  duration: 'duration',
                };

                const prList = pr.prTypes.map((type) => typeLabels[type] || type).join(' • ');

                return (
                  <div key={idx} style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                    🎯 <strong>{pr.exerciseTitle}</strong> — {prList} ({pr.daysAgo}d ago)
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No recent PRs. Keep training!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Exercises */}
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>top exercises by volume</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topExercises.map((ex) => (
            <div key={ex.templateId} style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{ex.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ex.sessions} sessions</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent)' }}>{Math.round(ex.volume).toLocaleString()}kg</div>
                <button
                  onClick={() => {
                    setSelectedExerciseId(ex.templateId);
                    setSelectedExerciseName(ex.name);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--accent)',
                    backgroundColor: 'transparent',
                    color: 'var(--accent)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  View progress
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
