import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getRecentSessions,
  getSessionStats,
  getSetsBySession,
  updateSet,
  WORKOUT_ROTATION,
} from '../db/repo.js';

function formatSessionDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${month}/${day} (${weekDays[d.getDay()]})`;
}

function formatDuration(startMs, endMs) {
  if (!startMs || !endMs) return null;
  const totalSec = Math.floor((endMs - startMs) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function History() {
  const [sessions, setSessions] = useState([]);
  const [details, setDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const recent = await getRecentSessions(30);
      const completed = recent.filter(s => s.status === 'completed');
      setSessions(completed);
      const detailMap = {};
      await Promise.all(completed.map(async session => {
        detailMap[session.id] = await getSessionStats(session.id);
      }));
      setDetails(detailMap);
    } finally { setLoading(false); }
  }

  async function handleToggleExpand(sessionId) {
    if (expandedId === sessionId) { setExpandedId(null); setExpandedSets([]); setEditingSet(null); return; }
    const sets = await getSetsBySession(sessionId);
    sets.sort((a, b) => a.setNumber - b.setNumber);
    setExpandedId(sessionId);
    setExpandedSets(sets);
    setEditingSet(null);
  }

  function handleTapSet(set) {
    if (editingSet === set.id) {
      setEditingSet(null);
      return;
    }
    setEditingSet(set.id);
    setEditWeight(String(set.weight || ''));
    setEditReps(String(set.reps || ''));
  }

  async function handleSaveEdit(setId) {
    const w = parseFloat(editWeight) || 0;
    const r = parseFloat(editReps) || 0;
    await updateSet(setId, { weight: w, reps: r });
    setExpandedSets(prev => prev.map(s => s.id === setId ? { ...s, weight: w, reps: r } : s));
    setEditingSet(null);
    // Refresh stats for this session
    const set = expandedSets.find(s => s.id === setId);
    if (set) {
      const stats = await getSessionStats(set.sessionId);
      setDetails(prev => ({ ...prev, [set.sessionId]: stats }));
    }
  }

  if (loading) {
    return <div className="flex-1 p-4 pb-20 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex-1 p-4 pb-20">
      <h2 className="mb-4 text-[1.75rem] font-bold tracking-tight">History</h2>

      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
          <div className="text-5xl opacity-50">No workouts yet</div>
          <p>Complete a workout to see it here.</p>
        </div>
      )}

      {sessions.map(session => {
        const detail = details[session.id];
        const isExpanded = expandedId === session.id;
        const workoutName = session.workoutType !== undefined ? WORKOUT_ROTATION[session.workoutType] : 'Unknown';
        const duration = formatDuration(session.startedAt, session.finishedAt);

        return (
          <Card
            key={session.id}
            className="p-4 mb-3 cursor-pointer transition-colors active:bg-accent"
            onClick={() => handleToggleExpand(session.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{formatSessionDate(session.date)}</span>
              {duration && (
                <span className="text-xs text-muted-foreground tabular-nums">{duration}</span>
              )}
            </div>
            <div className="font-medium mb-2">{workoutName}</div>
            {detail && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span><span className="tabular-nums">{detail.totalSets}</span> sets</span>
                <span><span className="tabular-nums">{detail.totalVolume.toLocaleString()}</span> lbs</span>
              </div>
            )}
            {isExpanded && expandedSets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                {expandedSets.map(set => {
                  const isEditing = editingSet === set.id;
                  return (
                    <div key={set.id}>
                      <div
                        className={cn(
                          "flex gap-4 text-sm py-2 px-2 -mx-2 rounded-md tabular-nums transition-colors cursor-pointer",
                          isEditing ? "bg-accent text-foreground" : "text-muted-foreground active:bg-accent/50"
                        )}
                        onClick={() => handleTapSet(set)}
                      >
                        <span className="w-10">Set {set.setNumber}</span>
                        <span className="w-16">{set.weight} lbs</span>
                        <span>{set.reps} reps</span>
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-2 px-2 pb-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={editWeight}
                            onChange={e => setEditWeight(e.target.value)}
                            placeholder="lbs"
                            className="h-10 w-20 rounded-md border border-input bg-transparent text-center text-sm tabular-nums px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">lbs</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editReps}
                            onChange={e => setEditReps(e.target.value)}
                            placeholder="reps"
                            className="h-10 w-20 rounded-md border border-input bg-transparent text-center text-sm tabular-nums px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="text-xs text-muted-foreground">reps</span>
                          <button
                            className="ml-auto h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                            onClick={() => handleSaveEdit(set.id)}
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
