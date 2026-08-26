import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getWorkout } from '../src/hevyClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function inspectWorkout() {
  try {
    const workoutId = '82b933f0-0c31-4082-a3fb-0f2c54743dc4';
    console.log(`Fetching workout ${workoutId}...`);
    const workout = await getWorkout(workoutId);

    console.log('\n=== Full Workout Object ===');
    console.log(JSON.stringify(workout, null, 2));

    console.log('\n=== Object Keys ===');
    console.log(Object.keys(workout));

    console.log('\n=== Trying to update with exact keys from response ===');
    // Try updating with each individual key
    const keysToTry = Object.keys(workout);

    const apiKey = process.env.HEVY_API_KEY;
    if (!apiKey) {
      console.error('HEVY_API_KEY not set');
      return;
    }

    for (const key of keysToTry.slice(0, 3)) {
      const payload: any = {};
      payload[key] = (workout as any)[key];

      console.log(`\nTrying with key "${key}":`, JSON.stringify(payload));

      const response = await fetch(`https://api.hevyapp.com/v1/workouts/${workoutId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      console.log(`  Status: ${response.status}`);
      const result = await response.json();
      if (response.status !== 200) {
        console.log(`  Error: ${result.error || JSON.stringify(result)}`);
      } else {
        console.log(`  Success!`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectWorkout();
