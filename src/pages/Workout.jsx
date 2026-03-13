import { useState, useEffect, useRef } from 'react';
import { Check, Circle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getSession,
  finishSession,
  addSet,
  updateSet,
  deleteSet,
  getSetsBySession,
  WORKOUT_ROTATION,
} from '../db/repo.js';
import { RestTimer } from '../components/RestTimer.jsx';

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Workout({ sessionId, onNavigate }) {
  const [session, setSession] = useState(null);
  const [sets, setSets] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef(Date.now());
  const wakeLockRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [sess, allSets] = await Promise.all([
          getSession(sessionId),
          getSetsBySession(sessionId),
        ]);
        if (!sess) { onNavigate('#/'); return; }
        setSession(sess);
        const sorted = allSets.sort((a, b) => a.setNumber - b.setNumber);
        setSets(sorted);
        startTimeRef.current = sess.startedAt;
        if (sorted.length === 0) {
          const newSet = await addSet(sessionId, sess.workoutType, 1, 0, 0);
          setSets([newSet]);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [sessionId]);

  useEffect(() => {
    function tick() { setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function acquireWakeLock() {
      try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
    }
    acquireWakeLock();
    function onVis() { if (document.visibilityState === 'visible') acquireWakeLock(); }
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); wakeLockRef.current?.release().catch(() => {}); };
  }, []);

  async function handleAddSet() {
    const nextNum = sets.length + 1;
    const last = sets[sets.length - 1];
    const newSet = await addSet(sessionId, session.workoutType, nextNum, last?.weight || 0, last?.reps || 0);
    setSets(prev => [...prev, newSet]);
  }

  async function handleUpdateSet(setId, field, value) {
    const numVal = parseFloat(value) || 0;
    await updateSet(setId, { [field]: numVal });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, [field]: numVal } : s));
  }

  async function handleCompleteSet(setId, currentWeight, currentReps) {
    const w = parseFloat(currentWeight) || 0;
    const r = parseFloat(currentReps) || 0;
    await updateSet(setId, { weight: w, reps: r });
    const set = sets.find(s => s.id === setId);
    const wasDone = set?.done;
    setSets(prev => prev.map(s => s.id === setId ? { ...s, weight: w, reps: r, done: !s.done } : s));
    if (!wasDone) setShowTimer(true);
  }

  async function handleDeleteSet(setId) {
    await deleteSet(setId);
    setSets(prev => prev.filter(s => s.id !== setId));
  }

  async function handleFinish() {
    await finishSession(sessionId);
    wakeLockRef.current?.release().catch(() => {});
    onNavigate('#/');
  }

  if (loading || !session) {
    return <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const workoutName = WORKOUT_ROTATION[session.workoutType] || '운동';

  return (
    <div className="flex-1 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-3 mb-4 sticky top-0 bg-background z-40">
        <div className="text-xl font-bold tabular-nums">{fmtTime(elapsed)}</div>
        <Button variant="success" onClick={handleFinish}>Finish</Button>
      </div>

      {/* Exercise card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between border-b p-3 px-4 space-y-0">
          <CardTitle className="text-base">{workoutName}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {/* Sets header */}
          <div className="grid grid-cols-[40px_1fr_1fr_48px] items-center gap-2 py-2 text-xs text-muted-foreground font-medium text-center">
            <span>SET</span>
            <span>LBS</span>
            <span>REPS</span>
            <span></span>
          </div>

          {sets.sort((a, b) => a.setNumber - b.setNumber).map((set, idx) => (
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
            className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-primary text-sm font-medium rounded-md hover:bg-primary/10 transition-colors"
            onClick={handleAddSet}
          >
            <Plus className="size-4" /> Add Set
          </button>
        </CardContent>
      </Card>

      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
    </div>
  );
}

function SetRow({ set, index, onUpdate, onComplete, onDelete }) {
  const [weight, setWeight] = useState(String(set.weight || ''));
  const [reps, setReps] = useState(String(set.reps || ''));
  const isDone = set.done;

  useEffect(() => {
    setWeight(String(set.weight || ''));
    setReps(String(set.reps || ''));
  }, [set.weight, set.reps]);

  return (
    <div className={cn(
      "grid grid-cols-[40px_1fr_1fr_48px] items-center gap-2 min-h-12 py-1 rounded-md transition-colors",
      isDone && "bg-success/10"
    )}>
      <span className="text-sm font-semibold text-muted-foreground text-center tabular-nums">{index}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={() => onUpdate(set.id, 'weight', weight)}
        disabled={isDone}
        className={cn(
          "h-11 w-full rounded-md border border-input bg-transparent text-center text-base tabular-nums px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          isDone && "opacity-70"
        )}
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={reps}
        onChange={e => setReps(e.target.value)}
        onBlur={() => onUpdate(set.id, 'reps', reps)}
        disabled={isDone}
        className={cn(
          "h-11 w-full rounded-md border border-input bg-transparent text-center text-base tabular-nums px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          isDone && "opacity-70"
        )}
      />
      <button
        className={cn(
          "flex items-center justify-center size-11 rounded-md transition-all",
          isDone ? "text-success bg-success/15" : "text-muted-foreground hover:bg-success/10 hover:text-success"
        )}
        onClick={() => onComplete(set.id, weight, reps)}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone ? <Check className="size-5" strokeWidth={3} /> : <Circle className="size-5" />}
      </button>
    </div>
  );
}
