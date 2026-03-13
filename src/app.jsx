import { useState, useEffect } from 'preact/hooks';
import { Home } from './pages/Home.jsx';
import { Workout } from './pages/Workout.jsx';
import { History } from './pages/History.jsx';

function parseHash(hash) {
  const h = hash || '#/';
  // #/workout/:id
  const workoutMatch = h.match(/^#\/workout\/(.+)$/);
  if (workoutMatch) {
    return { route: 'workout', id: workoutMatch[1] };
  }
  if (h === '#/history') {
    return { route: 'history' };
  }
  return { route: 'home' };
}

function navigate(path) {
  window.location.hash = path;
}

function BottomNav({ route }) {
  return (
    <nav class="bottom-nav">
      <button
        class={`bottom-nav__item ${route === 'home' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('#/')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </button>
      <button
        class={`bottom-nav__item ${route === 'history' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('#/history')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>History</span>
      </button>
    </nav>
  );
}

export function App() {
  const [current, setCurrent] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    function onHashChange() {
      setCurrent(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isWorkout = current.route === 'workout';

  return (
    <div class="app">
      {current.route === 'home' && <Home onNavigate={navigate} />}
      {current.route === 'workout' && <Workout sessionId={current.id} onNavigate={navigate} />}
      {current.route === 'history' && <History />}
      {!isWorkout && <BottomNav route={current.route} />}
    </div>
  );
}
