import React from 'react';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/`([^`]+)`/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    let earliest = remaining.length;
    let match: RegExpMatchArray | null = null;
    let type: 'code' | 'bold' | 'link' = 'code';

    if (codeMatch && codeMatch.index! < earliest) { earliest = codeMatch.index!; match = codeMatch; type = 'code'; }
    if (boldMatch && boldMatch.index! < earliest) { earliest = boldMatch.index!; match = boldMatch; type = 'bold'; }
    if (linkMatch && linkMatch.index! < earliest) { earliest = linkMatch.index!; match = linkMatch; type = 'link'; }

    if (!match) {
      parts.push(remaining);
      break;
    }

    if (match.index! > 0) parts.push(remaining.slice(0, match.index));
    if (type === 'code') parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200 text-xs font-mono">{match[1]}</code>);
    if (type === 'bold') parts.push(<strong key={key++} className="font-semibold text-zinc-100">{match[1]}</strong>);
    if (type === 'link') parts.push(<a key={key++} href={match[2]} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{match[1]}</a>);
    remaining = remaining.slice(match.index! + match[0].length);
  }

  return parts;
}

function renderCodeBlock(code: string, lang?: string): React.ReactNode {
  return (
    <div className="relative group my-4">
      {lang && <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-mono">{lang}</div>}
      <button
        onClick={() => navigator.clipboard.writeText(code)}
        className="absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >Copy</button>
      <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto"><code className="text-sm font-mono text-zinc-200 leading-relaxed">{code}</code></pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLang = '';
  let inTable = false;
  let tableLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      const Tag = inList === 'ul' ? 'ul' : 'ol';
      elements.push(<Tag key={key++} className="space-y-1 my-3 ml-5">{listItems}</Tag>);
      listItems = [];
      inList = null;
    }
  }

  function flushTable() {
    if (inTable && tableLines.length >= 2) {
      const headerCells = tableLines[0]!.split('|').filter(Boolean).map(s => s.trim());
      const bodyLines = tableLines.slice(2);
      const rows: React.ReactNode[] = [];
      rows.push(
        <thead key="h">
          <tr className="border-b border-zinc-700">{headerCells.map((c, i) => <th key={i} className="text-left py-2 px-3 text-xs font-semibold text-zinc-300">{c}</th>)}</tr>
        </thead>
      );
      if (bodyLines.length > 0) {
        rows.push(
          <tbody key="b">
            {bodyLines.map((line, ri) => {
              const cells = line.split('|').filter(Boolean).map(s => s.trim());
              return <tr key={ri} className="border-b border-zinc-800/50">{cells.map((c, ci) => <td key={ci} className="py-2 px-3 text-sm text-zinc-300">{c}</td>)}</tr>;
            })}
          </tbody>
        );
      }
      elements.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse rounded-xl overflow-hidden border border-zinc-800">{rows}</table>
        </div>
      );
      tableLines = [];
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (inCodeBlock) {
      if (line.startsWith('```')) {
        inCodeBlock = false;
        elements.push(renderCodeBlock(codeBlockLines.join('\n'), codeLang));
        codeBlockLines = [];
        codeLang = '';
        continue;
      }
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith('```')) {
      flushList();
      flushTable();
      codeLang = line.slice(3).trim();
      inCodeBlock = true;
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      if (elements.length > 0 && elements[elements.length - 1] !== '\n') {
        elements.push(<div key={key++} className="h-3" />);
      }
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      if (!inTable) { inTable = true; tableLines = []; }
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={key++} className="border-zinc-800 my-6" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={key++} className="text-lg font-semibold text-zinc-100 mt-8 mb-3">{renderInline(trimmed.slice(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={key++} className="text-xl font-bold text-zinc-100 mt-10 mb-4">{renderInline(trimmed.slice(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={key++} className="text-3xl font-bold text-zinc-100 mt-6 mb-4">{renderInline(trimmed.slice(2))}</h1>);
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      flushList();
      const text = trimmed.slice(2);
      const isWarning = text.startsWith('**Warning');
      const isNote = text.startsWith('**Note');
      elements.push(
        <div key={key++} className={`my-4 p-4 rounded-xl border ${isWarning ? 'border-amber-800/50 bg-amber-950/30' : isNote ? 'border-blue-800/50 bg-blue-950/30' : 'border-zinc-800 bg-zinc-900/50'}`}>
          <p className="text-sm text-zinc-300 leading-relaxed">{renderInline(text)}</p>
        </div>
      );
      continue;
    }

    // Lists
    const ulMatch = trimmed.match(/^[-*]\s(.+)/);
    const olMatch = trimmed.match(/^\d+\.\s(.+)/);
    if (ulMatch) {
      if (inList !== 'ul') { flushList(); inList = 'ul'; }
      listItems.push(<li key={key++} className="text-sm text-zinc-300 leading-relaxed">{renderInline(ulMatch[1]!)}</li>);
      continue;
    }
    if (olMatch) {
      if (inList !== 'ol') { flushList(); inList = 'ol'; }
      listItems.push(<li key={key++} className="text-sm text-zinc-300 leading-relaxed">{renderInline(olMatch[1]!)}</li>);
      continue;
    }

    flushList();

    // Regular paragraph
    elements.push(<p key={key++} className="text-sm text-zinc-300 leading-relaxed my-2">{renderInline(trimmed)}</p>);
  }

  flushList();
  flushTable();
  if (inCodeBlock) elements.push(renderCodeBlock(codeBlockLines.join('\n')));

  return <div className="space-y-1">{elements}</div>;
}
