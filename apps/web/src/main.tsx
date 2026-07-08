import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routes';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 5000,
  defaultErrorComponent: ({ error }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-zinc-400 mb-4">{(error as Error)?.message ?? 'Unknown error'}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-zinc-100 text-zinc-900 px-6 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
      >
        Reload page
      </button>
    </div>
  ),
  defaultPendingComponent: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Loading...</span>
      </div>
    </div>
  ),
  defaultNotFoundComponent: () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg text-zinc-400 mb-8">Page not found</p>
      <a
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-6 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
      >
        Go home
      </a>
    </div>
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
