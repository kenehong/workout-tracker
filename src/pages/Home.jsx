import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createSession,
  getMonthlySummary,
  getNextWorkoutType,
  WORKOUT_ROTATION,
} from '../db/repo.js';

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday-based
  const days = [];

  // Padding for days before the 1st
  for (let i = 0; i < startPad; i++) {
    days.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(formatDate(new Date(year, month, d)));
  }

  return days;
}

export function Home({ onNavigate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [workoutDates, setWorkoutDates] = useState([]);
  const [nextWorkout, setNextWorkout] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [monthly, nextType] = await Promise.all([
        getMonthlySummary(viewYear, viewMonth),
        getNextWorkoutType(),
      ]);
      setWorkoutDates(monthly.dates);
      setNextWorkout(WORKOUT_ROTATION[nextType]);
      setLoading(false);
    }
    load();
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  async function handleStartWorkout() {
    const today = formatDate(new Date());
    const session = await createSession(today);
    onNavigate(`#/workout/${session.id}`);
  }

  const days = getMonthDays(viewYear, viewMonth);
  const todayStr = formatDate(new Date());
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  if (loading) {
    return <div className="flex-1 p-4 pb-20 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex-1 p-4 pb-40 flex flex-col">
      <h2 className="mb-4 text-[1.75rem] font-bold tracking-tight">Workout</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-2 -ml-2 rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="size-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 -mr-2 rounded-md hover:bg-accent transition-colors">
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((label, i) => (
          <div key={i} className="text-center text-[0.625rem] font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} />;
          const dayNum = parseInt(dateStr.split('-')[2], 10);
          const isToday = dateStr === todayStr;
          const hasWorkout = workoutDates.includes(dateStr);

          return (
            <div
              key={dateStr}
              className={cn(
                "relative flex items-center justify-center aspect-square rounded-lg text-sm tabular-nums transition-colors",
                isToday && "ring-2 ring-primary",
                hasWorkout && "bg-primary text-primary-foreground font-semibold",
                !hasWorkout && !isToday && "text-muted-foreground",
              )}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Monthly stats */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {workoutDates.length > 0
          ? <span><span className="font-semibold text-foreground tabular-nums">{workoutDates.length}</span> workouts this month</span>
          : <span>No workouts this month</span>
        }
      </div>

      {/* Fixed bottom start button */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-2 z-40">
        <Button size="lg" className="w-full h-14 text-base font-bold" onClick={handleStartWorkout}>
          Start — {nextWorkout}
        </Button>
      </div>
    </div>
  );
}
