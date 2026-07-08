import { Link } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';

const API = '';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  projectId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

interface Calculator {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  publishedAt: string | null;
}

interface UsagePoint {
  date: string;
  count: number;
}

function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('calculo_token');
    setToken(stored);
    setLoading(false);
  }, []);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!token) throw new Error('Not authenticated');
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  }, [token]);

  return { token, loading, authFetch };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

function UsageChart({ data }: { data: UsagePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-12">
        No usage data yet. Start making API calls to see your usage.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((point, i) => {
        const height = Math.max((point.count / max) * 100, 2);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[10px] text-zinc-500">{point.count}</div>
            <div
              className="w-full bg-blue-500/60 rounded-t-sm min-h-[2px] transition-all"
              style={{ height: `${height}%` }}
              title={`${point.date}: ${point.count} calls`}
            />
            <div className="text-[10px] text-zinc-600">{point.date.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

function ApiKeysSection({ authFetch }: { authFetch: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchKeys = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/apikeys`);
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      // API may not be available yet
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await authFetch(`${API}/api/apikeys`, {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName.trim(),
        }),
      });
      const data = await res.json();
      if (data.key) {
        setCreatedKey(data.key);
        setNewKeyName('');
        fetchKeys();
      } else {
        setError(data.error?.message ?? 'Failed to create key');
      }
    } catch {
      setError('Failed to create key — API may not be connected yet');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await authFetch(`${API}/api/apikeys/${id}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreatedKey(null); setError(''); }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New Key'}
        </button>
      </div>

      {showCreate && !createdKey && (
        <div className="mb-4 p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3">
          <input
            type="text"
            placeholder="Key name (e.g. production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>
      )}

      {createdKey && (
        <div className="mb-4 p-4 rounded-lg border border-green-800 bg-green-900/20">
          <div className="text-xs text-green-400 font-medium mb-2">Key created. Copy it now — it won't be shown again.</div>
          <code className="block p-3 rounded bg-zinc-900 text-sm font-mono text-green-300 break-all select-all">{createdKey}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(createdKey); }}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-500 py-4">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">No API keys yet. Create one to get started.</div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="min-w-0">
                <div className="text-sm font-medium">{key.name}</div>
                <div className="text-xs text-zinc-500 font-mono">{key.prefix}...</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="px-2.5 py-1 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalculatorsSection({ authFetch }: { authFetch: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API}/api/calculators`);
        const data = await res.json();
        setCalculators(data.calculators ?? []);
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Calculators</h2>
        <Link to="/playground" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
          + New Calculator
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-zinc-500 py-4">Loading...</div>
      ) : calculators.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">
          No calculators yet.{' '}
          <Link to="/playground" className="text-zinc-300 hover:text-zinc-100 underline">Try the playground</Link>{' '}
          to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {calculators.map((calc) => (
            <div key={calc.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div>
                <div className="text-sm font-medium">{calc.name}</div>
                <div className="text-xs text-zinc-500 font-mono">{calc.id}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {calc.type} · Created {new Date(calc.createdAt).toLocaleDateString()}
                  {calc.publishedAt && ' · Published'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/embed/${calc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                >
                  Preview
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const sidebarLinks = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'calculators', label: 'Calculators', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'api-keys', label: 'API Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { id: 'usage', label: 'Usage', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

function SettingsTab({ authFetch, token }: { authFetch: (url: string, init?: RequestInit) => Promise<Response>; token: string | null }) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    authFetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        const p = d.profile;
        if (p) {
          setName(p.name ?? '');
          setBio(p.bio ?? '');
          setAvatarUrl(p.avatarUrl ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch, token]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await authFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() || undefined, bio: bio.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error?.message ?? 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-zinc-500 py-8">Loading...</div>;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Account and profile.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="font-semibold text-sm">Profile</h2>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={64}
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself"
              rows={3}
              maxLength={512}
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              maxLength={512}
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {saved && <span className="text-xs text-green-400">Saved</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Plan</div>
            <div className="text-sm text-zinc-400">Free tier — $0/month</div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Danger Zone</div>
            <button
              onClick={() => { localStorage.removeItem('calculo_token'); window.location.href = '/login'; }}
              className="mt-2 px-4 py-2 text-sm rounded-lg border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { token, loading: authLoading, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [keyCount, setKeyCount] = useState(0);
  const [calcCount, setCalcCount] = useState(0);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Sign in to access your dashboard</h1>
          <p className="text-zinc-400 mb-6">Manage your API keys, calculators, and usage.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 px-6 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const mockUsage: UsagePoint[] = [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        <aside className="w-56 flex-shrink-0 hidden lg:block">
          <nav className="space-y-1">
            {sidebarLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeTab === link.id
                    ? 'text-zinc-100 bg-zinc-800/50'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {/* ── Mobile tab selector ── */}
          <div className="lg:hidden mb-4 flex gap-1 overflow-x-auto pb-1">
            {sidebarLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === link.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-1">Manage your calculators, API keys, and usage.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Evaluations" value={keyCount > 0 ? '0' : '—'} sub="Start using the API" />
                <StatCard label="Calculators" value={calcCount > 0 ? String(calcCount) : '—'} />
                <StatCard label="API Keys" value={keyCount > 0 ? String(keyCount) : '—'} />
                <StatCard label="Plan" value="Free" sub="$0 / month" />
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Usage (last 14 days)</h2>
                <UsageChart data={mockUsage} />
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <ApiKeysSection authFetch={authFetch} />
                <CalculatorsSection authFetch={authFetch} />
              </div>
            </>
          )}

          {activeTab === 'calculators' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Calculators</h1>
                <p className="text-sm text-zinc-400 mt-1">Create and manage your calculator configurations.</p>
              </div>
              <CalculatorsSection authFetch={authFetch} />
            </>
          )}

          {activeTab === 'api-keys' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">API Keys</h1>
                <p className="text-sm text-zinc-400 mt-1">Create and manage API keys for server-side access.</p>
              </div>
              <ApiKeysSection authFetch={authFetch} />
            </>
          )}

          {activeTab === 'usage' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Usage</h1>
                <p className="text-sm text-zinc-400 mt-1">Monitor your API usage and rate limits.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-lg font-semibold mb-4">API Calls (last 14 days)</h2>
                <UsageChart data={mockUsage} />
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <SettingsTab authFetch={authFetch} token={token} />
          )}
        </div>
      </div>
    </div>
  );
}
