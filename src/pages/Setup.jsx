import { useState } from 'react';
import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WORKOUT_ROTATION, saveCustomRotation } from '../db/repo.js';

const PRESET_OPTIONS = [
  ...WORKOUT_ROTATION,
  'Push',
  'Pull',
  'Legs',
  'Cardio',
  'Rest',
];

export function Setup({ onComplete, initialRotation }) {
  const [selected, setSelected] = useState(initialRotation || []);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  // All presets that are not currently selected
  const available = PRESET_OPTIONS.filter((name) => !selected.includes(name));

  function togglePreset(name) {
    if (selected.includes(name)) {
      setSelected((prev) => prev.filter((n) => n !== name));
    } else {
      setSelected((prev) => [...prev, name]);
    }
  }

  function moveUp(idx) {
    if (idx === 0) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    if (idx >= selected.length - 1) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function removeItem(idx) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function addCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) return;
    setSelected((prev) => [...prev, trimmed]);
    setCustomName('');
    setShowCustomInput(false);
  }

  function handleCustomKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
    if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomName('');
    }
  }

  async function handleStart() {
    if (selected.length === 0) return;
    await saveCustomRotation(selected);
    onComplete();
  }

  return (
    <div className="flex-1 p-4 pb-28 flex flex-col">
      {/* Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-[1.75rem] font-bold tracking-tight">Your Routine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick your workout days and reorder
        </p>
      </div>

      {/* Preset chips */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((name) => {
            const isSelected = selected.includes(name);
            return (
              <button
                key={name}
                onClick={() => togglePreset(name)}
                className={cn(
                  'px-3 py-2 text-sm font-semibold border-2 transition-colors select-none',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-foreground border-border hover:bg-accent/10',
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected order list */}
      {selected.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Order
          </h3>
          <div className="border-2 border-border divide-y-2 divide-border">
            {selected.map((name, idx) => (
              <div
                key={`${name}-${idx}`}
                className="flex items-center gap-2 px-3 py-2"
              >
                <span className="text-xs font-bold text-muted-foreground tabular-nums w-5 text-center">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-semibold">{name}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className={cn(
                      'p-1 transition-colors',
                      idx === 0
                        ? 'text-muted-foreground/30'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === selected.length - 1}
                    className={cn(
                      'p-1 transition-colors',
                      idx === selected.length - 1
                        ? 'text-muted-foreground/30'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom */}
      {showCustomInput ? (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="Workout name"
            autoFocus
            className="flex-1 h-11 px-3 border-2 border-border bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={addCustom}
            disabled={!customName.trim()}
          >
            Add
          </Button>
          <button
            onClick={() => { setShowCustomInput(false); setCustomName(''); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustomInput(true)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <Plus className="size-4" /> Add Custom
        </button>
      )}

      {/* Start button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-4 pt-2 z-40 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          size="lg"
          className="h-14 text-base font-bold"
          onClick={handleStart}
          disabled={selected.length === 0}
        >
          {selected.length === 0 ? 'Select workouts' : `Start (${selected.length} days)`}
        </Button>
      </div>
    </div>
  );
}
