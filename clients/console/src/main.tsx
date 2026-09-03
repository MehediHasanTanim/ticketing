import { StrictMode, useEffect, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import { loadRuntimeConfig, type RuntimeConfig } from './runtime-config';

/**
 * Story 1.0 console scaffold: enough to prove the toolchain builds, the tokens
 * load, the directional lint has something to police, and the image reads its
 * configuration at RUNTIME rather than having it baked in at build time.
 *
 * Real surfaces begin in Story 3.10 (the open-work list) and Story 6.1 (the
 * department dashboard).
 *
 * State is never colour alone (NFR-6): each badge carries a glyph, a word and a
 * number, and the distinction must survive greyscale.
 */
function App(): JSX.Element {
  const [config, setConfig] = useState<RuntimeConfig | undefined>(undefined);

  useEffect(() => { void loadRuntimeConfig().then(setConfig); }, []);

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
      <p className="hint">
        {config
          ? `cell ${config.cellName} · api ${config.apiBaseUrl}`
          : 'reading runtime configuration…'}
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
