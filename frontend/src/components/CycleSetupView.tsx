import { useState, useEffect } from 'react';
import * as api from '../api.js';
import ErrorBanner from './ErrorBanner.jsx';
import HierarchicalExerciseSelector from './HierarchicalExerciseSelector.jsx';
import type { ExerciseTemplate, DraftWorkoutExercise } from '../types.js';

export default function CycleSetupView({ onCycleStarted }: { onCycleStarted: () => void }) {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState({
    push: [] as string[],
    pull: [] as string[],
    legs: [] as string[],
  });

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const result: any = await api.getExercises();
      setExercises(result.exercises || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (splitDay: 'push' | 'pull' | 'legs', exerciseId: string) => {
    setSelected((prev) => {
      const currentList = prev[splitDay];
      if (currentList.includes(exerciseId)) {
        return { ...prev, [splitDay]: currentList.filter((id) => id !== exerciseId) };
      } else {
        return { ...prev, [splitDay]: [...currentList, exerciseId] };
      }
    });
  };

  const handleStartCycle = async () => {
    // Validate that each split day has at least 3 compounds
    if (selected.push.length < 3 || selected.pull.length < 3 || selected.legs.length < 3) {
      setError('Each split day needs at least 3 compound exercises');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.startNewCycle({
        push: selected.push,
        pull: selected.pull,
        legs: selected.legs,
      });
      onCycleStarted();
    } catch (err: any) {
      setError(err.message || 'Failed to start cycle');
    } finally {
      setSaving(false);
    }
  };

  const splitDays = [
    {
      key: 'push' as const,
      label: 'Push',
      muscles: ['chest', 'shoulders', 'triceps'],
      description: 'Chest, Shoulders, Triceps',
    },
    {
      key: 'pull' as const,
      label: 'Pull',
      muscles: ['lats', 'upper_back', 'biceps'],
      description: 'Back, Biceps',
    },
    {
      key: 'legs' as const,
      label: 'Legs',
      muscles: ['quadriceps', 'glutes', 'hamstrings'],
      description: 'Quads, Glutes, Hamstrings',
    },
  ];

  return (
    <div className="panel">
      <h2>Start Your 8-Week Training Cycle</h2>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Select 3-4 compound exercises for each split day. These will stay fixed for 8 weeks to track progression.
        Accessories will rotate every 2-4 weeks for variety.
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          Loading exercises...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          {splitDays.map((splitDay) => {
            const selectedExercisesForSplit: DraftWorkoutExercise[] = exercises
              .filter((ex) => selected[splitDay.key].includes(ex.templateId))
              .map((ex) => ({
                exerciseTemplateId: ex.templateId,
                title: ex.name,
                primaryMuscleGroup: ex.primaryMuscleGroup,
                isNew: false,
                daysSinceTrained: null,
                sets: 3,
                targetRepsLow: 8,
                targetRepsHigh: 12,
                targetReps: 10,
                suggestedWeightKg: null,
              }));

            return (
              <div
                key={splitDay.key}
                style={{
                  padding: '12px',
                  background: 'var(--bg)',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {splitDay.label} Day
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {splitDay.description}
                </div>

                <HierarchicalExerciseSelector
                  allExercises={exercises}
                  selectedExercises={selectedExercisesForSplit}
                  onToggleExercise={(exerciseId) => toggleExercise(splitDay.key, exerciseId)}
                  allowedMuscleGroups={splitDay.muscles}
                  mode="multi"
                />

                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Selected: {selected[splitDay.key].length} / 3+ compounds
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleStartCycle}
          disabled={saving || loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: saving || loading ? 'var(--text-muted)' : 'var(--ok)',
            color: 'var(--accent-contrast)',
            border: 'none',
            borderRadius: '4px',
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          {saving ? 'Starting Cycle...' : 'Start 8-Week Cycle'}
        </button>
      </div>
    </div>
  );
}
