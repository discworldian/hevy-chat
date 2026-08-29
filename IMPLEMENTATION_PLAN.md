# Hevy Chat: Implementation Plan

This plan is intended to be executed by Claude Code against the existing codebase at `github.com/discworldian/hevy-chat`. Each section is a discrete unit of work. Dependencies between sections are noted.

---

## 1. Push/Pull/Legs Split System

### Context
The draft workout builder (`backend/src/analysis/draftWorkoutBuilder.ts`) currently selects exercises purely by muscle staleness. It has no concept of a training split. The user trains 3 days per week (never Thursday), using a Push/Pull/Legs split, but does not assign days to fixed calendar dates. They pick which split day to train at generation time.

### Changes

**Backend: `backend/src/analysis/splitDefinitions.ts` (new file)**
- Define a PPL split mapping:
  - **Push**: chest, shoulders, triceps
  - **Pull**: back, lats, upper_back, traps, biceps, forearms
  - **Legs**: quadriceps, glutes, hamstrings, calves, lower_back
- Core/abs are allowed on any day as accessories if time permits.
- Export a function `getMuscleGroupsForSplit(splitDay: 'push' | 'pull' | 'legs'): string[]` that returns the primary muscle groups for that day.

**Backend: modify `draftWorkoutBuilder.ts`**
- Add `splitDay: 'push' | 'pull' | 'legs'` as a required parameter to `buildDraftWorkout()`.
- Filter `rankedMuscles` to only include muscles belonging to the chosen split day.
- Maintain the existing staleness ranking within that filtered set.

**Frontend: modify `DraftWorkoutView.tsx`**
- Add a split day selector (three buttons: Push / Pull / Legs) to the input step, before the "Generate" button.
- Pass the selected split day through the API call.

**Backend: modify `routes/draftWorkout.ts`**
- Accept `splitDay` in the request body.
- Pass it through to `buildDraftWorkout()`.

**Frontend: modify `api.ts`**
- Update `generateDraftWorkout()` to accept and send `splitDay`.

---

## 2. Compound-First Exercise Ordering with Accessory Time Fill

### Context
Currently exercises are selected in muscle-staleness order with no distinction between compounds and accessories. The user wants 3-4 compound exercises first, then accessories to fill remaining time. The `isCompoundExercise()` function in `incrementTable.ts` already exists and uses a regex pattern.

### Changes

**Backend: modify `draftWorkoutBuilder.ts`**
- Restructure the exercise selection into two phases:
  1. **Compound phase**: From the split day's muscle groups, select 3-4 compound exercises (using `isCompoundExercise()`). These get 3 sets each at compound rest times. Prefer exercises the user has history with. Stop at 4 compounds or when compound candidates are exhausted.
  2. **Accessory phase**: With remaining time budget, fill with isolation/accessory exercises targeting the same split day muscles, prioritised by:
     - Muscles not yet covered by a compound's primary or secondary targets
     - Muscles with the highest staleness
     - Exercises the user has history with (prefer familiarity for tracking)
- Remove the existing "Phase 2: bonus sets" logic (distributing leftover time as extra sets). Replace with accessory fill.

---

## 3. Drop Sets as Time-Saving Measure on Accessories

### Context
Meta-analyses (Sødal et al. 2023, Sports Medicine - Open; Coleman et al. 2022, IJSC) show drop sets produce equivalent hypertrophy to traditional sets in significantly less time. However, they are not superior for maximal strength and carry higher perceived exertion. The user wants drop sets used as a time compression tool for accessories when the session is tight, not for compounds.

### Changes

**Backend: modify `draftWorkoutBuilder.ts`**
- After the accessory phase, if estimated time exceeds `minutesAvailable`, compress accessories:
  - Convert the last 1-2 accessory exercises from 3 traditional sets to 1 working set + 2 drop sets (Hevy set type `'dropset'`).
  - Reduce time estimate for drop set exercises: no rest between drops, so estimate ~1 min per drop set vs 2 min per traditional isolation set.
  - Never apply drop sets to compound exercises.
- Add a `useDropSets: boolean` field to `DraftWorkoutExercise` so the frontend can display it.

**Backend: modify `exerciseTimeEstimate.ts`**
- Add a `SECONDS_PER_SET.dropset` constant (e.g. 60 seconds: the set itself with no rest).

