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
                href="https://discord.gg/9t2J4EuaWc"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Discord
              </a>
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
                <li><a href="/docs" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Docs</a></li>
                <li><a href="/api" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">API</a></li>
                <li><a href="/examples" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Examples</a></li>
                <li><a href="/playground" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Playground</a></li>
                <li><a href="/pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="/blog" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Blog</a></li>
                <li><a href="/changelog" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Changelog</a></li>
                <li><a href="/docs" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Documentation</a></li>
                <li><a href="https://github.com/thepc101/calculo/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Community</h3>
              <ul className="space-y-3">
                <li><a href="https://discord.gg/9t2J4EuaWc" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Discord</a></li>
                <li><a href="https://github.com/thepc101/calculo" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">GitHub</a></li>
                <li><a href="https://github.com/thepc101/calculo/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Issues</a></li>
                <li><a href="https://github.com/thepc101/calculo/discussions" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Discussions</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><a href="/privacy" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Terms of Service</a></li>
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
