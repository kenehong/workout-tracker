import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getRecentSessions,
  getSessionStats,
  getSetsBySession,
  updateSet,
  getWorkoutRotation,
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

export function HistorySheet({ open, onClose, scrollToDate }) {
  const [sessions, setSessions] = useState([]);
  const [details, setDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [rotation, setRotation] = useState([]);
  const dateRefs = useRef({});
  const listRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recent, rot] = await Promise.all([
        getRecentSessions(100),
        getWorkoutRotation(),
      ]);
      const completed = recent.filter(s => s.status === 'completed');
      setSessions(completed);
      setRotation(rot);
      const detailMap = {};
      await Promise.all(completed.map(async session => {
        detailMap[session.id] = await getSessionStats(session.id);
      }));
      setDetails(detailMap);
    } finally { setLoading(false); }
  }, []);

  // Animate in/out
  useEffect(() => {
    if (open) {
      loadData();
      // Small delay for mount → animate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [open, loadData]);

  // Scroll to target date after data loads
  useEffect(() => {
    if (!loading && open && scrollToDate && sessions.length > 0) {
      requestAnimationFrame(() => {
        const el = dateRefs.current[scrollToDate];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }, [loading, open, scrollToDate, sessions]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      setExpandedSets([]);
      setEditingSet(null);
    }
  }, [open]);

  async function handleToggleExpand(sessionId) {
    if (expandedId === sessionId) { setExpandedId(null); setExpandedSets([]); setEditingSet(null); return; }
    const sets = await getSetsBySession(sessionId);
    sets.sort((a, b) => a.setNumber - b.setNumber);
    setExpandedId(sessionId);
    setExpandedSets(sets);
    setEditingSet(null);
  }

  function handleTapSet(set) {
    if (editingSet === set.id) { setEditingSet(null); return; }
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
    const set = expandedSets.find(s => s.id === setId);
    if (set) {
      const stats = await getSessionStats(set.sessionId);
      setDetails(prev => ({ ...prev, [set.sessionId]: stats }));
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleTransitionEnd() {
    // Clean up after close animation
    if (!visible && !open) {
      setSessions([]);
      setDetails({});
    }
  }

  if (!open && !visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center transition-colors duration-300",
        visible ? "bg-black/50" : "bg-black/0"
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "w-full max-w-[480px] bg-background rounded-t-2xl flex flex-col transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: '85dvh' }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Handle bar + header */}
        <div className="flex flex-col items-center pt-2 pb-1 px-4 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-3" />
          <div className="flex items-center justify-between w-full mb-2">
            <h3 className="text-lg font-bold">History</h3>
            <button
              className="p-2 -mr-2 rounded-md hover:bg-accent transition-colors"
              onClick={onClose}
            >
              <X className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 pb-8" ref={listRef}>
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <p className="text-base">No workouts yet</p>
              <p className="text-sm">Complete a workout to see it here.</p>
            </div>
          )}

          {!loading && sessions.map(session => {
            const detail = details[session.id];
            const isExpanded = expandedId === session.id;
            const workoutName = session.workoutType !== undefined ? (rotation[session.workoutType] || 'Unknown') : 'Unknown';
            const duration = formatDuration(session.startedAt, session.finishedAt);
            const isTarget = session.date === scrollToDate;

            return (
              <Card
                key={session.id}
                ref={el => { if (el) dateRefs.current[session.date] = el; }}
                className={cn(
                  "p-4 mb-3 cursor-pointer transition-all active:bg-accent",
                  isTarget && "ring-2 ring-primary"
                )}
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
                    {detail.maxWeight > 0 && (
                      <span>max <span className="tabular-nums">{detail.maxWeight}</span> lbs</span>
                    )}
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
      </div>
    </div>
  );
}
