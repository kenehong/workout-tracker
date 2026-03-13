import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEFAULT_REST = 60;

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

  useEffect(() => { totalRef.current = totalTime; }, [totalTime]);

  useEffect(() => {
    function tick() {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = totalRef.current - elapsed;
      setRemaining(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
    if (newRemaining > 0) doneRef.current = false;
  }

  const isOver = remaining < 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const progress = totalTime > 0 ? (Math.max(0, remaining) / totalTime) * 100 : 0;
  const overSeconds = isOver ? Math.abs(remaining) : 0;

  return (
    <div className="fixed inset-0 bg-black/85 flex flex-col items-center justify-center z-[100] gap-6">
      <div className="text-xl font-medium text-white/70">Rest Timer</div>

      <div className={cn(
        "text-5xl font-bold text-white tabular-nums tracking-wider",
        isWarning && "text-warning animate-pulse",
        isOver && "text-destructive animate-pulse"
      )}>
        {fmtTimer(remaining)}
      </div>

      {isOver && (
        <div className="text-xl font-semibold text-destructive opacity-85">+{fmtTimer(overSeconds)} over</div>
      )}

      <div className="w-[200px] h-1 bg-white/15 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 linear",
            isWarning ? "bg-warning" : isOver ? "w-0" : "bg-primary"
          )}
          style={{ width: isOver ? '0%' : `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" className="min-w-[100px] border-white/20 text-white hover:bg-white/10" onClick={() => handleAdjust(-30)}>-30s</Button>
        <Button className="min-w-[100px]" onClick={onClose}>Skip</Button>
        <Button variant="outline" className="min-w-[100px] border-white/20 text-white hover:bg-white/10" onClick={() => handleAdjust(30)}>+30s</Button>
      </div>
    </div>
  );
}
