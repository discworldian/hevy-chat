import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function checkSwagger() {
  try {
    console.log('Fetching Hevy API swagger spec...');
    const response = await fetch('https://api.hevyapp.com/docs/openapi.json');
    if (!response.ok) {
      console.log(`Status: ${response.status}, trying alternate swagger endpoint`);
      const response2 = await fetch('https://api.hevyapp.com/swagger.json');
      if (!response2.ok) {
        console.log(`Alternate also failed: ${response2.status}`);
        console.log('Trying to access /docs endpoint...');
        const response3 = await fetch('https://api.hevyapp.com/docs');
        console.log(`/docs status: ${response3.status}`);
        return;
      }
      const spec = await response2.json();
      console.log(JSON.stringify(spec, null, 2).substring(0, 3000));
      return;
    }

    const spec = await response.json() as any;

    // Find workout update endpoint
    if (spec.paths && spec.paths['/workouts/{workoutId}']) {
      console.log('\n=== Workout Update Endpoint ===');
      const workoutPath = spec.paths['/workouts/{workoutId}'];
      if (workoutPath.put) {
        console.log(JSON.stringify(workoutPath.put, null, 2));
      }
    }

    // List all available paths
    if (spec.paths) {
      console.log('\n=== Available Endpoints ===');
      Object.keys(spec.paths)
        .filter(p => p.includes('workout'))
        .forEach(path => {
          console.log(`  ${path}:`, Object.keys(spec.paths[path]).join(', '));
        });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSwagger();
