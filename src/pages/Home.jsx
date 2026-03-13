import { useState, useEffect } from 'preact/hooks';
import { createSession, getWeeklySummary } from '../db/repo.js';

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

export function Home({ onNavigate }) {
  const [weekDates, setWeekDates] = useState([]);
  const [weekDays] = useState(getWeekDays);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklySummary().then((weekly) => {
      setWeekDates(weekly.dates || []);
      setLoading(false);
    });
  }, []);

  async function handleStartWorkout() {
    const today = formatDate(new Date());
    const session = await createSession(today);
    onNavigate(`#/workout/${session.id}`);
  }

  if (loading) {
    return <div class="page"><div class="empty-state">Loading...</div></div>;
  }

  return (
    <div class="page home-page">
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
      <div class="home-start">
        <button class="btn btn--primary btn--lg" onClick={handleStartWorkout}>
          Start Workout
        </button>
      </div>
    </div>
  );
}
