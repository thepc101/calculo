import { useState, useEffect, useCallback } from 'react';
import { Link } from '@tanstack/react-router';

interface ForumPost {
  id: string;
  title: string;
  body: string;
  pinned: number;
  createdAt: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

interface ForumComment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initial = (name ?? '?')[0]?.toUpperCase() ?? '?';
  if (url) {
    return <img src={url} alt="" className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
      {initial}
    </div>
  );
}

// ── Post List ───────────────────────────────────────────────

function PostList({ onSelect }: { onSelect: (id: string) => void }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forum')
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-zinc-500 py-8">Loading...</div>;
  if (posts.length === 0) return <div className="text-sm text-zinc-500 py-8">No posts yet. Be the first to start a discussion.</div>;

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <button
          key={post.id}
          onClick={() => onSelect(post.id)}
          className="w-full text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-start gap-3">
            <Avatar url={post.authorAvatarUrl} name={post.authorName} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {post.pinned > 0 && <span className="text-[10px] font-mono uppercase text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded">Pinned</span>}
                <h3 className="font-semibold text-sm truncate">{post.title}</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{post.body}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                <span>{post.authorName ?? 'Anonymous'}</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Post Detail ─────────────────────────────────────────────

function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const [post, setPost] = useState<(ForumPost & { comments: ForumComment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('calculo_token');

  const load = useCallback(() => {
    fetch(`/api/forum/${postId}`)
      .then(r => r.json())
      .then(d => setPost(d.post))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const addComment = async () => {
    if (!commentText.trim() || !token) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/forum/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setPost(p => p ? { ...p, comments: [data.comment, ...p.comments] } : p);
        setCommentText('');
      } else {
        setError(data.error?.message ?? 'Failed to post comment');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-zinc-500 py-8">Loading...</div>;
  if (!post) return <div className="text-sm text-zinc-500 py-8">Post not found.</div>;

  return (
    <div>
      <button onClick={onBack} className="text-sm text-zinc-400 hover:text-zinc-100 mb-4 transition-colors">← Back to forum</button>

      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-6">
        <div className="flex items-start gap-3">
          <Avatar url={post.authorAvatarUrl} name={post.authorName} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{post.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span>{post.authorName ?? 'Anonymous'}</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{post.body}</p>
          </div>
        </div>
      </div>

      {/* Comments */}
      <h2 className="text-sm font-semibold text-zinc-400 mb-3">{post.comments.length} {post.comments.length === 1 ? 'Reply' : 'Replies'}</h2>

      <div className="space-y-3 mb-6">
        {post.comments.map((c) => (
          <div key={c.id} className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30">
            <div className="flex items-start gap-3">
              <Avatar url={c.authorAvatarUrl} name={c.authorName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="text-zinc-300 font-medium">{c.authorName ?? 'Anonymous'}</span>
                  <span>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-300 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add comment */}
      {token ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
          />
          {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
          <div className="flex justify-end mt-2">
            <button
              onClick={addComment}
              disabled={submitting || !commentText.trim()}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500 text-center py-4">
          <Link to="/login" className="text-zinc-300 hover:text-zinc-100 underline">Sign in</Link> to reply.
        </div>
      )}
    </div>
  );
}

// ── New Post Form ───────────────────────────────────────────

function NewPostForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('calculo_token');

  const submit = async () => {
    if (!title.trim() || !body.trim() || !token) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        onCreated(data.post.id);
      } else {
        setError(data.error?.message ?? 'Failed to create post');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
      <h3 className="font-semibold text-sm">New Post</h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={128}
        className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        maxLength={8192}
        className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
      />
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}

// ── Main Forum Page ─────────────────────────────────────────

export function ForumPage() {
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('calculo_token') : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Forum</h1>
          <p className="text-sm text-zinc-400 mt-1">Community discussions, feature requests, and help.</p>
        </div>
        {token && view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            + New Post
          </button>
        )}
      </div>

      {view === 'list' && (
        <PostList onSelect={(id) => { setSelectedPostId(id); setView('detail'); }} />
      )}

      {view === 'new' && (
        <NewPostForm onCreated={(id) => { setSelectedPostId(id); setView('detail'); }} />
      )}

      {view === 'detail' && selectedPostId && (
        <PostDetail postId={selectedPostId} onBack={() => { setView('list'); setSelectedPostId(null); }} />
      )}

      {!token && view === 'list' && (
        <div className="mt-6 text-center text-sm text-zinc-500">
          <Link to="/login" className="text-zinc-300 hover:text-zinc-100 underline">Sign in</Link> to create posts and reply.
        </div>
      )}
    </div>
  );
}
