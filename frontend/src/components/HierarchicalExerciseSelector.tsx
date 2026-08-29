import { useMemo, useState } from 'react';
import type { ExerciseTemplate, DraftWorkoutExercise } from '../types.js';

interface Props {
  allExercises: ExerciseTemplate[];
  selectedExercises: DraftWorkoutExercise[];
  onSelectExercise: (templateId: string) => void;
}

// Categorize exercise by movement type based on title
function getMovementType(title: string): string {
  const lower = title.toLowerCase();
  if (/press|dip|push/i.test(lower)) return 'press';
  if (/row|pull|pulldown|lat/i.test(lower)) return 'row';
  if (/fly|pec deck|crossover/i.test(lower)) return 'fly';
  if (/curl|bicep/i.test(lower)) return 'curl';
  if (/extension|tricep|overhead/i.test(lower)) return 'extension';
  if (/raise|lateral|front/i.test(lower)) return 'raise';
  return 'other';
}

export default function HierarchicalExerciseSelector({ allExercises, selectedExercises, onSelectExercise }: Props) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedMovementType, setSelectedMovementType] = useState<string | null>(null);

  const selectedTemplateIds = useMemo(() => {
    return new Set(selectedExercises.map((ex) => ex.exerciseTemplateId));
  }, [selectedExercises]);

  // Group exercises by muscle group
  const muscleGroupMap = useMemo(() => {
    const map = new Map<string, ExerciseTemplate[]>();
    for (const ex of allExercises) {
      if (!ex.primaryMuscleGroup) continue;
      if (!map.has(ex.primaryMuscleGroup)) {
        map.set(ex.primaryMuscleGroup, []);
      }
      map.get(ex.primaryMuscleGroup)!.push(ex);
    }
    return map;
  }, [allExercises]);

  // Get sorted muscle groups
  const muscleGroups = useMemo(() => {
    return Array.from(muscleGroupMap.keys()).sort();
  }, [muscleGroupMap]);

  // Get movement types for selected muscle group
  const movementTypes = useMemo(() => {
    if (!selectedMuscleGroup) return [];
    const exercises = muscleGroupMap.get(selectedMuscleGroup) || [];
    const types = new Set(exercises.map((ex) => getMovementType(ex.name)));
    return Array.from(types).sort();
  }, [selectedMuscleGroup, muscleGroupMap]);

  // Get exercises for selected muscle group and movement type
  const filteredExercises = useMemo(() => {
    if (!selectedMuscleGroup) return [];
    const exercises = muscleGroupMap.get(selectedMuscleGroup) || [];
    if (!selectedMovementType) return [];
    return exercises
      .filter((ex) => getMovementType(ex.name) === selectedMovementType)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedMuscleGroup, selectedMovementType, muscleGroupMap]);

  const handleSelectExercise = (templateId: string) => {
    onSelectExercise(templateId);
    // Reset dropdowns after selection
    setSelectedMuscleGroup(null);
    setSelectedMovementType(null);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-muted)' }}>
        Add Exercise
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Level 1: Muscle Group */}
        <select
          value={selectedMuscleGroup || ''}
          onChange={(e) => {
            setSelectedMuscleGroup(e.target.value || null);
            setSelectedMovementType(null); // Reset movement type when muscle group changes
          }}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '13px',
          }}
        >
          <option value="">Select muscle group...</option>
          {muscleGroups.map((group) => (
            <option key={group} value={group}>
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </option>
          ))}
        </select>

        {/* Level 2: Movement Type */}
        {selectedMuscleGroup && (
          <select
            value={selectedMovementType || ''}
            onChange={(e) => setSelectedMovementType(e.target.value || null)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          >
            <option value="">Select movement type...</option>
            {movementTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        )}

        {/* Level 3: Exercise Name */}
        {selectedMovementType && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleSelectExercise(e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--bg)',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <option value="">+ Add exercise</option>
            {filteredExercises.map((ex) => {
              const isSelected = selectedTemplateIds.has(ex.templateId);
              return (
                <option key={ex.templateId} value={ex.templateId} disabled={isSelected}>
                  {ex.name}
                  {isSelected ? ' ✓' : ''}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Hint */}
      {selectedMuscleGroup && !selectedMovementType && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Select a movement type above
        </div>
      )}
      {selectedMuscleGroup && selectedMovementType && filteredExercises.length === 0 && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          No exercises available
        </div>
      )}
    </div>
  );
}
