import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';
const workoutId = '82b933f0-0c31-4082-a3fb-0f2c54743dc4'; // First Thursday workout from the list

async function testUpdate() {
  const apiKey = process.env.HEVY_API_KEY;
  if (!apiKey) {
    console.error('HEVY_API_KEY not set');
    process.exit(1);
  }

  // Test 1: Just title
  console.log('\n=== Test 1: Just title ===');
  let response = await fetch(`${HEVY_API_BASE}/workouts/${workoutId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({ title: 'Pecs Ed' }),
  });
  console.log(`Status: ${response.status}`);
  const body1 = await response.json();
  console.log(JSON.stringify(body1, null, 2));

  // Test 2: Try lowercase snake_case
  console.log('\n=== Test 2: snake_case fields ===');
  response = await fetch(`${HEVY_API_BASE}/workouts/${workoutId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      title: 'Pecs Ed',
      start_time: '2026-03-19T19:29:32.000Z',
      end_time: '2026-03-19T20:15:00.000Z'
    }),
  });
  console.log(`Status: ${response.status}`);
  const body2 = await response.json();
  console.log(JSON.stringify(body2, null, 2));

  // Test 3: Empty object
  console.log('\n=== Test 3: Empty object ===');
  response = await fetch(`${HEVY_API_BASE}/workouts/${workoutId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({}),
  });
  console.log(`Status: ${response.status}`);
  const body3 = await response.json();
  console.log(JSON.stringify(body3, null, 2));
}

testUpdate().catch(console.error);
