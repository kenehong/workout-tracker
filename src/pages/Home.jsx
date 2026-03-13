import { useState, useEffect } from 'preact/hooks';
import {
  createSession,
  getWeeklySummary,
  getRecentSessions,
  getSessionStats,
  getSetsBySession,
  getAllExercises,
} from '../db/repo.js';

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDays() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ label: labels[i], date: formatDate(d) });
  }
  return days;
}

function formatSessionDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${month}/${day} (${weekDays[d.getDay()]})`;
}

export function Home({ onNavigate }) {
  const [weekDates, setWeekDates] = useState([]);
  const [weekDays] = useState(getWeekDays);
  const [recentSessions, setRecentSessions] = useState([]);
  const [sessionDetails, setSessionDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [weekly, recent] = await Promise.all([
        getWeeklySummary(),
        getRecentSessions(3),
      ]);

      setWeekDates(weekly.dates || []);

      // Only show completed sessions
      const completed = recent.filter((s) => s.status === 'completed');
      setRecentSessions(completed);

      // Load stats + exercise names for each session
      const details = {};
      const exercises = await getAllExercises();
      const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

      await Promise.all(
        completed.map(async (session) => {
          const [stats, sets] = await Promise.all([
            getSessionStats(session.id),
            getSetsBySession(session.id),
          ]);
          const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
          const exerciseNames = exerciseIds.map(
            (id) => exerciseMap.get(id) || 'Unknown',
          );
          details[session.id] = { ...stats, exerciseNames };
        }),
      );

      setSessionDetails(details);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWorkout() {
    const today = formatDate(new Date());
    const session = await createSession(today);
    onNavigate(`#/workout/${session.id}`);
  }

  if (loading) {
    return <div class="page"><div class="empty-state">Loading...</div></div>;
  }

  return (
    <div class="page">
      <h2 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-display)' }}>
        Workout
      </h2>

      {/* Week dots */}
      <div class="week-strip">
        {weekDays.map((day) => (
          <div key={day.date} class="week-strip__day">
            <span class="week-strip__label">{day.label}</span>
            <div
              class={`week-dot ${weekDates.includes(day.date) ? 'week-dot--active' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* Start button */}
      <button class="btn btn--primary btn--lg" onClick={handleStartWorkout}>
        Start Workout
      </button>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div class="section-title">Recent</div>
          {recentSessions.map((session) => {
            const detail = sessionDetails[session.id];
            return (
              <div key={session.id} class="session-card">
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
                        <span class="tabular">{detail.exerciseCount}</span> exercises
                      </span>
                      <span>
                        <span class="tabular">{detail.totalSets}</span> sets
                      </span>
                      <span>
                        <span class="tabular">{detail.totalVolume.toLocaleString()}</span> kg
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {recentSessions.length === 0 && (
        <div class="empty-state" style={{ marginTop: 'var(--space-8)' }}>
          <div class="empty-state__icon">No records yet</div>
          <p>Start your first workout!</p>
        </div>
      )}
    </div>
  );
}
