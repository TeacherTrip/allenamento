import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DbGate } from './screens/DbGate';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DbGate>
      <App />
    </DbGate>
  </StrictMode>,
);
