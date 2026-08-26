import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { listWorkouts, updateWorkout, getWorkoutsCount, getWorkout } from '../src/hevyClient.js';
import type { Workout } from '../src/hevyTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateThursdayWorkouts() {
  try {
    console.log('Fetching workouts...');

    const count = await getWorkoutsCount();
    console.log(`Found ${count} total workouts`);

    const pageSize = 10;
    const pages = Math.ceil(count / pageSize);
    const allWorkouts: Workout[] = [];

    console.log(`Fetching ${pages} pages of workouts...`);

    for (let page = 1; page <= pages; page++) {
      const pageWorkouts = await listWorkouts(page, pageSize);
      allWorkouts.push(...pageWorkouts);
      console.log(`  ✓ Fetched page ${page}/${pages} (${allWorkouts.length} total)`);
    }

    console.log(`Loaded ${allWorkouts.length} workouts`);

    const thursdayEvening = allWorkouts.filter((workout) => {
      const date = new Date(workout.start_time);
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 4 = Thursday
      const hour = date.getUTCHours();

      // Thursday (4) and hour is 19 (around 7:30 PM)
      return dayOfWeek === 4 && (hour === 19 || hour === 20);
    });

    console.log(`\nFound ${thursdayEvening.length} Thursday evening workouts:`);
    thursdayEvening.forEach((w) => {
      const date = new Date(w.start_time);
      console.log(`  - ${w.id}: ${w.title} at ${date.toISOString()}`);
    });

    if (thursdayEvening.length === 0) {
      console.log('No Thursday evening workouts found.');
      return;
    }

    console.log(`\nUpdating ${thursdayEvening.length} workouts to "Pecs Ed"...`);

    for (let i = 0; i < thursdayEvening.length; i++) {
      const workout = thursdayEvening[i];
      try {
        const fullWorkout = await getWorkout(workout.id);
        await updateWorkout(workout.id, {
          title: 'Pecs Ed',
          startTime: fullWorkout.start_time,
          endTime: fullWorkout.end_time,
          description: fullWorkout.description,
          exercises: fullWorkout.exercises,
        });
        console.log(`✓ Updated: ${workout.id}`);
      } catch (err: any) {
        console.error(`Failed to update ${workout.id}:`, err.message);
      }
      // Add delay between requests to avoid rate limiting
      if (i < thursdayEvening.length - 1) {
        await sleep(500);
      }
    }

    console.log('\nDone! All Thursday evening workouts updated to "Pecs Ed"');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateThursdayWorkouts();
