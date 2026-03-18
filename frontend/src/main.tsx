import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';

async function enableMocking() {
  const enabled = import.meta.env.VITE_MOCK_API === 'true';
  if (!enabled) return;

  const { startWorker } = await import('./mocks/browser');
  await startWorker();
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
