import { useEffect, useState } from 'react';
import * as api from '../api.js';
import { formatMuscleLabel } from '../utils/muscle.js';
import type { Workout, WorkoutAdvice } from '../types.js';
import ErrorBanner from './ErrorBanner.jsx';

const ANIMALS = [
  { name: 'Tardigrade', plural: 'Tardigrades', weight: 0.0000005, wiki: 'Tardigrade' },
  { name: 'Pipistrelle', plural: 'Pipistrelles', weight: 0.0055, wiki: 'Pipistrelle' },
  { name: 'Spotted Bat', plural: 'Spotted Bats', weight: 0.004, wiki: 'Spotted_bat' },
  { name: 'Little Brown Bat', plural: 'Little Brown Bats', weight: 0.009, wiki: 'Little_brown_bat' },
  { name: 'Greater Horseshoe Bat', plural: 'Greater Horseshoe Bats', weight: 0.011, wiki: 'Greater_horseshoe_bat' },
  { name: 'Mexican Free-tailed Bat', plural: 'Mexican Free-tailed Bats', weight: 0.012, wiki: 'Mexican_free-tailed_bat' },
  { name: 'Pallid Bat', plural: 'Pallid Bats', weight: 0.013, wiki: 'Pallid_bat' },
  { name: 'Big Brown Bat', plural: 'Big Brown Bats', weight: 0.016, wiki: 'Big_brown_bat' },
  { name: 'Natterer\'s Bat', plural: 'Natterer\'s Bats', weight: 0.007, wiki: 'Natterer\'s_bat' },
  { name: 'Common Vampire Bat', plural: 'Common Vampire Bats', weight: 0.04, wiki: 'Common_vampire_bat' },
  { name: 'Indian Flying Fox', plural: 'Indian Flying Foxes', weight: 1.6, wiki: 'Indian_flying_fox' },
  { name: 'Large Flying Fox', plural: 'Large Flying Foxes', weight: 1.2, wiki: 'Large_flying_fox' },
  { name: 'Ant', plural: 'Ants', weight: 0.001, wiki: 'Ant' },
  { name: 'Hummingbird', plural: 'Hummingbirds', weight: 0.005, wiki: 'Hummingbird' },
  { name: 'Mouse', plural: 'Mice', weight: 0.025, wiki: 'Mouse' },
  { name: 'Pigeon', plural: 'Pigeons', weight: 0.3, wiki: 'Pigeon' },
  { name: 'Platypus', plural: 'Platypuses', weight: 1.5, wiki: 'Platypus' },
  { name: 'Black-footed Cat', plural: 'Black-footed Cats', weight: 1.3, wiki: 'Black-footed_cat' },
  { name: 'Flat-headed Cat', plural: 'Flat-headed Cats', weight: 1.5, wiki: 'Flat-headed_cat' },
  { name: 'Rusty-spotted Cat', plural: 'Rusty-spotted Cats', weight: 1.3, wiki: 'Rusty-spotted_cat' },
  { name: 'Leopard Cat', plural: 'Leopard Cats', weight: 1.3, wiki: 'Leopard_cat' },
  { name: 'Guiña', plural: 'Guiñas', weight: 2.5, wiki: 'Guiña' },
  { name: 'Fishing Cat', plural: 'Fishing Cats', weight: 2.75, wiki: 'Fishing_cat' },
  { name: 'Kodkod', plural: 'Kodkods', weight: 3, wiki: 'Kodkod' },
  { name: 'Iriomote Cat', plural: 'Iriomote Cats', weight: 3, wiki: 'Iriomote_cat' },
  { name: 'Pampas Cat', plural: 'Pampas Cats', weight: 2.25, wiki: 'Pampas_cat' },
  { name: 'Margay', plural: 'Margays', weight: 2.6, wiki: 'Margay' },
  { name: 'Oncilla', plural: 'Oncillas', weight: 1.5, wiki: 'Oncilla' },
  { name: 'Bobcat', plural: 'Bobcats', weight: 9, wiki: 'Bobcat' },
  { name: 'Serval', plural: 'Servals', weight: 13, wiki: 'Serval' },
  { name: 'Caracal', plural: 'Caracals', weight: 20, wiki: 'Caracal' },
  { name: 'Clouded Leopard', plural: 'Clouded Leopards', weight: 23, wiki: 'Clouded_leopard' },
  { name: 'Snow Leopard', plural: 'Snow Leopards', weight: 45, wiki: 'Snow_leopard' },
  { name: 'Cheetah', plural: 'Cheetahs', weight: 75, wiki: 'Cheetah' },
  { name: 'Leopard', plural: 'Leopards', weight: 90, wiki: 'Leopard' },
  { name: 'Jaguar', plural: 'Jaguars', weight: 100, wiki: 'Jaguar' },
  { name: 'Cougar', plural: 'Cougars', weight: 100, wiki: 'Cougar' },
  { name: 'Ocelot', plural: 'Ocelots', weight: 1.5, wiki: 'Ocelot' },
  { name: 'Cat', plural: 'Cats', weight: 4.5, wiki: 'Cat' },
  { name: 'Golden Retriever', plural: 'Golden Retrievers', weight: 32, wiki: 'Golden_Retriever' },
  { name: 'Lion', plural: 'Lions', weight: 190, wiki: 'Lion' },
  { name: 'Tiger', plural: 'Tigers', weight: 260, wiki: 'Tiger' },
  { name: 'Horse', plural: 'Horses', weight: 500, wiki: 'Horse' },
  { name: 'Komodo Dragon', plural: 'Komodo Dragons', weight: 91, wiki: 'Komodo_dragon' },
  { name: 'Human (average)', plural: 'Humans (average)', weight: 70, wiki: 'Human' },
  { name: 'Moose', plural: 'Moose', weight: 700, wiki: 'Moose' },
  { name: 'Hippopotamus', plural: 'Hippopotamuses', weight: 1500, wiki: 'Hippopotamus' },
  { name: 'Giraffe', plural: 'Giraffes', weight: 1200, wiki: 'Giraffe' },
  { name: 'Saltwater Crocodile', plural: 'Saltwater Crocodiles', weight: 1000, wiki: 'Saltwater_crocodile' },
  { name: 'African Elephant', plural: 'African Elephants', weight: 6000, wiki: 'African_elephant' },
  { name: 'Sperm Whale', plural: 'Sperm Whales', weight: 41000, wiki: 'Sperm_whale' },
  { name: 'Blue Whale', plural: 'Blue Whales', weight: 150000, wiki: 'Blue_whale' },
  { name: 'Seahorse', plural: 'Seahorses', weight: 0.001, wiki: 'Seahorse' },
  { name: 'Betta Fish', plural: 'Betta Fish', weight: 0.003, wiki: 'Siamese_fighting_fish' },
  { name: 'Clownfish', plural: 'Clownfish', weight: 0.02, wiki: 'Clownfish' },
  { name: 'Goldfish', plural: 'Goldfish', weight: 0.05, wiki: 'Goldfish' },
  { name: 'Pufferfish', plural: 'Pufferfish', weight: 0.05, wiki: 'Pufferfish' },
  { name: 'Angelfish', plural: 'Angelfish', weight: 0.15, wiki: 'Angelfish' },
  { name: 'Rainbow Trout', plural: 'Rainbow Trout', weight: 0.5, wiki: 'Rainbow_trout' },
  { name: 'Salmon', plural: 'Salmon', weight: 5, wiki: 'Salmon' },
  { name: 'Tuna', plural: 'Tuna', weight: 100, wiki: 'Tuna' },
  { name: 'Great White Shark', plural: 'Great White Sharks', weight: 2000, wiki: 'Great_white_shark' },
  { name: 'Spanish Dancer Nudibranch', plural: 'Spanish Dancer Nudibranchs', weight: 0.01, wiki: 'Spanish_dancer' },
  { name: 'Blue Dragon Nudibranch', plural: 'Blue Dragon Nudibranchs', weight: 0.003, wiki: 'Glaucus_atlanticus' },
  { name: 'Sea Butterfly Nudibranch', plural: 'Sea Butterfly Nudibranchs', weight: 0.001, wiki: 'Pteropoda' },
  { name: 'Chromodoris Nudibranch', plural: 'Chromodoris Nudibranchs', weight: 0.008, wiki: 'Chromodoris' },
  { name: 'Nudibranch', plural: 'Nudibranchs', weight: 0.005, wiki: 'Nudibranch' },
  { name: 'Roseate Spoonbill', plural: 'Roseate Spoonbills', weight: 1.5, wiki: 'Roseate_spoonbill' },
  { name: 'Rhinoceros Hornbill', plural: 'Rhinoceros Hornbills', weight: 2.5, wiki: 'Rhinoceros_hornbill' },
  { name: 'Pileated Hornbill', plural: 'Pileated Hornbills', weight: 2, wiki: 'Pileated_hornbill' },
  { name: 'Helmeted Hornbill', plural: 'Helmeted Hornbills', weight: 2, wiki: 'Helmeted_hornbill' },
  { name: 'Hoatzin', plural: 'Hoatzins', weight: 0.6, wiki: 'Hoatzin' },
  { name: 'Secretary Bird', plural: 'Secretary Birds', weight: 3.5, wiki: 'Secretary_bird' },
  { name: 'Cassowary', plural: 'Cassowaries', weight: 60, wiki: 'Cassowary' },
  { name: 'Emu', plural: 'Emus', weight: 50, wiki: 'Emu' },
  { name: 'Kea', plural: 'Keas', weight: 0.8, wiki: 'Kea' },
  { name: 'Superb Bird of Paradise', plural: 'Superb Birds of Paradise', weight: 0.1, wiki: 'Superb_bird-of-paradise' },
  { name: 'Philippine Eagle', plural: 'Philippine Eagles', weight: 6, wiki: 'Philippine_eagle' },
  { name: 'Harpy Eagle', plural: 'Harpy Eagles', weight: 6.5, wiki: 'Harpy_eagle' },
  { name: 'Ostrich', plural: 'Ostriches', weight: 100, wiki: 'Ostrich' },
  { name: 'Hoary Puffbird', plural: 'Hoary Puffbirds', weight: 0.05, wiki: 'Hoary_puffbird' },
  { name: 'Puffin', plural: 'Puffins', weight: 0.4, wiki: 'Puffin' },
  { name: 'Lyrebird', plural: 'Lyrebirds', weight: 0.9, wiki: 'Lyrebird' },
  { name: 'Capybara', plural: 'Capybaras', weight: 50, wiki: 'Capybara' },
  { name: 'Sea Otter', plural: 'Sea Otters', weight: 35, wiki: 'Sea_otter' },
  { name: 'River Otter', plural: 'River Otters', weight: 5, wiki: 'Otter' },
  { name: 'Eurasian Otter', plural: 'Eurasian Otters', weight: 4, wiki: 'Eurasian_otter' },
  { name: 'Beaver', plural: 'Beavers', weight: 20, wiki: 'Beaver' },
];

