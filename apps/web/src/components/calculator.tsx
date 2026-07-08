import { useState, useCallback, useEffect, useRef } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { ThemeConfig } from '@calculo/shared';
import { GraphCanvas } from './graph-canvas';

interface CalculatorProps {
  theme?: Partial<ThemeConfig>;
  mode?: 'basic' | 'scientific' | 'graphing';
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

const SCIENTIFIC_KEYS: KeyDef[][] = [
  [K('ctrl','2nd','shift'),   K('ctrl','DRG','mode'),    K('ctrl','DEL','del'),     K('ctrl','←','left'),     K('ctrl','→','right')],
  [K('fn','LOG','log', '10ˣ'), K('fn','PRB','prb','nPr'), K('ctrl','(','('),          K('ctrl',')',')'),         K('ctrl','CLR','clearAll')],
  [K('fn','π','pi','e'),       K('fn','SIN','sin','sin⁻¹'), K('fn','COS','cos','cos⁻¹'), K('fn','TAN','tan','tan⁻¹'), K('op','÷','/')],
  [K('fn','x²','sq','x³'),    K('op','^','^','x√'),       K('fn','√','sqrt','∛'),     K('fn','x⁻¹','inv','|x|'), K('op','×','*')],
  [K('num','7','7'),           K('num','8','8'),            K('num','9','9'),            K('fn','%','%','nCr'),      K('op','−','-')],
  [K('num','4','4'),           K('num','5','5'),            K('num','6','6'),            K('mem','M+','m+','STO'),   K('op','+','+')],
  [K('num','1','1'),           K('num','2','2'),            K('num','3','3'),            K('mem','M−','m−','RCL'),   K('eq','=','eval')],
  [K('num','0','0'),           K('num','.','.'),            K('ctrl','(−)','neg'),       K('ctrl','ANS','ans','RAND'), K('ctrl','MR','mr')],
];

const BASIC_KEYS: KeyDef[][] = [
  [K('ctrl','AC','clearAll'),  K('ctrl','(','('),          K('ctrl',')',')'),         K('op','÷','/'),          K('ctrl','⌫','del')],
  [K('mem','M+','m+'),        K('num','7','7'),           K('num','8','8'),          K('num','9','9'),         K('op','×','*')],
  [K('mem','M−','m−'),        K('num','4','4'),           K('num','5','5'),          K('num','6','6'),         K('op','−','-')],
  [K('mem','MR','mr'),        K('num','1','1'),           K('num','2','2'),          K('num','3','3'),         K('op','+','+')],
  [K('mem','MC','mc'),        K('num','0','0'),           K('num','.','.'),          K('ctrl','(−)','neg'),    K('eq','=','eval')],
];

const GRAPH_KEYS: KeyDef[][] = [
  [K('ctrl','2nd','shift'),   K('graph','W','window'),   K('graph','Z','zoom'),     K('ctrl','CLR','clearAll'), K('ctrl','⌫','del')],
  [K('fn','SIN','sin','sin⁻¹'), K('fn','COS','cos','cos⁻¹'), K('fn','TAN','tan','tan⁻¹'), K('op','^','^'),       K('fn','√','sqrt')],
  [K('fn','LOG','log','10ˣ'), K('fn','LN','ln','eˣ'),    K('ctrl','π','pi'),         K('op','÷','/'),           K('op','×','*')],
  [K('num','7','7'),          K('num','8','8'),            K('num','9','9'),           K('op','−','-'),           K('op','+','+')],
  [K('num','4','4'),          K('num','5','5'),            K('num','6','6'),           K('fn','x²','sq'),         K('eq','=','eval')],
  [K('num','1','1'),          K('num','2','2'),            K('num','3','3'),           K('num','0','0'),           K('num','.','.')],
];

const KEYS_MAP: Record<string, KeyDef[][]> = { basic: BASIC_KEYS, scientific: SCIENTIFIC_KEYS, graphing: GRAPH_KEYS };

function toCssVars(t: ThemeConfig): React.CSSProperties {
  return {
    '--calc-bg': t.backgroundColor,
    '--calc-text': t.textColor,
    '--calc-primary': t.primaryColor,
    '--calc-radius': `${t.borderRadius}px`,
    '--calc-spacing': `${t.spacing}px`,
  } as React.CSSProperties;
}

function keyClasses(kind: KeyDef['kind']): string {
  const base = 'relative rounded-xl font-medium transition-all duration-100 active:scale-[0.93] select-none flex items-center justify-center leading-none cursor-pointer';
  switch (kind) {
    case 'num':  return `${base} bg-zinc-700/60 text-zinc-100 hover:bg-zinc-600/60 active:bg-zinc-500/40`;
    case 'op':   return `${base} bg-zinc-600/40 text-[var(--calc-primary)] hover:bg-zinc-500/40 active:bg-zinc-400/30`;
    case 'fn':   return `${base} bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70 active:bg-zinc-600/50`;
    case 'ctrl': return `${base} bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 active:bg-zinc-600/40`;
    case 'mem':  return `${base} bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/40 active:bg-zinc-600/30`;
    case 'eq':   return `${base} bg-[var(--calc-primary)] text-white hover:brightness-110 active:brightness-90 font-bold shadow-lg shadow-[var(--calc-primary)]/20`;
    default:     return `${base} bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700/50`;
  }
}

const SHIFT_MAP: Record<string, string> = {
  sin: 'asin', cos: 'acos', tan: 'atan', log: '10**', ln: 'e**',
  sq: '**3', sqrt: 'cbrt', inv: 'abs', '%': 'comb', '^': 'nthroot',
};
const SHIFT_LABEL: Record<string, string> = {
  sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', log: '10ˣ', ln: 'eˣ',
  sq: 'x³', sqrt: '∛', inv: '|x|', '%': 'nCr', '^': 'x√',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Calculator({ theme: themeProp, mode: externalMode, compact = false }: CalculatorProps) {
  const resolvedTheme: ThemeConfig = {
    mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b',
    textColor: '#fafafa', fontFamily: 'Geist, system-ui, sans-serif',
    borderRadius: 12, spacing: 4, ...themeProp,
  };

  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [internalMode, setInternalMode] = useState<'basic' | 'scientific' | 'graphing'>('basic');
  const [shiftOn, setShiftOn] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [memory, setMemory] = useState<number | null>(null);
  const [ans, setAns] = useState<string | null>(null);
  const [graphExprs, setGraphExprs] = useState<{ expr: string; color: string }[]>([
    { expr: 'sin(x)', color: '#3b82f6' },
  ]);
  const [showGraph, setShowGraph] = useState(false);
  const [prbMenu, setPrbMenu] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  const mode = externalMode ?? internalMode;
  const keys = KEYS_MAP[mode] ?? SCIENTIFIC_KEYS;

  const insert = (text: string) => {
    setExpression(prev => prev + text);
    setHistoryIdx(-1);
  };

  const evalExpr = useCallback((expr: string) => {
    const subst = expr
      .replace(/π/g, 'pi')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/√\(/g, 'sqrt(')
      .replace(/\^/g, '**');
    return engine.evaluate({ expression: subst, angleMode: angleMode.toLowerCase() as any });
  }, [angleMode]);

  const handleAction = useCallback((action: string) => {
    if (action === 'shift') { setShiftOn(p => !p); return; }

    if (action === 'mode') {
      setAngleMode(p => p === 'DEG' ? 'RAD' : p === 'RAD' ? 'GRAD' : 'DEG');
      setShiftOn(false);
      return;
    }

    if (action === 'prb') { setPrbMenu(p => !p); setShiftOn(false); return; }

    if (prbMenu && ['nPr', 'nCr', 'fact', 'rand'].includes(action)) {
      setPrbMenu(false);
      if (action === 'rand') { insert(String(Math.random())); return; }
      if (action === 'fact') { insert('!'); return; }
      insert(action === 'nPr' ? 'perm(' : 'comb(');
      setShiftOn(false);
      return;
    }

    let finalAction = action;

    if (shiftOn) {
      if (action in SHIFT_MAP) {
        finalAction = SHIFT_MAP[action]!;
      }
      setShiftOn(false);
    }

    if (finalAction === 'clearAll') {
      setExpression(''); setResult('0'); setHistory([]); setHistoryIdx(-1); setAns(null); return;
    }
    if (finalAction === 'del') { setExpression(p => p.slice(0, -1)); return; }
    if (finalAction === 'neg') { setExpression(p => p.startsWith('-') ? p.slice(1) : '-' + p); return; }
    if (finalAction === 'left' || finalAction === 'right') return;
    if (finalAction === 'pi') { insert('π'); return; }
    if (finalAction === 'ans') { if (ans) insert(ans); return; }
    if (finalAction === 'mr') { if (memory !== null) insert(String(memory)); return; }
    if (finalAction === 'window' || finalAction === 'zoom') return;

    if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'cbrt', 'abs', 'comb', 'perm', '10**', 'e**', 'nthroot'].includes(finalAction)) {
      if (finalAction === '10**') { insert('10^('); return; }
      if (finalAction === 'e**') { insert('e^('); return; }
      if (finalAction === 'nthroot') { insert('root('); return; }
      insert(`${finalAction}(`);
      return;
    }
    if (finalAction === 'sq') { insert('^2'); return; }
    if (finalAction === '**3') { insert('^3'); return; }
    if (finalAction === 'inv') { insert('abs('); return; }

    if (finalAction === 'm+') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(p => (p ?? 0) + v);
      return;
    }
    if (finalAction === 'm−') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(p => (p ?? 0) - v);
      return;
    }

