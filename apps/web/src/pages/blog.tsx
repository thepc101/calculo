const posts = [
  { title: 'Introducing calculo', date: '2026-01-15', excerpt: 'The infrastructure for calculations is here. Learn what we\'re building and why.' },
  { title: 'Building a Graphing Engine at 60fps', date: '2026-01-10', excerpt: 'How we built our graphing engine to render complex mathematical functions smoothly.' },
  { title: 'Why We Built calculo', date: '2026-01-05', excerpt: 'Every platform deserves a great calculator. Here\'s why we decided to build the infrastructure layer.' },
];

export function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-4">Blog</h1>
      <p className="text-lg text-zinc-400 mb-12">
        Updates, deep dives, and thoughts from the calculo team.
      </p>
      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.title} className="border-b border-zinc-800 pb-8">
            <time className="text-xs text-zinc-500">{post.date}</time>
            <h2 className="text-xl font-semibold mt-2 mb-2 hover:text-zinc-300 transition-colors">
              <a href="#">{post.title}</a>
            </h2>
            <p className="text-sm text-zinc-400">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
