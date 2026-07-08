import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { cn } from '../lib/utils';

const navItems = [
  { href: '/docs' as const, label: 'Docs' },
  { href: '/api' as const, label: 'API' },
  { href: '/examples' as const, label: 'Examples' },
  { href: '/playground' as const, label: 'Playground' },
  { href: '/pricing' as const, label: 'Pricing' },
  { href: '/blog' as const, label: 'Blog' },
  { href: '/changelog' as const, label: 'Changelog' },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
                <span className="text-zinc-100">calculo</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'text-sm transition-colors hover:text-zinc-100',
                      location.pathname.startsWith(item.href)
                        ? 'text-zinc-100'
                        : 'text-zinc-400',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/thepc101/calculo"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
              <Link
                to="/login"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                {['Docs', 'API', 'SDKs', 'Examples', 'Playground'].map((item) => (
                  <li key={item}>
                    <a href={`/${item.toLowerCase()}`} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                {['Blog', 'Changelog', 'Pricing', 'Support'].map((item) => (
                  <li key={item}>
                    <a href={`/${item.toLowerCase()}`} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                {['Privacy', 'Terms', 'Status'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} calculo, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
