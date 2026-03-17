import { useState, useEffect } from 'react';
import { Home } from './pages/Home.jsx';
import { Workout } from './pages/Workout.jsx';

function parseHash(hash) {
  const h = hash || '#/';
  const workoutMatch = h.match(/^#\/workout\/(.+)$/);
  if (workoutMatch) return { route: 'workout', id: workoutMatch[1] };
  return { route: 'home' };
}

function navigate(path) {
  window.location.hash = path;
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

  return (
    <div className="max-w-[480px] mx-auto min-h-dvh flex flex-col relative">
      {current.route === 'home' && <Home onNavigate={navigate} />}
      {current.route === 'workout' && <Workout sessionId={current.id} onNavigate={navigate} />}
    </div>
  );
}
