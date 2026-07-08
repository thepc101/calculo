import { useState, useCallback, useEffect, useRef } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { ThemeConfig } from '@calculo/shared';
import { GraphCanvas } from './graph-canvas';

interface CalculatorProps {
  theme?: Partial<ThemeConfig>;
  mode?: 'basic' | 'scientific';
  compact?: boolean;
}

const engine = new CalculatorEngine();
type AngleMode = 'DEG' | 'RAD' | 'GRAD';

interface KeyDef {
  label: string;
  shift: string;
  action: string;
  kind: 'num' | 'op' | 'fn' | 'ctrl' | 'mem' | 'eq';
}

const K = (kind: KeyDef['kind'], label: string, action: string, shift: string = ''): KeyDef => ({ label, shift, action, kind });

// ─── BASIC MODE ────────────────────────────────────────────
const BASIC_KEYS: KeyDef[][] = [
  [K('ctrl','AC','clearAll'),  K('ctrl','(','('),     K('ctrl',')',')'),     K('op','÷','/'),     K('ctrl','⌫','del')],
  [K('mem','M+','m+'),        K('num','7','7'),      K('num','8','8'),      K('num','9','9'),    K('op','×','*')],
  [K('mem','M−','m−'),        K('num','4','4'),      K('num','5','5'),      K('num','6','6'),    K('op','−','-')],
  [K('mem','MR','mr'),        K('num','1','1'),      K('num','2','2'),      K('num','3','3'),    K('op','+','+')],
  [K('mem','MC','mc'),        K('num','0','0'),      K('num','.','.'),      K('ctrl','(−)','neg'), K('eq','=','eval')],
];

// ─── SCIENTIFIC MODE (TI-30XIIS layout) ────────────────────
const SCI_KEYS: KeyDef[][] = [
  [K('ctrl','2nd','shift'),  K('ctrl','DRG','mode'),   K('ctrl','DEL','del'),    K('ctrl','←','left'),    K('ctrl','→','right')],
  [K('fn','LOG','log','10ˣ'), K('fn','LN','ln','eˣ'),  K('ctrl','(','('),         K('ctrl',')',')'),        K('ctrl','CLR','clearAll')],
  [K('fn','π','pi','e'),      K('fn','SIN','sin','sin⁻¹'), K('fn','COS','cos','cos⁻¹'), K('fn','TAN','tan','tan⁻¹'), K('op','÷','/')],
  [K('fn','x²','sq','x³'),   K('op','^','^','x√'),      K('fn','√','sqrt','∛'),    K('fn','x⁻¹','inv','|x|'), K('op','×','*')],
  [K('num','7','7'),          K('num','8','8'),           K('num','9','9'),           K('fn','%','%','nCr'),     K('op','−','-')],
  [K('num','4','4'),          K('num','5','5'),           K('num','6','6'),           K('mem','M+','m+','STO'),  K('op','+','+')],
  [K('num','1','1'),          K('num','2','2'),           K('num','3','3'),           K('mem','M−','m−','RCL'),  K('eq','=','eval')],
  [K('num','0','0'),          K('num','.','.'),           K('ctrl','(−)','neg'),      K('ctrl','ANS','ans','RAND'), K('ctrl','MR','mr')],
];

const KEYS_MAP: Record<string, KeyDef[][]> = { basic: BASIC_KEYS, scientific: SCI_KEYS };

const SHIFT_MAP: Record<string, string> = {
  sin: 'asin', cos: 'acos', tan: 'atan', log: '10**', ln: 'e**',
  sq: '**3', sqrt: 'cbrt', inv: 'abs', '%': 'comb', '^': 'nthroot',
};
const SHIFT_LABEL: Record<string, string> = {
  sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', log: '10ˣ', ln: 'eˣ',
  sq: 'x³', sqrt: '∛', inv: '|x|', '%': 'nCr', '^': 'x√',
};

