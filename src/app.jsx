import { useState, useEffect } from 'react';
import { Home } from './pages/Home.jsx';
import { Workout } from './pages/Workout.jsx';
import { Setup } from './pages/Setup.jsx';
import { getCustomRotation } from './db/repo.js';

function parseHash(hash) {
  const h = hash || '#/';
  const workoutMatch = h.match(/^#\/workout\/(.+)$/);
  if (workoutMatch) return { route: 'workout', id: workoutMatch[1] };
  if (h === '#/setup') return { route: 'setup' };
  return { route: 'home' };
}

function navigate(path) {
  window.location.hash = path;
}

export function App() {
  const [current, setCurrent] = useState(() => parseHash(window.location.hash));
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [currentRotation, setCurrentRotation] = useState(null);

  useEffect(() => {
    function onHashChange() {
      setCurrent(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Check if custom rotation exists on mount
  useEffect(() => {
    async function check() {
      const rotation = await getCustomRotation();
      if (!rotation && current.route !== 'setup') {
        setCurrent({ route: 'setup' });
        window.location.hash = '#/setup';
      }
      setCurrentRotation(rotation);
      setCheckingSetup(false);
    }
    check();
  }, []);

  function handleSetupComplete() {
    // Reload rotation and go home
    getCustomRotation().then((rotation) => {
      setCurrentRotation(rotation);
      navigate('#/');
    });
  }

  if (checkingSetup) {
    return (
      <div className="max-w-[480px] mx-auto min-h-dvh flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-dvh flex flex-col relative">
      {current.route === 'setup' && (
        <Setup
          onComplete={handleSetupComplete}
          initialRotation={currentRotation}
        />
      )}
      {current.route === 'home' && <Home onNavigate={navigate} />}
      {current.route === 'workout' && <Workout sessionId={current.id} onNavigate={navigate} />}
    </div>
  );
}