**Frontend: modify `DraftWorkoutView.tsx`**
- Display a visual indicator on exercises that have drop sets (e.g. a "DS" badge or label).
- In the preview, show the set structure (e.g. "1 working + 2 drop" instead of "3 sets").

**Backend: modify push service (`push/draftRoutineBuilder.ts`)**
- When building the Hevy routine payload, emit sets with `type: 'dropset'` for the drop set entries, using a reduced weight (e.g. 70% and 50% of working weight for the two drops).

---

## 4. Warm-Up Rounds Per Exercise

### Context
The user wants an optional warm-up set before working sets on a per-exercise basis. Standard warm-up protocol for compound lifts: one set at ~50% working weight for 8-10 reps. This is distinct from the global "Warmup" exercise (a general warm-up activity).

### Changes

**Backend: modify `DraftWorkoutExercise` interface (in `draftWorkoutBuilder.ts` and `frontend/src/types.ts`)**
- Add `includeWarmupSet: boolean` (default: `true` for compounds, `false` for accessories).
- Add `warmupWeightKg: number | null` (calculated as ~50% of `suggestedWeightKg`, rounded to nearest increment).
- Add `warmupReps: number` (default: 10).

**Backend: modify `draftWorkoutBuilder.ts`**
- For compound exercises, default `includeWarmupSet` to `true`.
- Calculate `warmupWeightKg` as 50% of suggested working weight, rounded via `roundToNearestIncrement()`.
- Add warm-up set time to the time budget: one extra set at isolation pace (~2 min including setup).

**Frontend: modify `DraftWorkoutView.tsx`**
- Show a toggle per exercise: "Warm-up set" on/off.
- When on, display the warm-up set details (weight, reps) above the working sets.
- Allow the user to override the warm-up weight.

**Backend: modify push service**
- When building the Hevy routine payload, prepend a set with `type: 'warmup'` for exercises that have `includeWarmupSet: true`.

---

## 5. 8-Week Training Cycle

### Context
The user wants compound exercises to stay fixed for 8 weeks to track progression, with accessories rotating every 2-4 weeks for variety. At the end of 8 weeks, a cycle report is generated. A version should exist for both home and gym.

### Changes

**Backend: `backend/src/analysis/cycleManager.ts` (new file)**
- Define a `TrainingCycle` interface:
  ```typescript
  interface TrainingCycle {
    id: string;
    startDate: string; // ISO date
    endDate: string | null; // null = active
    weekNumber: number; // 1-8, derived from startDate
    compoundExercises: Record<'push' | 'pull' | 'legs', string[]>; // template IDs
    accessoryRotationWeek: number; // tracks when accessories last rotated
  }
  ```
- Persist to `data/training_cycle.json`.
- `getCurrentCycle()`: returns active cycle, or prompts creation.
- `startNewCycle()`: archives current cycle, creates new one. Lets the user pick their compound exercises for each split day (or auto-suggest based on history).
- `getCycleWeekNumber()`: calculates current week (1-8) from start date.
- `shouldRotateAccessories()`: returns true if 2-4 weeks have passed since last rotation.

**Backend: modify `draftWorkoutBuilder.ts`**
- When selecting compounds, pull from the cycle's fixed compound list for the current split day.
- When selecting accessories, check if a rotation is due. If so, prefer exercises not used in the previous rotation block.
- Track which accessories were used in the current rotation window.

**Frontend: new component `CycleSetupView.tsx`**
- Shown when no active cycle exists, or when the user chooses to start a new cycle.
- For each split day, suggest 3-4 compound exercises based on history and equipment. User can swap/confirm.
- Confirm starts the 8-week cycle.

**Frontend: modify `App.tsx`**
- Add cycle awareness: if no active cycle, prompt setup before allowing draft generation.
- Show current cycle week number in the header or draft view.

---

## 6. Equipment Input UI

### Context
`EquipmentProfile` exists with a `home` array, but there is no UI to edit it. The `SettingsView` only has a "Refresh from Hevy" button. Gym equipment uses hardcoded defaults in `gymDefaults.ts` and the user is happy not editing those.

### Changes

**Frontend: modify `SettingsView.tsx`**
- Add a "Home Equipment" section.
- Fetch current equipment via `GET /api/equipment/home`.
- Display each item with name, type, weight range, and a delete button.
- Add an "Add equipment" form with fields: name, type (dropdown of existing types from `equipmentTypes.ts`), min/max weight, increment.
- Save via `PUT /api/equipment/home`.

