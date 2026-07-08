const entries = [
  { version: '0.1.0', date: '2026-01-15', changes: ['Initial release', 'Basic calculator engine', 'Scientific functions', 'Graphing engine (2D)', 'REST API', 'SDK package', 'Embeddable widget', 'Dark/light themes'] },
];

export function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-4">Changelog</h1>
      <p className="text-lg text-zinc-400 mb-12">
        Keep track of every update to calculo.
      </p>
      <div className="space-y-12">
        {entries.map((entry) => (
          <div key={entry.version}>
            <div className="flex items-baseline gap-4 mb-4">
              <h2 className="text-2xl font-bold">v{entry.version}</h2>
              <time className="text-sm text-zinc-500">{entry.date}</time>
            </div>
            <ul className="space-y-2">
              {entry.changes.map((change) => (
                <li key={change} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="text-green-500 mt-0.5">—</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
