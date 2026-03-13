import { useState, useEffect, useRef } from 'preact/hooks';

export function ExercisePicker({ exercises, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus search input on open
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Close on escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const filtered = query.trim()
    ? exercises.filter((ex) =>
        ex.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : exercises;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div class="picker-overlay" onClick={handleBackdropClick}>
      <div class="picker">
        <div class="picker__handle" />
        <input
          ref={inputRef}
          class="picker__search"
          type="text"
          placeholder="Search exercises..."
          value={query}
          onInput={(e) => setQuery(e.target.value)}
        />
        <div class="picker__list">
          {filtered.map((exercise) => (
            <button
              key={exercise.id}
              class="picker__item"
              onClick={() => onSelect(exercise)}
            >
              <span class="picker__item-name">{exercise.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div class="picker__empty">
              No exercises found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