**Backend: verify `routes/equipment.ts`**
- Ensure the GET and PUT routes work correctly (they likely already do based on the existing `equipmentProfile.ts` code).

---

## 7. Spider Graph: Weekly Muscle Group Comparison

### Context
The Charts tab (`ChartsView.tsx`) currently shows basic stats and top exercises by volume. The user wants a radar/spider chart comparing muscle group volume from last week vs this week. The Hevy API exercise templates include `primary_muscle_group` and `secondary_muscle_groups`.

### Changes

**Backend: new route `GET /api/analytics/muscle-volume-weekly`**
- Accepts optional `weeksBack` param (default: 2, for "this week" vs "last week").
- For each week, iterate all workouts in that week.
- For each exercise in each workout, look up the template to get primary and secondary muscle groups.
- Aggregate total volume (weight x reps) per muscle group per week.
- For secondary muscles, count at a reduced weight (e.g. 50% of set volume) to avoid over-counting.
- Return: `{ weeks: [{ weekLabel: string, muscleVolume: Record<string, number> }] }`.
- Use the Hevy muscle groups as axes: chest, shoulders, biceps, triceps, upper_back, lower_back, lats, forearms, abdominals, quadriceps, hamstrings, glutes, traps, calves.

**Frontend: modify `ChartsView.tsx`**
- Add a radar/spider chart section.
- Use a charting library already available (recharts via React artifact support, or render an SVG directly).
- Two overlapping polygons: "This week" (solid fill) vs "Last week" (outline/transparent).
- Normalise values so the chart is readable even if volume differs significantly between muscle groups.
- Label each axis with the muscle group name.

---

## 8. Per-Exercise Progress Charts

### Context
The user wants three visualisations per exercise within an 8-week cycle:
1. **Estimated 1RM trend**: line chart across sessions in the cycle.
2. **Best set volume per session**: line chart of (weight x reps) for the heaviest set each session.
3. **Rep performance heatmap**: grid with weeks as columns and sets as rows, colour-coded by target hit/miss/exceed.

### Changes

**Backend: new route `GET /api/analytics/exercise/:templateId/cycle-progress`**
- Accepts optional `cycleId` (defaults to current active cycle).
- Filters workouts within the cycle date range that include this exercise.
- For each session, compute:
  - Estimated 1RM (Epley, from best set)
  - Best set volume (weight x reps, top set only)
  - Per-set rep performance: for each working set, compare reps achieved vs target reps. Classify as `'hit'` (within range), `'exceeded'` (above range), `'missed'` (below range).
- Return: `{ sessions: [{ date, estimated1RM, bestSetVolume, sets: [{ reps, targetReps, weight, classification }] }] }`.

**Frontend: new component `ExerciseProgressPanel.tsx`**
- Shown when user taps an exercise in history or in the plan view.
- Three tabs or vertically stacked sections:
  1. **e1RM Trend**: line chart, x-axis = session date, y-axis = estimated 1RM in kg.
  2. **Best Set**: line chart, same x-axis, y-axis = weight x reps.
  3. **Rep Heatmap**: grid rendered as coloured cells. Green = exceeded, neutral = hit, red = missed. Weeks as columns, sets (1-5) as rows.
- Below the heatmap, show a motivational statement based on the data pattern:
  - All green in recent weeks: "You're crushing this. Time to go heavier."
  - Improving trend: "Steady climb. Progressive overload is working."
  - Mixed: "Consistency is the game. You showed up, and that matters."
  - After a deload: "Smart recovery. You'll come back stronger."

---

## 9. Cycle Report Screen

### Context
At the end of an 8-week cycle (or on demand), the user wants a summary view combining compound lift progress, muscle group volume changes, consistency metrics, and motivational content. The silly animal weight comparison feature already exists somewhere in the repo.

### Changes

