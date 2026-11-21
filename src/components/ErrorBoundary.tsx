import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RawBackupButton } from './RawBackupButton';

/**
 * Error boundary: se un componente si rompe durante il disegno (anche un errore di lettura del database
 * rilanciato da useLiveQuery), al posto della pagina bianca compare un messaggio con «Scarica backup» e «Ricarica».
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('TeacherGym: errore imprevisto', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="dbgate" role="alert" data-testid="app-error">
        <h2>Qualcosa non ha funzionato</h2>
        <p>L’app si è fermata per un errore imprevisto. I dati salvati non sono stati toccati.</p>
        <pre className="dberr">{`${error.name}: ${error.message}`}</pre>
        <p>Scarica il backup e conservalo, poi prova a ricaricare.</p>
        <RawBackupButton />
        <button className="ghost" onClick={() => location.reload()}>
          Ricarica
        </button>
      </div>
    );
  }
}
