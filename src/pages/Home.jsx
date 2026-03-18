import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createSession,
  getMonthlySummary,
  getNextWorkoutType,
  getWeeklyAverage,
  getDayStats,
  exportAllData,
  importAllData,
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
  const startPad = (firstDay.getDay() + 6) % 7;
  const days = [];

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
  const [nextWorkoutIdx, setNextWorkoutIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [weeklyAvg, setWeeklyAvg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayStats, setDayStats] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [monthly, nextType, avg] = await Promise.all([
        getMonthlySummary(viewYear, viewMonth),
        getNextWorkoutType(),
        getWeeklyAverage(),
      ]);
      setWorkoutDates(monthly.dates);
      setNextWorkoutIdx(nextType);
      setSelectedIdx(nextType);
      setWeeklyAvg(avg);
      setLoading(false);
    }
    load();
  }, [viewYear, viewMonth]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [settingsOpen]);

  const handleExport = useCallback(async () => {
    try {
      const json = await exportAllData();
      const date = formatDate(new Date());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workout-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSettingsOpen(false);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }, []);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAllData(text);
      setSettingsOpen(false);
      // Reload data
      const [monthly, nextType, avg] = await Promise.all([
        getMonthlySummary(viewYear, viewMonth),
        getNextWorkoutType(),
        getWeeklyAverage(),
      ]);
      setWorkoutDates(monthly.dates);
      setNextWorkoutIdx(nextType);
      setSelectedIdx(nextType);
      setWeeklyAvg(avg);
      setSelectedDate(null);
      setDayStats(null);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [viewYear, viewMonth]);

  function prevMonth() {
    setSelectedDate(null); setDayStats(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    setSelectedDate(null); setDayStats(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  async function handleStartWorkout() {
    const today = formatDate(new Date());
    const session = await createSession(today, selectedIdx);
    onNavigate(`#/workout/${session.id}`);
  }

  function handleSelectWorkout(idx) {
    setSelectedIdx(idx);
    setDropdownOpen(false);
  }

  async function handleDateTap(dateStr) {
    if (!workoutDates.includes(dateStr)) return;
    if (selectedDate === dateStr) {
      // Deselect → back to default (today)
      setSelectedDate(null);
      setDayStats(null);
      return;
    }
    setSelectedDate(dateStr);
    const stats = await getDayStats(dateStr);
    setDayStats(stats);
  }

  const days = getMonthDays(viewYear, viewMonth);
  const todayStr = formatDate(new Date());
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const currentWorkout = selectedIdx !== null ? WORKOUT_ROTATION[selectedIdx] : '';

  if (loading) {
    return <div className="flex-1 p-4 pb-20 flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex-1 p-4 pb-28 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[1.75rem] font-bold tracking-tight">Workout</h2>
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen(prev => !prev)}
            className="p-2 -mr-2 rounded-md hover:bg-accent transition-colors"
          >
            <Settings className="size-5 text-muted-foreground" />
          </button>
          {settingsOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <button
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={handleExport}
              >
                <Download className="size-4" />
                Export Backup
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Import Backup
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

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

          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              className={cn(
                "relative flex items-center justify-center aspect-square rounded-lg text-sm tabular-nums transition-colors select-none",
                isToday && !isSelected && "ring-2 ring-primary",
                isSelected && "ring-2 ring-accent bg-accent/20 font-semibold",
                hasWorkout && !isSelected && "bg-primary text-primary-foreground font-semibold cursor-pointer active:bg-primary/80",
                hasWorkout && isSelected && "cursor-pointer",
                !hasWorkout && "text-muted-foreground pointer-events-none",
              )}
              onClick={() => handleDateTap(dateStr)}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Stats area */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {selectedDate && dayStats ? (
          <div className="flex items-center justify-center gap-3">
            <span className="font-semibold text-foreground">{WORKOUT_ROTATION[dayStats.workoutType]}</span>
            <span className="tabular-nums">{dayStats.durationStr}</span>
            {dayStats.maxWeight > 0 && (
              <span className="tabular-nums">{dayStats.maxWeight} lbs × {dayStats.maxWeightReps}</span>
            )}
          </div>
        ) : workoutDates.length > 0 ? (
          <span>
            <span className="font-semibold text-foreground tabular-nums">{workoutDates.length}</span> workouts
            {weeklyAvg !== null && <span> · <span className="tabular-nums">{weeklyAvg}x</span>/week</span>}
          </span>
        ) : (
          <span>No workouts this month</span>
        )}
      </div>

      {/* Fixed bottom split button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-4 pt-2 z-40 bg-gradient-to-t from-background via-background to-transparent">
        <div className="relative flex" ref={dropdownRef}>
          <Button
            size="lg"
            className="flex-1 h-14 text-base font-bold rounded-r-none"
            onClick={handleStartWorkout}
          >
            Start — {currentWorkout}
          </Button>
          <Button
            size="lg"
            className="h-14 w-11 px-0 rounded-l-none border-l border-primary-foreground/20 shrink-0"
            onClick={() => setDropdownOpen(prev => !prev)}
          >
            <ChevronDown className={cn("size-4 transition-transform", dropdownOpen && "rotate-180")} />
          </Button>

          {dropdownOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {WORKOUT_ROTATION.map((name, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors",
                    idx === selectedIdx
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent",
                    idx === nextWorkoutIdx && idx !== selectedIdx && "text-muted-foreground"
                  )}
                  onClick={() => handleSelectWorkout(idx)}
                >
                  <span>{name}</span>
                  {idx === nextWorkoutIdx && (
                    <span className="ml-2 text-xs text-muted-foreground">next</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
