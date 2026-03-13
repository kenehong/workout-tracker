import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import {
  getSession,
  finishSession,
  addSet,
  updateSet,
  deleteSet,
  getSetsBySession,
  getAllExercises,
  getExerciseHistory,
} from '../db/repo.js';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { RestTimer } from '../components/RestTimer.jsx';

// Format seconds to MM:SS
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Workout({ sessionId, onNavigate }) {
  const [session, setSession] = useState(null);
  const [sets, setSets] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [exerciseMap, setExerciseMap] = useState(new Map());
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [loading, setLoading] = useState(true);

  const startTimeRef = useRef(Date.now());
  const wakeLockRef = useRef(null);

  // Load session data
  useEffect(() => {
    async function load() {
      try {
        const [sess, allSets, allExercises] = await Promise.all([
          getSession(sessionId),
          getSetsBySession(sessionId),
          getAllExercises(),
        ]);

        if (!sess) {
          onNavigate('#/');
          return;
        }

        setSession(sess);
        setSets(allSets.sort((a, b) => a.setNumber - b.setNumber));
        setExercises(allExercises);
        setExerciseMap(new Map(allExercises.map((e) => [e.id, e])));
        startTimeRef.current = sess.startedAt;
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Elapsed timer - uses Date.now() diff for background tab accuracy
  useEffect(() => {
    function tick() {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Wake Lock
  useEffect(() => {
    async function acquireWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Silently ignore
      }
    }
    acquireWakeLock();

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Group sets by exerciseId, preserving add order
  const groupedExercises = useCallback(() => {
    const orderMap = new Map();
    const groups = new Map();

    for (const set of sets) {
      if (!groups.has(set.exerciseId)) {
        groups.set(set.exerciseId, []);
        orderMap.set(set.exerciseId, set.completedAt || 0);
      }
      groups.get(set.exerciseId).push(set);
    }

    const entries = [...groups.entries()];
    entries.sort((a, b) => (orderMap.get(a[0]) || 0) - (orderMap.get(b[0]) || 0));
    return entries;
  }, [sets])();

  async function handleAddExercise(exercise) {
    setShowPicker(false);

    // Get last history for auto-fill
    const history = await getExerciseHistory(exercise.id, 1);
    let weight = 0;
    let reps = 0;
    if (history.length > 0 && history[0].sets.length > 0) {
      const lastSet = history[0].sets[0];
      weight = lastSet.weight;
      reps = lastSet.reps;
    }

    const newSet = await addSet(sessionId, exercise.id, 1, weight, reps);
    setSets((prev) => [...prev, newSet]);
  }

  async function handleAddSet(exerciseId) {
    // Find existing sets for this exercise to determine next set number + auto-fill
    const existingSets = sets.filter((s) => s.exerciseId === exerciseId);
    const nextNum = existingSets.length + 1;

    let weight = 0;
    let reps = 0;
    if (existingSets.length > 0) {
      const lastSet = existingSets[existingSets.length - 1];
      weight = lastSet.weight;
      reps = lastSet.reps;
    }

    const newSet = await addSet(sessionId, exerciseId, nextNum, weight, reps);
    setSets((prev) => [...prev, newSet]);
  }

  async function handleUpdateSet(setId, field, value) {
    const numVal = parseFloat(value) || 0;
    await updateSet(setId, { [field]: numVal });
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, [field]: numVal } : s)),
    );
  }

  async function handleCompleteSet(setId, currentWeight, currentReps) {
    // Save current input values first (in case onBlur didn't fire)
    const w = parseFloat(currentWeight) || 0;
    const r = parseFloat(currentReps) || 0;
    await updateSet(setId, { weight: w, reps: r });

    const set = sets.find((s) => s.id === setId);
    const wasDone = set?.done;

    setSets((prev) =>
      prev.map((s) =>
        s.id === setId ? { ...s, weight: w, reps: r, done: !s.done } : s,
      ),
    );

    // If toggling ON, show rest timer
    if (!wasDone) {
      setShowTimer(true);
    }
  }

  async function handleDeleteSet(setId) {
    await deleteSet(setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  }

  async function handleFinish() {
    await finishSession(sessionId);
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
    }
    onNavigate('#/');
  }

  if (loading) {
    return <div class="page"><div class="empty-state">Loading...</div></div>;
  }

  // Already added exercise IDs (for picker filtering)
  const addedExerciseIds = new Set(sets.map((s) => s.exerciseId));

  return (
    <div class="page" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div class="workout-header">
        <div class="workout-header__timer tabular">{fmtTime(elapsed)}</div>
        <button class="btn btn--success" onClick={handleFinish}>
          Finish
        </button>
      </div>

      {/* Exercise cards */}
      {groupedExercises.map(([exerciseId, exerciseSets]) => {
        const exercise = exerciseMap.get(exerciseId);
        const name = exercise ? exercise.name : 'Unknown';

        return (
          <div key={exerciseId} class="exercise-card">
            <div class="exercise-card__header">
              <span class="exercise-card__name">{name}</span>
            </div>
            <div class="exercise-card__sets">
              <div class="exercise-card__sets-header">
                <span>SET</span>
                <span>KG</span>
                <span>REPS</span>
                <span></span>
              </div>
              {exerciseSets
                .sort((a, b) => a.setNumber - b.setNumber)
                .map((set, idx) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={idx + 1}
                    onUpdate={handleUpdateSet}
                    onComplete={handleCompleteSet}
                    onDelete={handleDeleteSet}
                  />
                ))}
              <button
                class="exercise-card__add-set"
                onClick={() => handleAddSet(exerciseId)}
              >
                + Add Set
              </button>
            </div>
          </div>
        );
      })}

      {/* Add exercise button */}
      <button class="add-exercise-btn" onClick={() => setShowPicker(true)}>
        + Add Exercise
      </button>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Rest timer overlay */}
      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
    </div>
  );
}

function SetRow({ set, index, onUpdate, onComplete, onDelete }) {
  const [weight, setWeight] = useState(String(set.weight || ''));
  const [reps, setReps] = useState(String(set.reps || ''));
  const isDone = set.done;

  // Sync from parent when set changes (e.g., auto-fill)
  useEffect(() => {
    setWeight(String(set.weight || ''));
    setReps(String(set.reps || ''));
  }, [set.weight, set.reps]);

  function handleWeightBlur() {
    onUpdate(set.id, 'weight', weight);
  }

  function handleRepsBlur() {
    onUpdate(set.id, 'reps', reps);
  }

  return (
    <div class={`set-row ${isDone ? 'set-row--done' : ''}`}>
      <span class="set-row__number tabular">{index}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={weight}
        onInput={(e) => setWeight(e.target.value)}
        onBlur={handleWeightBlur}
        class="tabular"
        disabled={isDone}
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={reps}
        onInput={(e) => setReps(e.target.value)}
        onBlur={handleRepsBlur}
        class="tabular"
        disabled={isDone}
      />
      <button
        class={`set-row__check ${isDone ? 'set-row__check--done' : ''}`}
        onClick={() => onComplete(set.id, weight, reps)}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </button>
    </div>
  );
}
