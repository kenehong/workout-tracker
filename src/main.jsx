import { render } from 'preact';
import { App } from './app.jsx';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';

// Seed exercises on first load
import { seedExercises } from './db/seed.js';
seedExercises();

render(<App />, document.getElementById('app'));
