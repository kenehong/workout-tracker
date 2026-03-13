import { useState, useEffect, useRef } from 'preact/hooks';

const DEFAULT_REST = 60; // seconds

function fmtTimer(sec) {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.abs(sec) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimer({ onClose }) {
  const [totalTime, setTotalTime] = useState(DEFAULT_REST);
  const [remaining, setRemaining] = useState(DEFAULT_REST);
  const startRef = useRef(Date.now());
  const totalRef = useRef(DEFAULT_REST);
  const doneRef = useRef(false);

  // Keep totalRef in sync
  useEffect(() => {
    totalRef.current = totalTime;
  }, [totalTime]);

  // Timer tick using Date.now() for background accuracy
  useEffect(() => {
    function tick() {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = totalRef.current - elapsed;
      setRemaining(left);

      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  function handleAdjust(delta) {
    const newTotal = Math.max(10, totalTime + delta);
    setTotalTime(newTotal);
    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    const newRemaining = newTotal - elapsed;
    setRemaining(newRemaining);
    if (newRemaining > 0) {
      doneRef.current = false;
    }
  }

  const isOver = remaining < 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const progress = totalTime > 0 ? (Math.max(0, remaining) / totalTime) * 100 : 0;
  const overSeconds = isOver ? Math.abs(remaining) : 0;

  return (
    <div class="timer-overlay">
      <div class="timer__label">Rest Timer</div>

      <div class={`timer__time ${isWarning ? 'timer__time--warning' : ''} ${isOver ? 'timer__time--over' : ''}`}>
        {isOver ? fmtTimer(remaining) : fmtTimer(remaining)}
      </div>

      {isOver && (
        <div class="timer__over-label">+{fmtTimer(overSeconds)} over</div>
      )}

      <div class="timer__progress">
        <div
          class={`timer__progress-bar ${isWarning ? 'timer__progress-bar--warning' : ''} ${isOver ? 'timer__progress-bar--over' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div class="timer__controls">
        <button class="btn btn--ghost" onClick={() => handleAdjust(-30)}>
          -30s
        </button>
        <button class="btn btn--primary" onClick={onClose}>
          Skip
        </button>
        <button class="btn btn--ghost" onClick={() => handleAdjust(30)}>
          +30s
        </button>
      </div>
    </div>
  );
}