**Frontend: new component `CycleReportView.tsx`**
- Accessible from the Charts tab or when a cycle ends.
- Sections:

  **9a. Compound Lift Summary Cards**
  - One card per compound exercise in the cycle.
  - Shows: exercise name, start weight, end weight, start e1RM, end e1RM, percentage change.
  - Colour-coded: green for improvement, amber for flat, red for regression.
  - Motivational line per card (e.g. "You added 5kg to your bench in 8 weeks").

  **9b. Muscle Group Volume Radar Chart**
  - Same spider chart as section 7, but comparing cycle start (weeks 1-2) vs cycle end (weeks 7-8).
  - Highlights which muscle groups grew in volume and which didn't.

  **9c. Consistency Score**
  - Planned sessions (3/week x 8 weeks = 24) vs actual sessions completed.
  - Display as a percentage and a visual bar.
  - Streak counter: longest run of consecutive planned sessions hit.

  **9d. Motivational Summary**
  - Auto-generated text combining the data:
    - Total volume lifted across the cycle.
    - Silly animal weight comparison (use existing feature).
    - Best PR of the cycle.
    - A line from exercise science context: e.g. "Progressive overload is the single most evidence-backed driver of strength gains. You just did 8 weeks of it."

**Backend: new route `GET /api/analytics/cycle-report`**
- Accepts optional `cycleId`.
- Aggregates all the data needed for the above sections from cached workouts filtered to the cycle date range.
- Returns a structured JSON payload matching the frontend sections.

---

## 10. Motivational Contextual Nudges in Draft View

### Context
The user wants motivational statements to appear when generating or viewing a draft workout. These should be contextual, based on real data, and occasionally reference exercise science.

### Changes

**Backend: new file `backend/src/analysis/motivationalNudges.ts`**
- A function `generateNudges(cycle, workouts, draftExercises)` that returns 1-3 short strings.
- Nudge types:
  - **PR proximity**: "You're 2.5kg away from your all-time bench PR."
  - **Cycle progress**: "Week 6 of 8. You've hit 85% of planned sessions."
  - **Volume trend**: "Your pulling volume is up 12% this cycle."
  - **Staleness alert**: "You haven't trained calves in 14 days."
  - **Science tidbit**: Rotating pool of short, cited statements. E.g. "Meta-analyses show consistent training beats any specific programme design (Schoenfeld 2016)."
  - **Animal weight**: Use existing silly weight feature. "Your squat 1RM is roughly one adult Labrador."
- Select 1-2 nudges per draft generation, prioritising PR proximity and cycle progress.
- Where possible, use links both to scientific and silly nudges.

**Frontend: modify `DraftWorkoutView.tsx`**
- Display nudges in a subtle banner above the exercise list in the generated view.
- Style them distinctly from error/warning banners.

---

## Implementation Order (suggested)

The sections have these dependencies:

1. **Section 1** (PPL split) - no dependencies, unlocks sections 2 and 5
2. **Section 6** (Equipment UI) - no dependencies, standalone
3. **Section 2** (Compound-first ordering) - depends on 1
4. **Section 4** (Warm-up rounds) - depends on 2 (needs to know which exercises are compounds)
5. **Section 3** (Drop sets) - depends on 2 (only applies to accessories)
6. **Section 5** (8-week cycle) - depends on 1 (needs split day concept)
7. **Section 7** (Spider graph) - depends on 5 loosely (can work without cycles, but better with)
8. **Section 8** (Per-exercise charts) - depends on 5 (cycle date range)
9. **Section 10** (Motivational nudges) - depends on 5 and 8
10. **Section 9** (Cycle report) - depends on 5, 7, 8, and 10. Do this last.

---

## Notes for Claude Code

- The backend is Express + TypeScript. All analysis logic is in `backend/src/analysis/`. Routes are in `backend/src/routes/`.
- The frontend is Vite + React + TypeScript. No component library; everything is inline-styled.
- Data is persisted as JSON files in `backend/data/` (gitignored). No database.
- The Hevy API client is in `backend/src/hevyClient.ts`. Exercise templates include `primary_muscle_group`, `secondary_muscle_groups`, and `equipment` fields.
- Set types in Hevy: `'warmup' | 'normal' | 'failure' | 'dropset'`. These are already defined in `hevyTypes.ts`.
- The existing `computeEstimated1RM()` uses the Epley formula. Reuse it.
- Time estimates: compound = 1min setup + 3min/set; isolation = 1min setup + 2min/set. These are in `exerciseTimeEstimate.ts`. Add dropset estimate there (~1min/set).
- The warm-up/stretching exercise placeholder IDs (`warmup-placeholder`, `cooldown-placeholder`) need to be resolved to real Hevy template IDs. This is a separate small task the user will handle with Claude Code.
- The existing progression logic in `progression.ts` is sound and should not be changed, only extended where cycle awareness is needed.
