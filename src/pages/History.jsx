import { useState, useEffect } from 'preact/hooks';
import {
  getRecentSessions,
  getSessionStats,
  getSetsBySession,
  getAllExercises,
} from '../db/repo.js';

function formatSessionDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${month}/${day} (${weekDays[d.getDay()]})`;
}

export function History() {
  const [sessions, setSessions] = useState([]);
  const [details, setDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState([]);
  const [exerciseMap, setExerciseMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [recent, exercises] = await Promise.all([
        getRecentSessions(30),
        getAllExercises(),
      ]);

      const exMap = new Map(exercises.map((e) => [e.id, e.name]));
      setExerciseMap(exMap);

      const completed = recent.filter((s) => s.status === 'completed');
      setSessions(completed);

      // Load stats for all sessions
      const detailMap = {};
      await Promise.all(
        completed.map(async (session) => {
          const [stats, sets] = await Promise.all([
            getSessionStats(session.id),
            getSetsBySession(session.id),
          ]);
          const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
          const exerciseNames = exerciseIds.map((id, i) => exMap.get(id) || `Exercise ${i + 1}`);
          detailMap[session.id] = { ...stats, exerciseNames };
        }),
      );
      setDetails(detailMap);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleExpand(sessionId) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setExpandedSets([]);
      return;
    }

    const sets = await getSetsBySession(sessionId);
    sets.sort((a, b) => {
      if (a.exerciseId !== b.exerciseId) return 0;
      return a.setNumber - b.setNumber;
    });
    setExpandedId(sessionId);
    setExpandedSets(sets);
  }

  if (loading) {
    return <div class="page"><div class="empty-state">Loading...</div></div>;
  }

  return (
    <div class="page">
      <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-display)' }}>
        History
      </h2>

      {sessions.length === 0 && (
        <div class="empty-state">
          <div class="empty-state__icon">No workouts yet</div>
          <p>Complete a workout to see it here.</p>
        </div>
      )}

      {sessions.map((session) => {
        const detail = details[session.id];
        const isExpanded = expandedId === session.id;

        return (
          <div
            key={session.id}
            class="session-card"
            onClick={() => handleToggleExpand(session.id)}
            style={{ cursor: 'pointer' }}
          >
            <div class="session-card__date">
              {formatSessionDate(session.date)}
            </div>
            {detail && (
              <>
                <div class="session-card__exercises">
                  {detail.exerciseNames.join(', ')}
                </div>
                <div class="session-card__stats">
                  <span>
                    <span class="tabular">{detail.totalSets}</span> sets
                  </span>
                  <span>
                    <span class="tabular">{detail.totalVolume.toLocaleString()}</span> lbs
                  </span>
                </div>
              </>
            )}

            {/* Expanded detail */}
            {isExpanded && expandedSets.length > 0 && (
              <ExpandedDetail sets={expandedSets} exerciseMap={exerciseMap} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedDetail({ sets, exerciseMap }) {
  // Group sets by exerciseId, maintaining order of first appearance
  const groups = [];
  const seen = new Set();
  for (const set of sets) {
    if (!seen.has(set.exerciseId)) {
      seen.add(set.exerciseId);
      groups.push({
        exerciseId: set.exerciseId,
        name: exerciseMap.get(set.exerciseId) || `Exercise ${groups.length + 1}`,
        sets: [],
      });
    }
    groups.find((g) => g.exerciseId === set.exerciseId).sets.push(set);
  }

  return (
    <div class="history-detail" onClick={(e) => e.stopPropagation()}>
      {groups.map((group) => (
        <div key={group.exerciseId} class="history-detail__exercise">
          <div class="history-detail__exercise-name">{group.name}</div>
          {group.sets
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set) => (
              <div key={set.id} class="history-detail__set">
                <span class="tabular">Set {set.setNumber}</span>
                <span class="tabular">{set.weight} lbs</span>
                <span class="tabular">{set.reps} reps</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
