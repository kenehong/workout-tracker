import { useState, useEffect, useRef } from 'preact/hooks';

const DEFAULT_REST = 90; // seconds

function fmtTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
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
      const left = Math.max(0, totalRef.current - elapsed);
      setRemaining(left);

      if (left === 0 && !doneRef.current) {
        doneRef.current = true;
        // Vibrate on completion
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
    // Recalculate remaining based on how long we've been running
    const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
    const newRemaining = Math.max(0, newTotal - elapsed);
    setRemaining(newRemaining);
    if (newRemaining > 0) {
      doneRef.current = false;
    }
  }

  const isWarning = remaining <= 10 && remaining > 0;
  const progress = totalTime > 0 ? (remaining / totalTime) * 100 : 0;

  return (
    <div class="timer-overlay">
      <div class="timer__label">Rest Timer</div>

      <div class={`timer__time ${isWarning ? 'timer__time--warning' : ''}`}>
        {fmtTimer(remaining)}
      </div>

      <div class="timer__progress">
        <div
          class={`timer__progress-bar ${isWarning ? 'timer__progress-bar--warning' : ''}`}
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
