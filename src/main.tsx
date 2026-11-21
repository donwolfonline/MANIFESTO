import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { printConsoleGreeting } from './lib/consoleGreeting';
import { initErrorMonitoring } from './lib/errorMonitor';
import App from './App';

initErrorMonitoring();
printConsoleGreeting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