function getAnimalComparison(weight: number) {
  const closest = ANIMALS.reduce((prev: any, curr: any) => {
    return Math.abs(curr.weight - weight) < Math.abs(prev.weight - weight) ? curr : prev;
  });
  return closest;
}


function getGroupColor(groupId: number | null, groupIdx: number) {
  if (groupId === null) return 'transparent';
  // Use groupId and index to generate a consistent but varied color
  const seed = (groupId + groupIdx * 7) % 12;
  const colors = [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#45B7D1', // blue
    '#FFA07A', // salmon
    '#98D8C8', // mint
    '#F7DC6F', // yellow
    '#BB8FCE', // purple
    '#85C1E2', // sky blue
    '#F8B88B', // peach
    '#A8D8EA', // light blue
    '#D5F4E6', // light green
    '#FADBD8', // light pink
  ];
  return colors[seed];
}

async function fetchAnimalData(animalWikiName: string): Promise<{ image: string | null; summary: string | null }> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(animalWikiName)}`,
    );
    const data = (await response.json()) as { thumbnail?: { source: string }; extract?: string };
    return {
      image: data.thumbnail?.source || null,
      summary: data.extract || null,
    };
  } catch {
    return { image: null, summary: null };
  }
}

function getRandomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}

interface Props {
  location: 'home' | 'gym';
}

export default function HistoryView({ location }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Fetching your workouts...');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'exercises' | 'stats' | 'advice'>('exercises');
  const [animalData, setAnimalData] = useState<Record<string, { image: string | null; summary: string | null }>>({});
  const [workoutAnimals, setWorkoutAnimals] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [workoutAdvice, setWorkoutAdvice] = useState<Record<string, WorkoutAdvice>>({});
  const [loadingAdvice, setLoadingAdvice] = useState<Record<string, boolean>>({});
  const [muscleGroupMap, setMuscleGroupMap] = useState<Record<string, string | null>>({});
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [sessionMuscleFilter, setSessionMuscleFilter] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus('Fetching your workouts...');
      try {
        const data = (await api.getWorkouts()) as { workouts: Workout[]; totalCount?: number };
        setWorkouts((data.workouts || []).reverse()); // Show newest first
        setStatus('');
        if ((data.workouts || []).length === 0) {
          setStatus('No workouts cached yet. Refresh in settings to fetch from Hevy.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = (await api.getExercises()) as { exercises: any[] };
        const map: Record<string, string | null> = {};
        (data.exercises || []).forEach((t: any) => {
          map[t.templateId] = t.primaryMuscleGroup;
        });
        setMuscleGroupMap(map);
      } catch (err) {
        // silently fail — muscle group filtering is optional
      }
    };
    loadTemplates();
  }, []);

  if (error) return <ErrorBanner message={error} />;

  const isExpanded = (id: string) => expandedId === id;

  const fetchWorkoutAdvice = async (workoutId: string) => {
    if (workoutAdvice[workoutId] || loadingAdvice[workoutId]) return;

    setLoadingAdvice((prev: Record<string, boolean>) => ({ ...prev, [workoutId]: true }));
    try {
      const advice = (await api.getWorkoutAdvice(workoutId)) as WorkoutAdvice;
      setWorkoutAdvice((prev: Record<string, WorkoutAdvice>) => ({ ...prev, [workoutId]: advice }));
    } catch (err) {
      console.error('Failed to load advice:', err);
    } finally {
      setLoadingAdvice((prev: Record<string, boolean>) => ({ ...prev, [workoutId]: false }));
    }
  };

  // Derive all available muscle groups
  const allMuscleGroups = Array.from(
    new Set(
      Object.values(muscleGroupMap)
        .filter((m): m is string => m !== null)
    )
  ).sort();

  // Filter and sort workouts
  const filteredWorkouts = workouts.filter((w) => {
    // Search filter (title and date)
    const dateStr = new Date(w.start_time).toLocaleDateString();
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dateStr.includes(searchQuery);

    // Date filter
    if (dateFilter) {
      const workoutDate = new Date(w.start_time).toISOString().split('T')[0];
      if (!matchesSearch || workoutDate !== dateFilter) {
        return false;
      }
    } else if (!matchesSearch) {
      return false;
    }

    // Muscle group filter
    if (selectedMuscleGroups.length > 0) {
      const hasSelectedMuscle = w.exercises.some((ex: any) => {
        const muscleGroup = muscleGroupMap[ex.exercise_template_id];
        return selectedMuscleGroups.includes(muscleGroup as string);
      });
      return hasSelectedMuscle;
    }

    return true;
  });

  // Sort
  const sorted = [...filteredWorkouts].sort((a, b) => {
    const aTime = new Date(a.start_time).getTime();
    const bTime = new Date(b.start_time).getTime();
    return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
  });

  return (
    <div className="panel">
      <h2>Workout History</h2>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px' }}>
          <div className="spinner" />
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{status}</div>
        </div>
      ) : workouts.length === 0 ? (
        <div className="empty-state">
          {status || 'No workouts yet. Go log some sessions in Hevy!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search and Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search by name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '14px',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sort
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                  style={{
                    padding: '6px 8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Muscle Group
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {allMuscleGroups.map((muscle) => (
                  <button
                    key={muscle}
                    onClick={() => {
                      setSelectedMuscleGroups((prev) =>
                        prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                      );
                    }}
                    style={{
                      padding: '4px 10px',
                      background: selectedMuscleGroups.includes(muscle) ? 'var(--accent)' : 'var(--bg)',
                      color: selectedMuscleGroups.includes(muscle) ? 'var(--accent-contrast)' : 'var(--text)',
                      border: `1px solid ${selectedMuscleGroups.includes(muscle) ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {formatMuscleLabel(muscle)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {sorted.length} of {workouts.length} workouts
          </div>
          {sorted.length === 0 && (
            <div className="empty-state">
              No workouts match your filters.
            </div>
          )}
          {sorted.map((w) => (
            <div
              key={w.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'var(--panel-bg)',
              }}
            >
              {/* Accordion Header */}
              <button
                onClick={() => {
                  setExpandedId(isExpanded(w.id) ? null : w.id);
                  setSessionMuscleFilter([]);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{w.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(w.start_time).toLocaleDateString()} • {w.exercises.length} exercises
                  </div>
                </div>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                  {isExpanded(w.id) ? '▼' : '▶'}
                </span>
              </button>

              {/* Expanded Content */}
              {isExpanded(w.id) && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                    {(['exercises', 'stats', 'advice'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          background: activeTab === tab ? 'var(--accent)' : 'transparent',
                          color: activeTab === tab ? 'var(--accent-contrast)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: activeTab === tab ? 600 : 400,
                        }}
                      >
                        {tab === 'exercises' && 'Exercises'}
                        {tab === 'stats' && 'Stats'}
                        {tab === 'advice' && 'Advice'}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'exercises' && (() => {
                    const getRPEColor = (rpe: number | undefined) => {
                      if (!rpe) return 'transparent';
                      const normalized = Math.max(6, Math.min(10, rpe));
                      const ratio = (normalized - 6) / 4;
                      const hue = 120 - ratio * 120;
                      return `hsl(${hue}, 85%, 45%)`;
                    };

                    // Group consecutive exercises by superset_id
                    const groupedExercises: { supersetId: number | null; exercises: (typeof w.exercises) }[] = [];
                    let currentGroup: { supersetId: number | null; exercises: (typeof w.exercises) } | null = null;

                    w.exercises.forEach((ex) => {
                      // If this exercise belongs to the same superset as the current group, add it
                      if (currentGroup && currentGroup.supersetId === ex.superset_id && ex.superset_id !== null) {
                        currentGroup.exercises.push(ex);
                      } else {
                        // Start a new group
                        if (currentGroup) {
                          groupedExercises.push(currentGroup);
                        }
                        currentGroup = { supersetId: ex.superset_id, exercises: [ex] };
                      }
                    });

                    // Push the last group
                    if (currentGroup) {
                      groupedExercises.push(currentGroup);
                    }

                    // Compute session-scoped muscle groups
                    const sessionMuscleGroups = Array.from(
                      new Set(
                        w.exercises
                          .map((ex: any) => muscleGroupMap[ex.exercise_template_id])
                          .filter((m): m is string => m !== null && m !== undefined)
                      )
                    ).sort();

                    // Filter groups based on session muscle filter
                    const visibleGroups = groupedExercises
                      .map((group) => ({
                        ...group,
                        exercises: group.exercises.filter((ex: any) => {
                          if (sessionMuscleFilter.length === 0) return true;
                          const muscleGroup = muscleGroupMap[ex.exercise_template_id];
                          return sessionMuscleFilter.includes(muscleGroup as string);
                        }),
                      }))
                      .filter((group) => group.exercises.length > 0);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Session-scoped muscle filter */}
                        {sessionMuscleGroups.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Filter by Muscle
                            </label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {sessionMuscleGroups.map((muscle) => (
                                <button
                                  key={muscle}
                                  onClick={() => {
                                    setSessionMuscleFilter((prev) =>
                                      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                                    );
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    background: sessionMuscleFilter.includes(muscle) ? 'var(--accent)' : 'var(--bg)',
                                    color: sessionMuscleFilter.includes(muscle) ? 'var(--accent-contrast)' : 'var(--text)',
                                    border: `1px solid ${sessionMuscleFilter.includes(muscle) ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {formatMuscleLabel(muscle)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {visibleGroups.length === 0 && sessionMuscleFilter.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px' }}>
                            No exercises match the selected muscle group.
                          </div>
                        )}

                        {visibleGroups.map((group, groupIdx) => {
                          const isGrouped = group.supersetId !== null && group.exercises.length > 1;
                          const isCircuit = isGrouped && group.exercises.length >= 3;
                          const isSuperset = isGrouped && group.exercises.length === 2;
                          const labelText = isCircuit ? 'Circuit' : isSuperset ? 'Superset' : '';

                          const borderColor = getGroupColor(group.supersetId, groupIdx);

                          return (
                            <div
                              key={`group-${group.supersetId}-${groupIdx}`}
                              style={{
                                borderLeft: isGrouped ? `4px solid ${borderColor}` : 'none',
                                paddingLeft: isGrouped ? '12px' : '0px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              {isGrouped && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: borderColor,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    padding: '4px 0',
                                  }}
                                >
                                  ◆ {labelText}
                                </div>
                              )}
                              {group.exercises.map((ex: any) => {
                                const nonWarmupSets = ex.sets.filter((s: any) => s.type !== 'warmup');
                                const setsWithRPE = nonWarmupSets.filter((s: any) => s.rpe);
                                const avgRPE = setsWithRPE.length > 0
                                  ? (Math.round((setsWithRPE.reduce((sum: any, s: any) => sum + (s.rpe || 0), 0) / setsWithRPE.length) * 10) / 10).toFixed(1)
                                  : null;

                                const maxReps = Math.max(...nonWarmupSets.map((s: any) => s.reps || 0), 1);

                                return (
                                  <div
                                    key={ex.exercise_template_id}
                                    style={{
                                      padding: '12px',
                                      background: 'var(--bg)',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-end',
                                      gap: '12px',
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{ex.title}</div>
                                      {muscleGroupMap[ex.exercise_template_id] && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', fontWeight: 500 }}>
                                          {formatMuscleLabel(muscleGroupMap[ex.exercise_template_id] as string)}
                                        </div>
                                      )}
                                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {nonWarmupSets.length} sets •{' '}
                                        {nonWarmupSets
                                          .filter((s: any) => s.reps)
                                          .map((s: any) => `${s.reps}`)
                                          .join(', ')} reps •{' '}
                                        {ex.sets.find((s: any) => s.weight_kg)?.weight_kg}kg
                                        {avgRPE && <span> • RPE: {avgRPE}</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', flexShrink: 0, minHeight: '36px' }}>
                                      {nonWarmupSets.map((set: any, idx: any) => {
                                        const heightPercent = set.reps ? (set.reps / maxReps) * 100 : 50;
                                        const minHeight = 8;
                                        const maxHeight = 36;
                                        const height = minHeight + (heightPercent / 100) * (maxHeight - minHeight);

                                        return (
                                          <div
                                            key={idx}
                                            style={{
                                              width: '14px',
                                              height: `${height}px`,
                                              background: getRPEColor(set.rpe),
                                              borderRadius: '2px',
                                              border: '1px solid var(--border)',
                                              opacity: set.rpe ? 1 : 0.2,
                                              cursor: 'help',
                                              transition: 'all 0.2s ease',
                                            }}
                                            title={`${set.reps || 0} reps${set.rpe ? ` • RPE ${set.rpe}` : ''}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {activeTab === 'stats' && (() => {
                    const duration = Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000);
                    const totalVolume = w.exercises.reduce((sum: any, ex: any) => {
                      return sum + ex.sets.reduce((exSum: any, set: any) => {
                        if (set.type !== 'warmup' && set.weight_kg && set.reps) {
                          return exSum + set.weight_kg * set.reps;
                        }
                        return exSum;
                      }, 0);
                    }, 0);
                    const heaviest = Math.max(
                      ...w.exercises.flatMap((ex: any) =>
                        ex.sets.filter((s: any) => s.type !== 'warmup').map((s: any) => s.weight_kg || 0),
                      ),
                    );
                    const avgRpe = (() => {
                      const rpes = w.exercises
                        .flatMap((ex: any) => ex.sets.filter((s: any) => s.type !== 'warmup' && s.rpe))
                        .map((s: any) => s.rpe);
                      return rpes.length > 0 ? (Math.round((rpes.reduce((a: any, b: any) => a + b, 0) / rpes.length) * 10) / 10).toFixed(1) : null;
                    })();

                    // Get or create a random animal for this workout (min 2x multiplier)
                    let animal = workoutAnimals[w.id] ? ANIMALS.find((a) => a.wiki === workoutAnimals[w.id]) : null;
                    if (!animal) {
                      // Find animals with multiplier >= 2
                      const validAnimals = ANIMALS.filter((a) => Math.round(totalVolume / a.weight) >= 2);
                      animal = validAnimals.length > 0 ? validAnimals[Math.floor(Math.random() * validAnimals.length)] : ANIMALS[0];
                      setWorkoutAnimals((prev) => ({ ...prev, [w.id]: animal!.wiki }));
                    }

                    const multiplier = Math.round(totalVolume / animal.weight);
                    const data = animalData[animal.wiki];

                    // Fetch data if not cached
                    if (!data) {
                      fetchAnimalData(animal.wiki).then((result) => {
                        setAnimalData((prev) => ({ ...prev, [animal!.wiki]: result }));
                      });
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', flex: '0 1 auto' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{duration}m</div>
                          </div>
                          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', flex: '0 1 auto' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{Math.round(totalVolume)}kg</div>
                          </div>
                          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', flex: '0 1 auto' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Heaviest</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{heaviest}kg</div>
                          </div>
                          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', flex: '0 1 auto' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exercises</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{w.exercises.length}</div>
                          </div>
                          {avgRpe && (
                            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '4px', flex: '0 1 auto' }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg RPE</div>
                              <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{avgRpe}</div>
                            </div>
                          )}
                        </div>

                        {/* Animal Comparison */}
                        <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>You lifted the weight of...</div>
                          <a
                            href={`https://en.wikipedia.org/wiki/${animal.wiki}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '18px',
                              fontWeight: 600,
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              marginTop: '8px',
                              display: 'block',
                            }}
                          >
                            {multiplier.toLocaleString()} {multiplier === 1 ? animal.name : animal.plural} 🔗
                          </a>
                          {data && (data.image || data.summary) && (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '160px 1fr',
                                gap: '12px',
                                marginTop: '12px',
                                alignItems: 'start',
                              }}
                            >
                              {data.image && (
                                <img
                                  src={data.image}
                                  alt={animal.name}
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '6px',
                                    objectFit: 'cover',
                                    aspectRatio: '1',
                                  }}
                                />
                              )}
                              {data.summary && (
                                <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--text)' }}>
                                  {data.summary}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {activeTab === 'advice' && (() => {
                    const advice = workoutAdvice[w.id];

                    // Trigger fetch on first view
                    if (!advice && !loadingAdvice[w.id]) {
                      fetchWorkoutAdvice(w.id);
                    }

                    if (loadingAdvice[w.id]) {
                      return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading advice...</div>;
                    }

                    if (!advice) {
                      return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading advice...</div>;
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Session Context */}
                        <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '4px', fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                            <strong>Session:</strong> {advice.sessionContext.durationMinutes}m • {advice.sessionContext.timeOfDay} • duration{' '}
                            {advice.sessionContext.durationVsAverage.replace(/_/g, ' ')}
                          </div>
                          <div style={{ color: 'var(--text-muted)' }}>
                            <strong>Frequency:</strong> {advice.frequencyStatus.actualPerWeek.toFixed(1)}/{advice.frequencyStatus.targetPerWeek}x per week
                            {advice.frequencyStatus.belowTarget && ' (below target)'}
                          </div>
                        </div>

                        {/* Exercise Advice */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {advice.exercises.map((ex) => (
                            <div key={ex.exerciseTemplateId} style={{ padding: '8px', background: 'var(--bg)', borderRadius: '4px', fontSize: '12px' }}>
                              <div style={{ fontWeight: 500, marginBottom: '4px' }}>{ex.title}</div>
                              {ex.suggestion ? (
                                <>
                                  <div style={{ color: 'var(--accent)', marginBottom: '2px' }}>{ex.suggestion.verdict}</div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                                    {ex.suggestion.prType && (
                                      <span style={{ color: 'var(--ok)', marginRight: '8px' }}>🏆 {ex.suggestion.prType === 'weight' ? 'Weight PR' : ex.suggestion.prType === 'reps' ? 'Rep PR' : '1RM PR'}</span>
                                    )}
                                  </div>
                                  {ex.suggestion.plateauWarning && (
                                    <div style={{ color: 'var(--warning)', fontSize: '11px', marginBottom: '4px', fontWeight: 500 }}>
                                      ⚠️ {ex.suggestion.structuralSuggestion?.rationale || 'Deload recommended'}
                                    </div>
                                  )}
                                  <div style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                    Next: {ex.suggestion.action === 'increase_weight' ? '↑' : ex.suggestion.action === 'increase_reps' ? '↑' : '='}{' '}
                                    {ex.suggestion.nextWeightKg}kg x{ex.suggestion.nextTargetReps}
                                  </div>
                                </>
                              ) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                  {ex.status === 'insufficient_data' && 'Need more sessions'}
                                  {ex.status === 'cardio' && 'Cardio exercise'}
                                  {ex.status === 'unavailable' && 'Equipment unavailable'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
