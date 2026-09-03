import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';

/**
 * Story 1.0 console scaffold: enough to prove the toolchain builds, the tokens
 * load, and the directional lint has something to police. Real surfaces begin in
 * Story 3.10 (the open-work list) and Story 6.1 (the department dashboard).
 *
 * State is never colour alone (NFR-6): each badge carries a glyph, a word and,
 * where relevant, a number - and it must survive greyscale.
 */
function Health(): JSX.Element {
  return (
    <main>
      <h1>JazzTicketing</h1>
      <p>Console scaffold - Story 1.0. Surfaces begin in Story 3.10.</p>
      <p>
        <span className="badge badge--ok">● Within target 24m</span>{' '}
        <span className="badge badge--due">◆ Due 4m</span>{' '}
        <span className="badge badge--breach">■ Breached 12m</span>
      </p>
      <button className="primary" type="button">Primary action</button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Health /></StrictMode>,
);
