import { createRoot } from 'react-dom/client';
import { App } from './app.jsx';
import './index.css';

// Dark mode: detect system preference
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches);
});

createRoot(document.getElementById('app')).render(<App />);
