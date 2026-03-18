import Dexie from 'dexie';

const db = new Dexie('WorkoutTrackerDB');

db.version(1).stores({
  exercises: 'id, name, category',
  sessions: 'id, date, startedAt, status',
  sets: 'id, sessionId, exerciseId, setNumber, completedAt',
});

// Add workoutType to sessions
db.version(2).stores({
  exercises: 'id, name, category',
  sessions: 'id, date, startedAt, status, workoutType',
  sets: 'id, sessionId, exerciseId, setNumber, completedAt',
});

// Add settings table for custom rotation etc.
db.version(3).stores({
  exercises: 'id, name, category',
  sessions: 'id, date, startedAt, status, workoutType',
  sets: 'id, sessionId, exerciseId, setNumber, completedAt',
  settings: 'key',
});

export default db;
