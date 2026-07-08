import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-zinc-500">{language}</span>
        <button
          onClick={handleCopy}
          className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
        <code className="text-sm font-mono text-zinc-200 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}