    if (finalAction === 'eval') {
      if (!expression) return;
      const res = evalExpr(expression);
      if (res.error) { setResult(`Error`); }
      else {
        const rs = typeof res.result === 'number' ? String(res.result) : String(res.result);
        setResult(rs);
        setAns(rs);
        setHistory(p => [...p, { expr: expression, result: rs }]);
        setHistoryIdx(-1);
        if (mode === 'graphing') {
          setGraphExprs([{ expr: expression.replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'), color: COLORS[0]! }]);
          setShowGraph(true);
        }
        setExpression('');
      }
      return;
    }

    insert(finalAction);
  }, [expression, shiftOn, angleMode, memory, result, mode, evalExpr, ans, prbMenu]);

  const navigateHistory = useCallback((dir: -1 | 1) => {
    if (history.length === 0) return;
    const newIdx = historyIdx + dir;
    if (newIdx < -1 || newIdx >= history.length) return;
    setHistoryIdx(newIdx);
    if (newIdx === -1) { setExpression(''); }
    else { setExpression(history[history.length - 1 - newIdx]!.expr); }
  }, [history, historyIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAction('eval'); }
      else if (e.key === 'Backspace') handleAction('del');
      else if (e.key === 'Escape') handleAction('clearAll');
      else if (e.key === 'ArrowLeft') navigateHistory(-1);
      else if (e.key === 'ArrowRight') navigateHistory(1);
      else if (/^[0-9+\-*/.^()]$/.test(e.key)) handleAction(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction, navigateHistory]);

  useEffect(() => {
    if (displayRef.current) displayRef.current.scrollLeft = displayRef.current.scrollWidth;
  }, [expression]);

  const dispShift = (k: KeyDef) => shiftOn && k.shift ? k.shift : k.label;
  const shiftLabel = (k: KeyDef) => shiftOn ? '' : (SHIFT_LABEL[k.action] ?? k.shift);

  const modeBtns = !externalMode ? (
    <div className="flex items-center gap-0.5">
      {(['basic', 'scientific', 'graphing'] as const).map(m => (
        <button key={m} onClick={() => { setInternalMode(m); setExpression(''); setResult('0'); setHistory([]); setHistoryIdx(-1); }}
          className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-semibold transition-all duration-150"
          style={{
            backgroundColor: mode === m ? `color-mix(in srgb, ${resolvedTheme.primaryColor} 20%, transparent)` : 'transparent',
            color: mode === m ? resolvedTheme.primaryColor : `${resolvedTheme.textColor}40`,
          }}
        >{m === 'basic' ? 'Basic' : m === 'scientific' ? 'Sci' : 'Graph'}</button>
      ))}
    </div>
  ) : null;

  return (
    <div className="w-full h-full select-none flex flex-col" style={{ ...toCssVars(resolvedTheme), fontFamily: resolvedTheme.fontFamily, color: resolvedTheme.textColor }}>
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: resolvedTheme.backgroundColor }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          {modeBtns}
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-wider">
            <span style={{ color: `${resolvedTheme.textColor}50` }}>{angleMode}</span>
            {memory !== null && <span style={{ color: '#facc15', opacity: 0.6 }}>M</span>}
            {shiftOn && <span style={{ color: '#34d399', opacity: 0.8 }}>2ND</span>}
          </div>
        </div>

        {/* LCD Display */}
        <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#111113', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="px-3 pt-2 pb-1">
            {/* Expression line */}
            <div ref={displayRef} className="overflow-x-auto scrollbar-none font-mono text-xs leading-relaxed" style={{ color: `${resolvedTheme.textColor}55`, minHeight: '1.2em', whiteSpace: 'nowrap' }}>
              {expression || (ans && result === '0' ? '' : '\u00A0')}
            </div>
            {/* Result line */}
            <div className="font-mono font-semibold truncate leading-none text-right" style={{ fontSize: compact ? '1.25rem' : '1.75rem', color: resolvedTheme.textColor }}>
              {result}
            </div>
          </div>
          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-1.5 text-[8px] font-mono tracking-widest uppercase" style={{ color: `${resolvedTheme.textColor}30` }}>
              <span>{angleMode}</span>
              <span>·</span>
              <span>{mode === 'basic' ? 'BASIC' : mode === 'scientific' ? 'SCI' : 'GRAPH'}</span>
            </div>
            {history.length > 0 && (
              <span className="text-[8px] font-mono" style={{ color: `${resolvedTheme.textColor}25` }}>
                {history.length} {history.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
        </div>

        {/* PRB submenu */}
        {prbMenu && (
          <div className="mx-3 mb-2 flex gap-1.5">
            {['nPr', 'nCr', 'fact', 'rand'].map(f => (
              <button key={f} onClick={() => handleAction(f)}
                className="flex-1 py-1.5 text-[10px] rounded-lg font-mono uppercase tracking-wider transition-all active:scale-95"
                style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 15%, transparent)`, color: resolvedTheme.primaryColor }}
              >{f === 'fact' ? 'x!' : f === 'rand' ? 'Ran#' : f}</button>
            ))}
          </div>
        )}

        {/* Graph area */}
        {mode === 'graphing' && showGraph && graphExprs.length > 0 && !expression && (
          <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            <GraphCanvas expressions={graphExprs} width={320} height={180} />
          </div>
        )}

        {/* Key grid */}
        <div className="flex-1 flex flex-col gap-[3px] px-2 pb-2 auto-rows-fr">
          {keys.map((row, ri) => (
            <div key={ri} className="flex gap-[3px] flex-1">
              {row.map((k, ci) => {
                const isActive = shiftOn && k.action === 'shift';
                const sLabel = shiftLabel(k);
                const display = dispShift(k);
                return (
                  <button key={ci} onClick={() => handleAction(k.action)}
                    className={`${keyClasses(k.kind)} flex-1 text-xs relative overflow-hidden ${compact ? 'min-h-[32px]' : 'min-h-[38px]'}`}
                    style={k.kind === 'eq' ? { backgroundColor: resolvedTheme.primaryColor } : k.action === 'shift' && shiftOn ? { backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 25%, transparent)`, color: resolvedTheme.primaryColor } : undefined}
                  >
                    {/* 2nd function label */}
                    {sLabel && !shiftOn && (
                      <span className="absolute top-0.5 left-1 text-[7px] font-semibold tracking-wide pointer-events-none" style={{ color: '#facc15', opacity: 0.7 }}>
                        {sLabel}
                      </span>
                    )}
                    <span className={sLabel && !shiftOn ? 'mt-1' : ''}>{display}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* History arrows (for graphing mode when graph is hidden) */}
        {mode === 'graphing' && !showGraph && (
          <div className="flex gap-1.5 px-3 pb-1">
            <button onClick={() => navigateHistory(-1)}
              className="flex-1 py-1 text-[9px] rounded-lg font-mono uppercase tracking-wider transition-all active:scale-95"
              style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 6%, transparent)`, color: `${resolvedTheme.textColor}50` }}
            >← Prev</button>
            <button onClick={() => navigateHistory(1)}
              className="flex-1 py-1 text-[9px] rounded-lg font-mono uppercase tracking-wider transition-all active:scale-95"
              style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 6%, transparent)`, color: `${resolvedTheme.textColor}50` }}
            >Next →</button>
          </div>
        )}

        {/* Graph inputs */}
        {mode === 'graphing' && (
          <div className="flex gap-1.5 px-3 pb-1 flex-wrap items-center">
            <button onClick={() => setShowGraph(p => !p)}
              className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-medium transition-all"
              style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 12%, transparent)`, color: resolvedTheme.primaryColor }}
            >{showGraph ? 'Hide' : 'Graph'}</button>
            {graphExprs.map((ge, i) => (
              <div key={i} className="flex items-center gap-1">
                <input value={ge.expr}
                  onChange={e => { const n = [...graphExprs]; n[i] = { ...n[i]!, expr: e.target.value }; setGraphExprs(n); }}
                  className="w-16 h-5 rounded bg-zinc-800/50 px-1.5 text-[9px] font-mono text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-zinc-500/50" />
                <input type="color" value={ge.color}
                  onChange={e => { const n = [...graphExprs]; n[i] = { ...n[i]!, color: e.target.value }; setGraphExprs(n); }}
                  className="w-4 h-4 rounded cursor-pointer border-0 p-0" />
                {i === graphExprs.length - 1 && graphExprs.length < 6 && (
                  <button onClick={() => setGraphExprs(p => [...p, { expr: 'x', color: COLORS[p.length % COLORS.length]! }])}
                    className="w-4 h-4 rounded bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 text-[9px] flex items-center justify-center transition-colors">+</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* History / clear row */}
        <div className="flex gap-1.5 px-3 pb-1">
          {history.length > 0 && (
            <>
              <button onClick={() => { setHistory([]); setHistoryIdx(-1); setResult('0'); setAns(null); }}
                className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-medium transition-all opacity-35 hover:opacity-70 active:scale-95"
                style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 6%, transparent)`, color: resolvedTheme.textColor }}
              >Clear</button>
            </>
          )}
        </div>

        {/* Calculo branding */}
        <div className="flex justify-center pb-2 pt-0.5">
          <a href="https://calculo.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono tracking-[0.2em] uppercase transition-all hover:opacity-80 active:scale-95"
            style={{ color: `${resolvedTheme.textColor}20` }}
          >calculo</a>
        </div>
      </div>
    </div>
  );
}
