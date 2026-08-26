import express from 'express';
import { getConfig, validateConfig } from './config.js';
import healthRouter from './routes/health.js';
import userRouter from './routes/user.js';
import workoutsRouter from './routes/workouts.js';
import exercisesRouter from './routes/exercises.js';
import planRouter from './routes/plan.js';
import analyticsRouter from './routes/analytics.js';
import equipmentRouter from './routes/equipment.js';
import pushRouter from './routes/push.js';
import draftWorkoutRouter from './routes/draftWorkout.js';
import settingsRouter from './routes/settings.js';
import type { HevyApiError } from './hevyClient.js';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/health', healthRouter);
app.use('/api/user', userRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/plan', planRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/push', pushRouter);
app.use('/api/draft-workout', draftWorkoutRouter);
app.use('/api/settings', settingsRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  const status = err.status || 500;
  const retryable = err.retryable !== false;

  res.status(status).json({
    error: err.message || 'Internal server error',
    retryable,
  });
});

// Startup
const config = getConfig();
const validation = validateConfig();

if (!validation.valid) {
  console.error('Configuration errors:');
  validation.errors.forEach((e) => console.error(`  - ${e}`));
  console.log('\nStarting server in degraded mode. Frontend can display setup screen.');
} else {
  console.log('Configuration valid. HEVY_API_KEY is set.');
}

const port = config.PORT;
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
  console.log(`API available at http://0.0.0.0:${port}/api/`);
});
