import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DbGate } from './screens/DbGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DbGate>
        <App />
      </DbGate>
    </ErrorBoundary>
  </StrictMode>,
);
