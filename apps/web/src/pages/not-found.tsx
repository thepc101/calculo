import { Link } from '@tanstack/react-router';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg text-zinc-400 mb-8">Page not found</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-6 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
