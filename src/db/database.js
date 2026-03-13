import Dexie from 'dexie';

const db = new Dexie('WorkoutTrackerDB');

db.version(1).stores({
  exercises: 'id, name, category',
  sessions: 'id, date, startedAt, status',
  sets: 'id, sessionId, exerciseId, setNumber, completedAt',
});

export default db;
