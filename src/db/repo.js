import db from './database.js';

// --- Workout Rotation ---

export const WORKOUT_ROTATION = [
  'Chest',
  'Shoulders',
  'Deadlift',
  'Abs',
  'Back',
  'Squat',
  'Arms',
];

export async function getNextWorkoutType() {
  // Find the last completed session to determine next workout type
  const sessions = await db.sessions
    .orderBy('startedAt')
    .reverse()
    .limit(20)
    .toArray();

  const lastCompleted = sessions.find((s) => s.status === 'completed' && s.workoutType !== undefined);

  if (!lastCompleted) {
    return 0; // Start with 가슴
  }

  return (lastCompleted.workoutType + 1) % WORKOUT_ROTATION.length;
}

// --- Sessions ---

export async function createSession(date, overrideWorkoutType) {
  const workoutType = overrideWorkoutType !== undefined ? overrideWorkoutType : await getNextWorkoutType();
  const session = {
    id: crypto.randomUUID(),
    date,
    startedAt: Date.now(),
    finishedAt: null,
    status: 'active',
    workoutType,
  };
  await db.sessions.add(session);
  return session;
}

export async function finishSession(sessionId) {
  await db.sessions.update(sessionId, {
    finishedAt: Date.now(),
    status: 'completed',
  });
}

export async function getSession(sessionId) {
  return db.sessions.get(sessionId);
}

export async function getSessionsByDate(date) {
  return db.sessions.where('date').equals(date).toArray();
}

export async function getRecentSessions(limit = 30) {
  return db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
}

// --- Sets ---

export async function addSet(sessionId, exerciseId, setNumber, weight, reps) {
  const set = {
    id: crypto.randomUUID(),
    sessionId,
    exerciseId,
    setNumber,
    weight,
    reps,
    completedAt: Date.now(),
  };
  await db.sets.add(set);
  return set;
}

export async function updateSet(setId, { weight, reps }) {
  const updates = {};
  if (weight !== undefined) updates.weight = weight;
  if (reps !== undefined) updates.reps = reps;
  await db.sets.update(setId, updates);
}

export async function deleteSet(setId) {
  await db.sets.delete(setId);
}

export async function getSetsBySession(sessionId) {
  return db.sets.where('sessionId').equals(sessionId).toArray();
}

// --- Exercises ---

export async function getAllExercises() {
  return db.exercises.toArray();
}

export async function getExercisesByCategory(category) {
  return db.exercises.where('category').equals(category).toArray();
}

// --- Stats ---

export async function getSessionStats(sessionId) {
  const sets = await getSetsBySession(sessionId);

  const totalSets = sets.length;
  const maxWeight = sets.reduce((max, s) => Math.max(max, s.weight || 0), 0);

  return {
    totalSets,
    maxWeight,
  };
}

export async function getWeeklySummary() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const mondayStr = formatDate(monday);
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 6);
  const sundayStr = formatDate(sundayEnd);

  const sessions = await db.sessions
    .where('date')
    .between(mondayStr, sundayStr, true, true)
    .toArray();

  const dates = [...new Set(sessions.map((s) => s.date))].sort();
  return { dates, sessionCount: sessions.length };
}

export async function getMonthlySummary(year, month) {
  const firstDay = formatDate(new Date(year, month, 1));
  const lastDay = formatDate(new Date(year, month + 1, 0));

  const sessions = await db.sessions
    .where('date')
    .between(firstDay, lastDay, true, true)
    .toArray();

  const dates = [...new Set(sessions.filter(s => s.status === 'completed').map(s => s.date))];
  return { dates, sessionCount: dates.length };
}

export async function getWeeklyAverage() {
  const allSessions = await db.sessions
    .where('status')
    .equals('completed')
    .toArray();

  if (allSessions.length === 0) return null;

  const dates = allSessions.map(s => new Date(s.date + 'T00:00:00').getTime());
  const earliest = Math.min(...dates);
  const now = Date.now();
  const weeks = Math.max((now - earliest) / (7 * 24 * 60 * 60 * 1000), 1);
  const avg = allSessions.length / weeks;

  return Math.round(avg * 10) / 10;
}

export async function getExerciseHistory(exerciseId, limit = 10) {
  const sets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
  const sessions = await Promise.all(
    sessionIds.map((id) => db.sessions.get(id)),
  );

  const sessionMap = new Map();
  for (const session of sessions) {
    if (session) sessionMap.set(session.id, session);
  }

  const grouped = [];
  for (const sid of sessionIds) {
    const session = sessionMap.get(sid);
    if (!session) continue;
    const sessionSets = sets
      .filter((s) => s.sessionId === sid)
      .sort((a, b) => a.setNumber - b.setNumber);
    grouped.push({ date: session.date, sets: sessionSets });
  }

  grouped.sort((a, b) => b.date.localeCompare(a.date));
  return grouped.slice(0, limit);
}

export async function getDayStats(date) {
  const sessions = await db.sessions.where('date').equals(date).toArray();
  const completed = sessions.filter(s => s.status === 'completed');
  if (completed.length === 0) return null;

  let totalDuration = 0;
  let maxWeight = 0;
  let maxWeightReps = 0;

  for (const session of completed) {
    if (session.startedAt && session.finishedAt) {
      totalDuration += session.finishedAt - session.startedAt;
    }
    const sets = await getSetsBySession(session.id);
    for (const set of sets) {
      if ((set.weight || 0) > maxWeight) {
        maxWeight = set.weight;
        maxWeightReps = set.reps;
      }
    }
  }

  const totalMin = Math.floor(totalDuration / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return {
    durationStr,
    maxWeight,
    maxWeightReps,
    workoutType: completed[0].workoutType,
  };
}

// --- Export / Import ---

export async function exportAllData() {
  const [exercises, sessions, sets] = await Promise.all([
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
  ]);
  return JSON.stringify({ exercises, sessions, sets }, null, 2);
}

export async function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.exercises || !data.sessions || !data.sets) {
    throw new Error('Invalid backup file: missing exercises, sessions, or sets');
  }
  await db.transaction('rw', db.exercises, db.sessions, db.sets, async () => {
    await db.exercises.clear();
    await db.sessions.clear();
    await db.sets.clear();
    await db.exercises.bulkAdd(data.exercises);
    await db.sessions.bulkAdd(data.sessions);
    await db.sets.bulkAdd(data.sets);
  });
}

// --- Helpers ---

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
