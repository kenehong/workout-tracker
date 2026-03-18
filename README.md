# Workout

A minimal weight training logger. Log sets, track history, nothing else.

## What it does

- Log exercises by muscle group (Chest, Back, Legs, Shoulders, Arms, Core)
- Record sets, reps, and weight per exercise
- View workout history on a calendar
- Works offline after first load
- Installable as a PWA on mobile and desktop

## What it doesn't

- No accounts
- No server or cloud sync
- No social features
- No analytics or tracking
- No ads

## Install

**iOS (Safari):** Open the app URL → tap the Share button → "Add to Home Screen"

**Android (Chrome):** Open the app URL → tap the three-dot menu → "Add to Home Screen" or "Install app"

**Desktop (Chrome/Edge):** Open the app URL → click the install icon in the address bar

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Data

All data is stored locally in your browser using IndexedDB (`WorkoutTrackerDB`). No data leaves your device.

To back up: use your browser's built-in export tools, or clear site data to wipe everything.

## License

MIT
