import { useState, useEffect } from 'react';
import { Home as HomeIcon, Clock } from 'lucide-react';
import { Home } from './pages/Home.jsx';
import { Workout } from './pages/Workout.jsx';
import { History } from './pages/History.jsx';
import { cn } from '@/lib/utils';

function parseHash(hash) {
  const h = hash || '#/';
  const workoutMatch = h.match(/^#\/workout\/(.+)$/);
  if (workoutMatch) return { route: 'workout', id: workoutMatch[1] };
  if (h === '#/history') return { route: 'history' };
  return { route: 'home' };
}

function navigate(path) {
  window.location.hash = path;
}

function BottomNav({ route }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-14 bg-card border-t border-border flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom,0)]">
      <button
        className={cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[0.625rem] font-medium transition-colors", route === 'home' ? "text-primary" : "text-muted-foreground")}
        onClick={() => navigate('#/')}
      >
        <HomeIcon className="size-6" />
        <span>Home</span>
      </button>
      <button
        className={cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[0.625rem] font-medium transition-colors", route === 'history' ? "text-primary" : "text-muted-foreground")}
        onClick={() => navigate('#/history')}
      >
        <Clock className="size-6" />
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
    <div className="max-w-[480px] mx-auto min-h-dvh flex flex-col relative">
      {current.route === 'home' && <Home onNavigate={navigate} />}
      {current.route === 'workout' && <Workout sessionId={current.id} onNavigate={navigate} />}
      {current.route === 'history' && <History />}
      {!isWorkout && <BottomNav route={current.route} />}
    </div>
  );
}
