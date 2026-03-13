import { useState, useEffect } from 'preact/hooks';
import {
  getRecentSessions,
  getSessionStats,
  getSetsBySession,
  WORKOUT_ROTATION,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const recent = await getRecentSessions(30);
      const completed = recent.filter((s) => s.status === 'completed');
      setSessions(completed);

      const detailMap = {};
      await Promise.all(
        completed.map(async (session) => {
          const stats = await getSessionStats(session.id);
          detailMap[session.id] = stats;
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
    sets.sort((a, b) => a.setNumber - b.setNumber);
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
        const workoutName = session.workoutType !== undefined
          ? WORKOUT_ROTATION[session.workoutType]
          : 'Unknown';

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
            <div class="session-card__exercises">{workoutName}</div>
            {detail && (
              <div class="session-card__stats">
                <span>
                  <span class="tabular">{detail.totalSets}</span> sets
                </span>
                <span>
                  <span class="tabular">{detail.totalVolume.toLocaleString()}</span> lbs
                </span>
              </div>
            )}

            {isExpanded && expandedSets.length > 0 && (
              <ExpandedDetail sets={expandedSets} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedDetail({ sets }) {
  return (
    <div class="history-detail" onClick={(e) => e.stopPropagation()}>
      {sets.map((set) => (
        <div key={set.id} class="history-detail__set">
          <span class="tabular">Set {set.setNumber}</span>
          <span class="tabular">{set.weight} lbs</span>
          <span class="tabular">{set.reps} reps</span>
        </div>
      ))}
    </div>
  );
}
