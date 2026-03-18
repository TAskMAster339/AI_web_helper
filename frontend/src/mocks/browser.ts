import { setupWorker } from 'msw/browser';
import { handlers } from '../__tests__/mocks/handlers';

export const worker = setupWorker(...handlers);

// In Vite, files in `public/` are served from the site root.
// `msw init public/` generates `public/mockServiceWorker.js`.
export async function startWorker() {
  return worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
    // In e2e we want to know if we accidentally hit the real backend.
    onUnhandledRequest: 'warn',
  });
}
