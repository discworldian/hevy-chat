import { useMemo, useState } from 'react';
import type { ExerciseTemplate, DraftWorkoutExercise } from '../types.js';
import { formatMuscleLabel } from '../utils/muscle.js';

interface Props {
  allExercises: ExerciseTemplate[];
  selectedExercises: DraftWorkoutExercise[];
  onSelectExercise?: (templateId: string) => void;
  onToggleExercise?: (templateId: string) => void;
  allowedMuscleGroups?: string[];
  initialMuscleGroup?: string;
  mode?: 'single' | 'multi';
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
  if (/squat/i.test(lower)) return 'squat';
  if (/deadlift|hinge|good morning/i.test(lower)) return 'deadlift';
  if (/lunge|split squat|step.?up/i.test(lower)) return 'lunge';
  if (/thrust|bridge/i.test(lower)) return 'thrust';
  if (/shrug/i.test(lower)) return 'shrug';
  if (/carry|farmer/i.test(lower)) return 'carry';
  return 'other';
}

export default function HierarchicalExerciseSelector({
  allExercises,
  selectedExercises,
  onSelectExercise,
  onToggleExercise,
  allowedMuscleGroups,
  initialMuscleGroup,
  mode = 'single',
}: Props) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(initialMuscleGroup || null);
  const [selectedMovementType, setSelectedMovementType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Get sorted muscle groups, filtered by allowedMuscleGroups if provided
  const muscleGroups = useMemo(() => {
    let groups = Array.from(muscleGroupMap.keys()).sort();
    if (allowedMuscleGroups && allowedMuscleGroups.length > 0) {
      groups = groups.filter((g) => allowedMuscleGroups.includes(g));
    }
    return groups;
  }, [muscleGroupMap, allowedMuscleGroups]);

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
    if (onSelectExercise) {
      onSelectExercise(templateId);
      // Reset dropdowns after selection in single mode
      if (mode === 'single') {
        setSelectedMuscleGroup(null);
        setSelectedMovementType(null);
      }
    }
  };

  const handleToggleExercise = (templateId: string) => {
    if (onToggleExercise) {
      onToggleExercise(templateId);
    }
  };

  // Search results when query is active
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allExercises
      .filter((ex) => ex.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, allExercises]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-muted)' }}>
        Add Exercise
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="Search exercises..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '12px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '13px',
        }}
      />

      {/* Show search results if query is active */}
      {searchQuery.trim() && searchResults.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Found {searchResults.length} exercise{searchResults.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {searchResults.map((ex) => (
              <button
                key={ex.templateId}
                onClick={() => {
                  handleSelectExercise(ex.templateId);
                  setSearchQuery('');
                }}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  backgroundColor: selectedTemplateIds.has(ex.templateId) ? 'var(--accent)' : 'var(--bg)',
                  color: selectedTemplateIds.has(ex.templateId) ? 'var(--accent-contrast)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
              {formatMuscleLabel(group)}
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
        {selectedMovementType && mode === 'single' && (
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

        {/* Level 3: Exercise Checkboxes (multi mode) */}
        {selectedMovementType && mode === 'multi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredExercises.map((ex) => {
              const isSelected = selectedTemplateIds.has(ex.templateId);
              return (
                <label
                  key={ex.templateId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--accent-faded)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleExercise(ex.templateId)}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span>{ex.name}</span>
                </label>
              );
            })}
          </div>
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
