import { useEffect, useState } from 'react';
import * as api from '../api.js';
import type { DraftWorkout, DraftWorkoutExercise, ExerciseTemplate } from '../types.js';
import ErrorBanner from './ErrorBanner.jsx';

interface Props {
  location: 'home' | 'gym';
}

type UIStep = 'input' | 'generated' | 'preview' | 'confirmed';

interface SwapState {
  exerciseIndex: number | null;
  alternatives: ExerciseTemplate[];
}

interface DraftSettings {
  minutesAvailable: number;
  location: 'home' | 'gym';
  includeWarmup: boolean;
  includeCardio: boolean;
  includeWarmupCooldown: boolean;
}

export default function DraftWorkoutView({ location: globalLocation }: Props) {
  const [settings, setSettings] = useState<DraftSettings>({
    minutesAvailable: 45,
    location: globalLocation,
    includeWarmup: true,
    includeCardio: false,
    includeWarmupCooldown: false,
  });
  const [draft, setDraft] = useState<DraftWorkout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<UIStep>('input');
  const [allExercises, setAllExercises] = useState<ExerciseTemplate[]>([]);
  const [routineTitle, setRoutineTitle] = useState('');
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmedRoutine, setConfirmedRoutine] = useState<{ id: string; title: string } | null>(null);
  const [swapState, setSwapState] = useState<SwapState>({ exerciseIndex: null, alternatives: [] });

  // Load available exercises on mount
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = (await api.getExercises()) as { exercises: ExerciseTemplate[] };
        setAllExercises(data.exercises || []);
      } catch (err: any) {
        // Non-fatal; just means "add exercise" won't work perfectly
        console.error('Failed to load exercises:', err);
      }
    };
    loadExercises();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = (await api.generateDraftWorkout(settings.minutesAvailable, settings.location, settings.includeCardio, settings.includeWarmupCooldown)) as
        | DraftWorkout
        | { status: 'time_too_short'; minMinutesNeeded: number };

      if ('status' in result && result.status === 'time_too_short') {
        setError(`Not enough time. Minimum ${result.minMinutesNeeded} minutes needed.`);
        setStep('input');
      } else {
        setDraft(result as DraftWorkout);
        setRoutineTitle(`Workout — ${new Date().toLocaleDateString()}`);
        setStep('generated');
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExercise = (idx: number) => {
    if (!draft) return;
    const updated = draft.exercises.filter((_, i) => i !== idx);
    setDraft({ ...draft, exercises: updated });
    // Close swap picker if it was for this exercise
    if (swapState.exerciseIndex === idx) {
      setSwapState({ exerciseIndex: null, alternatives: [] });
    }
  };

  const findAlternatives = (exerciseIndex: number): ExerciseTemplate[] => {
    if (!draft || exerciseIndex >= draft.exercises.length) return [];

    const current = draft.exercises[exerciseIndex];
    const selectedIds = new Set(draft.exercises.map((ex) => ex.exerciseTemplateId));

    // Find exercises that target the same primary muscle group
    const alternatives = allExercises.filter((ex) => {
      if (selectedIds.has(ex.templateId) && ex.templateId !== current.exerciseTemplateId) {
        return false; // Already selected (and not the current one)
      }
      if (ex.templateId === current.exerciseTemplateId) {
        return false; // Same as current
      }
      if (ex.primaryMuscleGroup !== current.primaryMuscleGroup) {
        return false; // Different muscle group
      }
      return true;
    });

    return alternatives;
  };

  const handleSwapExercise = (exerciseIndex: number) => {
    const alternatives = findAlternatives(exerciseIndex);
    setSwapState({ exerciseIndex, alternatives });
  };

  const handleConfirmSwap = (newTemplateId: string) => {
    if (!draft || swapState.exerciseIndex === null) return;

    const newTemplate = allExercises.find((ex) => ex.templateId === newTemplateId);
    if (!newTemplate) return;

    const idx = swapState.exerciseIndex;

    // Keep the same sets/reps/weight, just swap the exercise
    const updated = draft.exercises.map((ex, i) =>
      i === idx
        ? {
            ...ex,
            exerciseTemplateId: newTemplateId,
            title: newTemplate.name,
            primaryMuscleGroup: newTemplate.primaryMuscleGroup,
          }
        : ex,
    );

    setDraft({ ...draft, exercises: updated });
    setSwapState({ exerciseIndex: null, alternatives: [] });
  };

  const handleUpdateExercise = (
    idx: number,
    key: keyof DraftWorkoutExercise,
    value: any,
  ) => {
    if (!draft) return;
    const updated = draft.exercises.map((ex, i) =>
      i === idx ? { ...ex, [key]: value } : ex,
    );
    setDraft({ ...draft, exercises: updated });
  };

  const handleAddExercise = (templateId: string) => {
    if (!draft) return;

    // Prevent adding the same exercise twice
    if (draft.exercises.some((ex) => ex.exerciseTemplateId === templateId)) {
      setError('This exercise is already in your draft');
      return;
    }

    const template = allExercises.find((ex) => ex.templateId === templateId);
    if (!template) return;

    const newExercise: DraftWorkoutExercise = {
      exerciseTemplateId: templateId,
      title: template.name,
      primaryMuscleGroup: template.primaryMuscleGroup,
      isNew: true,
      daysSinceTrained: null,
      sets: 3,
      targetRepsLow: 8,
      targetRepsHigh: 12,
      targetReps: 10,
      suggestedWeightKg: null,
    };

    setDraft({
      ...draft,
      exercises: [...draft.exercises, newExercise],
    });
    setError(null); // Clear any previous errors
  };

  const handlePreview = async () => {
    if (!draft) return;

    try {
      setLoading(true);
      const result = (await api.previewDraftPush(
        routineTitle,
        draft.exercises,
        settings.includeWarmup,
        settings.includeWarmupCooldown,
      )) as {
        previewToken: string;
        summaryLines: string[];
      };
      setPreviewToken(result.previewToken);
      setPreviewLines(result.summaryLines);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!draft || !previewToken) return;

    try {
      setConfirming(true);
      const result = (await api.confirmDraftPush(
        routineTitle,
        draft.exercises,
        previewToken,
        settings.includeWarmup,
        settings.includeWarmupCooldown,
      )) as { id: string; title: string };
      setConfirmedRoutine(result);
      setStep('confirmed');
    } catch (err: any) {
      setError(err.message);
      setStep('preview'); // Go back to preview on failure
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setDraft(null);
    setRoutineTitle('');
    setPreviewToken(null);
    setPreviewLines([]);
    setConfirmedRoutine(null);
    setError(null);
    setSwapState({ exerciseIndex: null, alternatives: [] });
    setStep('input');
  };

  // Input step
  if (step === 'input') {
    return (
      <div className="panel">
        <h2>Draft Workout</h2>
        {error && <ErrorBanner message={error} />}

        {/* Compact single-row layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Time input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Time</label>
            <input
              type="number"
              min="30"
              max="90"
              value={settings.minutesAvailable}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minutesAvailable: Math.max(30, Math.min(90, parseInt(e.target.value) || 45)),
                })
              }
              style={{
                width: '50px',
                padding: '5px 8px',
                borderRadius: '5px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 500,
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>min</span>
          </div>

          {/* Location toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Location</label>
            <div className="location-toggle">
              <button
                className={settings.location === 'home' ? 'active' : ''}
                onClick={() => setSettings({ ...settings, location: 'home' })}
              >
                Home
              </button>
              <button
                className={settings.location === 'gym' ? 'active' : ''}
                onClick={() => setSettings({ ...settings, location: 'gym' })}
              >
                Gym
              </button>
            </div>
          </div>

          {/* Options checkboxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={settings.includeWarmup}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    includeWarmup: e.target.checked,
                  })
                }
                style={{
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '12px' }}>Include warm-up sets</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={settings.includeCardio}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    includeCardio: e.target.checked,
                  })
                }
                style={{
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '12px' }}>Cardio</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={settings.includeWarmupCooldown}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    includeWarmupCooldown: e.target.checked,
                  })
                }
                style={{
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '12px' }}>Warmup/Cooldown</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    );
  }

  // Generated / Edit step
  if (step === 'generated' && draft) {
    return (
      <div className="panel">
        <h2>Draft Workout</h2>
        {error && <ErrorBanner message={error} />}

        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{draft.summary}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {draft.exercises.length} exercises • {draft.estimatedMinutes} min estimated
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-muted)' }}>
            EXERCISES
          </div>

          {draft.exercises.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              No exercises selected. Add one below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {draft.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{ex.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {ex.primaryMuscleGroup} {ex.isNew && '[NEW]'} {ex.daysSinceTrained !== null && `(${ex.daysSinceTrained}d ago)`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleSwapExercise(idx)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--text-muted)',
                          color: 'var(--text-muted)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Sets
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={ex.sets}
                        onChange={(e) => handleUpdateExercise(idx, 'sets', parseInt(e.target.value) || 1)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Reps
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={ex.targetReps}
                        onChange={(e) => handleUpdateExercise(idx, 'targetReps', parseInt(e.target.value) || 10)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Weight (kg)
                      </label>
                      {ex.suggestedWeightKg === null ? (
                        <div
                          style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '34px',
                          }}
                        >
                          Bodyweight
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ex.suggestedWeightKg}
                          onChange={(e) =>
                            handleUpdateExercise(idx, 'suggestedWeightKg', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text)',
                            fontSize: '13px',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {swapState.exerciseIndex !== null && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--accent)' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
                Choose alternative for <strong>{draft.exercises[swapState.exerciseIndex].title}</strong>:
              </div>
              {swapState.alternatives.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  No alternatives available for {draft.exercises[swapState.exerciseIndex].primaryMuscleGroup}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {swapState.alternatives.map((alt) => (
                    <button
                      key={alt.templateId}
                      onClick={() => handleConfirmSwap(alt.templateId)}
                      style={{
                        padding: '8px',
                        textAlign: 'left',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text)',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {alt.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({alt.primaryMuscleGroup})</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSwapState({ exerciseIndex: null, alternatives: [] })}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {allExercises.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddExercise(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <option value="">+ Add exercise</option>
              {allExercises.map((ex) => {
                const alreadySelected = draft.exercises.some((e) => e.exerciseTemplateId === ex.templateId);
                return (
                  <option key={ex.templateId} value={ex.templateId} disabled={alreadySelected}>
                    {ex.name} ({ex.primaryMuscleGroup})
                    {alreadySelected ? ' ✓' : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
            Routine title
          </label>
          <input
            type="text"
            value={routineTitle}
            onChange={(e) => setRoutineTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            onClick={handlePreview}
            disabled={loading || draft.exercises.length === 0}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: draft.exercises.length === 0 ? 'var(--border)' : 'var(--accent)',
              color: 'white',
              fontWeight: 500,
              cursor: draft.exercises.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Preview...' : 'Preview & Push'}
          </button>
        </div>
      </div>
    );
  }

  // Preview step
  if (step === 'preview') {
    return (
      <div className="panel">
        <h2>Preview</h2>
        {error && <ErrorBanner message={error} />}

        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '6px', fontSize: '13px', lineHeight: '1.6' }}>
          {previewLines.map((line, idx) => (
            <div key={idx} style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {line}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={() => setStep('generated')}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'white',
              fontWeight: 500,
              cursor: confirming ? 'not-allowed' : 'pointer',
              opacity: confirming ? 0.6 : 1,
            }}
          >
            {confirming ? 'Creating...' : 'Confirm & Create in Hevy'}
          </button>
        </div>
      </div>
    );
  }

  // Confirmed step
  if (step === 'confirmed' && confirmedRoutine) {
    return (
      <div className="panel">
        <h2>Success!</h2>

        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Created routine:</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{confirmedRoutine.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            ID: <code>{confirmedRoutine.id}</code>
          </div>
        </div>

        <button
          onClick={handleReset}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'white',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Generate Another
        </button>
      </div>
    );
  }

  return null;
}