const GRAPH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function keyClasses(kind: KeyDef['kind']): string {
  const b = 'relative rounded-xl font-medium transition-all duration-100 active:scale-[0.93] select-none flex items-center justify-center leading-none cursor-pointer';
  switch (kind) {
    case 'num':  return `${b} bg-zinc-700/60 text-zinc-100 hover:bg-zinc-600/60`;
    case 'op':   return `${b} bg-zinc-600/40 text-[var(--calc-primary)] hover:bg-zinc-500/40`;
    case 'fn':   return `${b} bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70`;
    case 'ctrl': return `${b} bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50`;
    case 'mem':  return `${b} bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/40`;
    case 'eq':   return `${b} bg-[var(--calc-primary)] text-white hover:brightness-110 font-bold shadow-lg shadow-[var(--calc-primary)]/20`;
    default:     return `${b} bg-zinc-800/50 text-zinc-200`;
  }
}

export function Calculator({ theme: themeProp, mode: externalMode, compact = false }: CalculatorProps) {
  const T: ThemeConfig = {
    mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b',
    textColor: '#fafafa', fontFamily: 'Geist, system-ui, sans-serif',
    borderRadius: 12, spacing: 4, ...themeProp,
  };

  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ e: string; r: string }>>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [intMode, setIntMode] = useState<'basic' | 'scientific'>('basic');
  const [shift, setShift] = useState(false);
  const [angle, setAngle] = useState<AngleMode>('DEG');
  const [mem, setMem] = useState<number | null>(null);
  const [ans, setAns] = useState<string | null>(null);
  const [prb, setPrb] = useState(false);
  const [justEval, setJustEval] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphExprs, setGraphExprs] = useState<{ expr: string; color: string }[]>([
    { expr: 'sin(x)', color: GRAPH_COLORS[0] },
  ]);
  const dispRef = useRef<HTMLDivElement>(null);

  const mode = externalMode ?? intMode;
  const keys = KEYS_MAP[mode] ?? BASIC_KEYS;

  const insert = (t: string) => { setExpr(p => p + t); setHistIdx(-1); };

  const eval_ = useCallback((e: string) => {
    const s = e.replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/−/g, '-').replace(/√\(/g, 'sqrt(').replace(/\^/g, '**');
    return engine.evaluate({ expression: s, angleMode: angle.toLowerCase() as any });
  }, [angle]);

  const act = useCallback((a: string) => {
    if (a === 'shift') { setShift(p => !p); return; }
    if (a === 'mode') { setAngle(p => p === 'DEG' ? 'RAD' : p === 'RAD' ? 'GRAD' : 'DEG'); setShift(false); return; }
    if (a === 'prb') { setPrb(p => !p); setShift(false); return; }

    if (prb && ['nPr', 'nCr', 'fact', 'rand'].includes(a)) {
      setPrb(false); setShift(false);
      if (a === 'rand') { insert(String(Math.random())); return; }
      if (a === 'fact') { insert('!'); return; }
      insert(a === 'nPr' ? 'perm(' : 'comb(');
      return;
    }

    // Resolve shift
    let f = a;
    if (shift && a in SHIFT_MAP) { f = SHIFT_MAP[a]!; }
    setShift(false);

    // Count unclosed parens
    const countOpenParens = (s: string) => {
      let d = 0;
      for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; }
      return Math.max(0, d);
    };

    // ── Auto-close parens before eval ──
    if (f === 'eval' && expr) {
      const depth = countOpenParens(expr);
      const closed = depth > 0 ? expr + ')'.repeat(depth) : expr;
      if (depth > 0) setExpr(closed);
      const r = eval_(closed);
      if (r.error) { setResult('Error'); setJustEval(false); }
      else {
        const rs = String(r.result);
        setResult(rs); setAns(rs);
        setHistory(p => [...p, { e: closed, r: rs }]);
        setHistIdx(-1); setExpr('');
        setJustEval(true);
      }
      return;
    }

    // ── Auto-ans: just evaluated + operator → prepend ans ──
    const isOp = ['+', '-', '*', '/'].includes(f);
    if (justEval && isOp && ans) {
      setJustEval(false);
      insert(ans + f);
      return;
    }

    // ── Auto-close parens before operators ──
    if (isOp && expr) {
      const depth = countOpenParens(expr);
      if (depth > 0) {
        setExpr(p => p + ')'.repeat(depth) + f);
        return;
      }
    }

    // If just evaluated and user types a number/function, start fresh
    if (justEval && !isOp) {
      setJustEval(false);
    }

    if (f === 'clearAll') { setExpr(''); setResult('0'); setHistory([]); setHistIdx(-1); setAns(null); setJustEval(false); return; }
    if (f === 'del') { setExpr(p => p.slice(0, -1)); return; }
    if (f === 'neg') { setExpr(p => p.startsWith('-') ? p.slice(1) : '-' + p); return; }
    if (f === 'left' || f === 'right') return;
    if (f === 'pi') { insert('π'); return; }
    if (f === 'ans') { if (ans) insert(ans); return; }
    if (f === 'mr') { if (mem !== null) insert(String(mem)); return; }

    if (['sin','cos','tan','asin','acos','atan','log','ln','sqrt','cbrt','abs','comb','perm'].includes(f)) { insert(f + '('); return; }
    if (f === '10**') { insert('10^('); return; }
    if (f === 'e**') { insert('e^('); return; }
    if (f === 'nthroot') { insert('root('); return; }
    if (f === 'sq') { insert('^2'); return; }
    if (f === '**3') { insert('^3'); return; }
    if (f === 'inv') { insert('abs('); return; }

    if (f === 'm+') { const v = parseFloat(result); if (!isNaN(v)) setMem(p => (p ?? 0) + v); return; }
    if (f === 'm−') { const v = parseFloat(result); if (!isNaN(v)) setMem(p => (p ?? 0) - v); return; }

    if (f === 'eval') {
      if (!expr) return;
      const r = eval_(expr);
      if (r.error) { setResult('Error'); setJustEval(false); }
      else {
        const rs = String(r.result);
        setResult(rs); setAns(rs);
        setHistory(p => [...p, { e: expr, r: rs }]);
        setHistIdx(-1); setExpr('');
        setJustEval(true);
      }
      return;
    }
    insert(f);
  }, [expr, shift, angle, mem, result, eval_, ans, prb]);

  const navHist = useCallback((d: -1 | 1) => {
    if (!history.length) return;
    const i = histIdx + d;
    if (i < -1 || i >= history.length) return;
    setHistIdx(i);
    setExpr(i === -1 ? '' : history[history.length - 1 - i]!.e);
  }, [history, histIdx]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key;

      // ── Core controls ──
      if (key === 'Enter' || key === '=') { e.preventDefault(); act('eval'); return; }
      if (key === 'Backspace') { e.preventDefault(); act('del'); return; }
      if (key === 'Escape') { act('clearAll'); return; }
      if (key === 'Delete') { act('clearAll'); return; }

      // ── History navigation ──
      if (key === 'ArrowUp') { e.preventDefault(); navHist(1); return; }
      if (key === 'ArrowDown') { e.preventDefault(); navHist(-1); return; }
      if (key === 'ArrowLeft') { navHist(-1); return; }
      if (key === 'ArrowRight') { navHist(1); return; }

      // ── Numbers ──
      if (/^[0-9]$/.test(key)) { act(key); return; }

      // ── Operators ──
      if (key === '+') { act('+'); return; }
      if (key === '-') { act('-'); return; }
      if (key === '*') { act('*'); return; }
      if (key === '/') { e.preventDefault(); act('/'); return; }

      // ── Parentheses ──
      if (key === '(') { act('('); return; }
      if (key === ')') { act(')'); return; }

      // ── Decimal & power ──
      if (key === '.') { act('.'); return; }
      if (key === '^') { act('^'); return; }

      // ── Scientific shortcuts (only in scientific mode) ──
      if (mode === 'scientific') {
        if (key === 'p') { act('pi'); return; }
        if (key === 's') { act('sin'); return; }
        if (key === 'c') { act('cos'); return; }
        if (key === 't') { act('tan'); return; }
        if (key === 'l') { act('log'); return; }
        if (key === 'n') { act('ln'); return; }
        if (key === 'r') { act('sqrt'); return; }
        if (key === '!') { insert('!'); return; }
        if (key === '%') { act('%'); return; }
        if (key === 'a') { act('ans'); return; }
        if (key === 'm') { act('m+'); return; }
        if (key === 'M') { act('m−'); return; }
        if (key === 'x') { insert('x'); return; }
        if (key === 'e' && !e.ctrlKey && !e.metaKey) { insert('e'); return; }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [act, navHist, mode, insert]);

  useEffect(() => {
    if (dispRef.current) dispRef.current.scrollLeft = dispRef.current.scrollWidth;
  }, [expr]);

  const dLabel = (k: KeyDef) => shift && k.shift ? k.shift : k.label;
  const sLabel = (k: KeyDef) => shift ? '' : (SHIFT_LABEL[k.action] ?? k.shift);

  return (
    <div className="w-full h-full select-none flex flex-col" style={{ '--calc-primary': T.primaryColor } as React.CSSProperties}>
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: T.backgroundColor, color: T.textColor, fontFamily: T.fontFamily }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          {!externalMode && (
            <div className="flex items-center gap-0.5">
              {(['basic', 'scientific'] as const).map(m => (
                <button key={m} onClick={() => { setIntMode(m); setExpr(''); setResult('0'); setHistory([]); setHistIdx(-1); setGraphOpen(false); }}
                  className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-semibold transition-all"
                  style={{ backgroundColor: mode === m ? `color-mix(in srgb, ${T.primaryColor} 20%, transparent)` : 'transparent', color: mode === m ? T.primaryColor : `${T.textColor}40` }}
                >{m === 'basic' ? 'Basic' : 'Sci'}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-wider" style={{ color: `${T.textColor}50` }}>
            {mode === 'scientific' && <span>{angle}</span>}
            {mem !== null && <span style={{ color: '#facc15', opacity: 0.6 }}>M</span>}
            {shift && <span style={{ color: '#34d399', opacity: 0.8 }}>2ND</span>}
            <button onClick={() => setGraphOpen(p => !p)}
              className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider transition-all"
              style={{ backgroundColor: graphOpen ? `color-mix(in srgb, ${T.primaryColor} 20%, transparent)` : 'transparent', color: graphOpen ? T.primaryColor : `${T.textColor}40` }}
            >f(x)</button>
          </div>
        </div>

        {/* ── LCD Display ── */}
        <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#111113', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="px-3 pt-2 pb-1">
            <div ref={dispRef} className="overflow-x-auto scrollbar-none font-mono text-xs leading-relaxed" style={{ color: `${T.textColor}55`, minHeight: '1.2em', whiteSpace: 'nowrap' }}>
              {expr || (ans && result === '0' ? '' : '\u00A0')}
            </div>
            <div className="font-mono font-semibold truncate leading-none text-right" style={{ fontSize: compact ? '1.25rem' : '1.75rem' }}>
              {result}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-1.5 text-[8px] font-mono tracking-widest uppercase" style={{ color: `${T.textColor}30` }}>
              {mode === 'scientific' && <span>{angle}</span>}
              <span>{mode === 'basic' ? 'BASIC' : 'SCI'}</span>
            </div>
            {history.length > 0 && <span className="text-[8px] font-mono" style={{ color: `${T.textColor}25` }}>{history.length}</span>}
          </div>
        </div>

        {/* ── PRB submenu ── */}
        {prb && (
          <div className="mx-3 mb-2 flex gap-1.5">
            {['nPr', 'nCr', 'fact', 'rand'].map(f => (
              <button key={f} onClick={() => act(f)}
                className="flex-1 py-1.5 text-[10px] rounded-lg font-mono uppercase tracking-wider transition-all active:scale-95"
                style={{ backgroundColor: `color-mix(in srgb, ${T.primaryColor} 15%, transparent)`, color: T.primaryColor }}
              >{f === 'fact' ? 'x!' : f === 'rand' ? 'Ran#' : f}</button>
            ))}
          </div>
        )}

        {/* ── Graph panel (Desmos-style) ── */}
        {graphOpen && (
          <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            <GraphCanvas expressions={graphExprs} width={320} height={180} />
            <div className="px-2 py-1.5 space-y-1" style={{ backgroundColor: '#0d0d0f' }}>
              {graphExprs.map((ge, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input type="color" value={ge.color}
                    onChange={e => { const n = [...graphExprs]; n[i] = { ...n[i]!, color: e.target.value }; setGraphExprs(n); }}
                    className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0 shrink-0" />
                  <input value={ge.expr} placeholder="f(x) = ..."
                    onChange={e => { const n = [...graphExprs]; n[i] = { ...n[i]!, expr: e.target.value }; setGraphExprs(n); }}
                    onKeyDown={e => e.stopPropagation()}
                    className="flex-1 h-5 rounded bg-zinc-800/60 px-2 text-[10px] font-mono text-zinc-300 border border-zinc-700/40 focus:outline-none focus:border-zinc-500/50" />
                  {graphExprs.length > 1 && (
                    <button onClick={() => setGraphExprs(p => p.filter((_, j) => j !== i))}
                      className="w-3.5 h-3.5 rounded text-zinc-600 hover:text-zinc-300 text-[9px] flex items-center justify-center">×</button>
                  )}
                </div>
              ))}
              {graphExprs.length < 6 && (
                <button onClick={() => setGraphExprs(p => [...p, { expr: '', color: GRAPH_COLORS[p.length % GRAPH_COLORS.length]! }])}
                  className="w-full py-1 text-[9px] rounded font-mono uppercase tracking-wider transition-all active:scale-95"
                  style={{ backgroundColor: `color-mix(in srgb, ${T.primaryColor} 10%, transparent)`, color: `${T.primaryColor}80` }}
                >+ add expression</button>
              )}
            </div>
          </div>
        )}

        {/* ── Key grid ── */}
        <div className="flex-1 flex flex-col gap-[3px] px-2 pb-2 auto-rows-fr">
          {keys.map((row, ri) => (
            <div key={ri} className="flex gap-[3px] flex-1">
              {row.map((k, ci) => {
                const sl = sLabel(k);
                const dl = dLabel(k);
                return (
                  <button key={ci} onClick={() => act(k.action)}
                    className={`${keyClasses(k.kind)} flex-1 text-xs relative overflow-hidden ${compact ? 'min-h-[32px]' : 'min-h-[38px]'}`}
                    style={k.kind === 'eq' ? { backgroundColor: T.primaryColor } : k.action === 'shift' && shift ? { backgroundColor: `color-mix(in srgb, ${T.primaryColor} 25%, transparent)`, color: T.primaryColor } : undefined}
                  >
                    {sl && !shift && (
                      <span className="absolute top-0.5 left-1 text-[7px] font-semibold tracking-wide pointer-events-none" style={{ color: '#facc15', opacity: 0.7 }}>{sl}</span>
                    )}
                    <span className={sl && !shift ? 'mt-1' : ''}>{dl}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <div className="flex gap-1.5 px-3 pb-1">
            <button onClick={() => { setHistory([]); setHistIdx(-1); setResult('0'); setAns(null); }}
              className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-medium transition-all opacity-35 hover:opacity-70 active:scale-95"
              style={{ backgroundColor: `color-mix(in srgb, ${T.textColor} 6%, transparent)`, color: T.textColor }}
            >Clear</button>
          </div>
        )}

        {/* ── Branding ── */}
        <div className="flex justify-center pb-2 pt-0.5">
          <a href="https://calculo-fawn.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono tracking-[0.2em] uppercase transition-all hover:opacity-80 active:scale-95"
            style={{ color: `${T.textColor}20` }}
          >calculo</a>
        </div>
      </div>
    </div>
  );
}
