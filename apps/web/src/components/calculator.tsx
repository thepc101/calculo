import { useState, useCallback, useEffect, useRef } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { ThemeConfig } from '@calculo/shared';
import { GraphCanvas } from './graph-canvas';

interface CalculatorProps {
  theme?: Partial<ThemeConfig>;
  mode?: 'basic' | 'scientific' | 'graphing';
  onModeChange?: (mode: 'basic' | 'scientific' | 'graphing') => void;
  compact?: boolean;
  lockConfig?: { theme?: boolean; size?: boolean; mode?: boolean };
}

const engine = new CalculatorEngine();

type AngleMode = 'DEG' | 'RAD' | 'GRAD';

const rows = 6;
const cols = 5;

interface Btn {
  label: string;
  shift?: string;
  action: string;
  type: 'num' | 'op' | 'fn' | 'ctrl' | 'mem' | 'eq' | 'alpha' | 'graph';
}

function btn(type: Btn['type'], label: string, action: string, shift?: string): Btn {
  return { label, action, shift, type };
}

const basicKeys: Btn[] = [
  btn('ctrl', 'AC', 'clearAll'),   btn('mem', 'M+', 'm+'),    btn('mem', 'M-', 'm-'),    btn('mem', 'MR', 'mr'),    btn('mem', 'MC', 'mc'),
  btn('ctrl', '(', '('),            btn('ctrl', ')', ')'),     btn('op', '÷', '/'),       btn('op', '×', '*'),       btn('ctrl', '⌫', 'del'),
  btn('num', '7', '7'),            btn('num', '8', '8'),      btn('num', '9', '9'),      btn('op', '-', '-'),        btn('op', '+', '+'),
  btn('num', '4', '4'),            btn('num', '5', '5'),      btn('num', '6', '6'),      btn('ctrl', '±', 'neg'),    btn('eq', '=', 'eval'),
  btn('num', '1', '1'),            btn('num', '2', '2'),      btn('num', '3', '3'),      btn('ctrl', '^', '^'),      btn('ctrl', '√', 'sqrt'),
  btn('num', '0', '0'),            btn('num', '.', '.'),      btn('ctrl', 'π', 'pi'),    btn('fn', 'sin', 'sin'),    btn('fn', 'cos', 'cos'),
];

const sciKeys: Btn[] = [
  btn('ctrl', '2nd', 'shift'),     btn('alpha', 'ALPHA', 'alpha'), btn('ctrl', 'DEG', 'mode'), btn('ctrl', 'AC', 'clearAll'), btn('ctrl', '⌫', 'del'),
  btn('fn', 'sin', 'sin', 'sin⁻¹'), btn('fn', 'cos', 'cos', 'cos⁻¹'), btn('fn', 'tan', 'tan', 'tan⁻¹'), btn('op', '^', '^'), btn('ctrl', '√', 'sqrt'),
  btn('fn', 'log', 'log', '10ˣ'), btn('fn', 'ln', 'ln', 'eˣ'),  btn('ctrl', '(','('),        btn('ctrl', ')',')'),       btn('op', '÷', '/'),
  btn('num', '7', '7'),           btn('num', '8', '8'),         btn('num', '9', '9'),       btn('op', '×', '*'),        btn('ctrl', '±', 'neg'),
  btn('num', '4', '4'),           btn('num', '5', '5'),         btn('num', '6', '6'),       btn('op', '-', '-'),         btn('op', '+', '+'),
  btn('num', '1', '1'),           btn('num', '2', '2'),         btn('num', '3', '3'),       btn('eq', '=', 'eval'),      btn('num', '0', '0'),
];

const graphKeys: Btn[] = [
  btn('ctrl', '2nd', 'shift'),     btn('graph', 'WINDOW', 'window'), btn('graph', 'ZOOM', 'zoom'), btn('ctrl', 'AC', 'clearAll'), btn('ctrl', '⌫', 'del'),
  btn('fn', 'sin', 'sin', 'sin⁻¹'), btn('fn', 'cos', 'cos', 'cos⁻¹'), btn('fn', 'tan', 'tan', 'tan⁻¹'), btn('op', '^', '^'), btn('ctrl', '√', 'sqrt'),
  btn('fn', 'log', 'log', '10ˣ'), btn('fn', 'ln', 'ln', 'eˣ'),  btn('ctrl', '(','('),        btn('ctrl', ')',')'),       btn('ctrl', 'π', 'pi'),
  btn('num', '7', '7'),           btn('num', '8', '8'),         btn('num', '9', '9'),       btn('op', '×', '*'),        btn('op', '÷', '/'),
  btn('num', '4', '4'),           btn('num', '5', '5'),         btn('num', '6', '6'),       btn('op', '-', '-'),         btn('op', '+', '+'),
  btn('num', '1', '1'),           btn('num', '2', '2'),         btn('num', '3', '3'),       btn('eq', '=', 'eval'),      btn('num', '0', '0'),
];

const keyMap: Record<string, Btn[]> = {
  basic: basicKeys, scientific: sciKeys, graphing: graphKeys,
};

const SHIFT_MAP: Record<string, string> = {
  'sin': 'sin⁻¹', 'cos': 'cos⁻¹', 'tan': 'tan⁻¹',
  'log': '10ˣ', 'ln': 'eˣ',
};

const SHIFT_TO_FN: Record<string, string> = {
  'sin⁻¹': 'asin', 'cos⁻¹': 'acos', 'tan⁻¹': 'atan',
  '10ˣ': '10**', 'eˣ': 'e**',
};

function toCssVars(t: ThemeConfig): React.CSSProperties {
  return {
    '--calc-bg': t.backgroundColor,
    '--calc-text': t.textColor,
    '--calc-primary': t.primaryColor,
    '--calc-radius': `${t.borderRadius}px`,
    '--calc-spacing': `${t.spacing}px`,
    '--calc-font': t.fontFamily,
  } as React.CSSProperties;
}

function styleByType(type: Btn['type'], primary: string, compact: boolean): string {
  const base = compact
    ? 'h-8 text-[11px] rounded-lg font-medium transition-all duration-75 active:scale-95 select-none'
    : 'h-11 text-sm rounded-xl font-medium transition-all duration-75 active:scale-95 select-none';
  switch (type) {
    case 'num':   return `${base} bg-zinc-800/50 text-[var(--calc-text)] hover:bg-zinc-700/50`;
    case 'op':    return `${base} bg-zinc-800/30 text-[var(--calc-primary)] hover:bg-zinc-700/30`;
    case 'fn':    return `${base} bg-zinc-800/20 text-[var(--calc-primary)] hover:brightness-125 font-mono`;
    case 'ctrl':  return `${base} bg-zinc-800/30 text-zinc-400 hover:bg-zinc-700/30`;
    case 'mem':   return `${base} bg-zinc-800/20 text-zinc-400 hover:bg-zinc-700/20 text-[10px]`;
    case 'eq':    return `${base} bg-[var(--calc-primary)] text-white hover:brightness-110 font-bold text-base`;
    case 'alpha': return `${base} bg-zinc-800/30 text-blue-400 hover:bg-zinc-700/30 text-[10px]`;
    case 'graph': return `${base} bg-zinc-800/20 text-emerald-400 hover:brightness-125 font-mono text-[10px]`;
    default:      return `${base} bg-zinc-800/40 text-[var(--calc-text)]`;
  }
}

export function Calculator({ theme: themeProp, mode: externalMode, onModeChange, compact = false, lockConfig }: CalculatorProps) {
  const resolvedTheme: ThemeConfig = { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa', fontFamily: 'Geist, system-ui, sans-serif', borderRadius: 8, spacing: 4, ...themeProp };
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [internalMode, setInternalMode] = useState<'basic' | 'scientific' | 'graphing'>('basic');
  const [shiftOn, setShiftOn] = useState(false);
  const [alphaOn, setAlphaOn] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [memory, setMemory] = useState<number | null>(null);
  const [ans, setAns] = useState<string | null>(null);
  const [graphExprs, setGraphExprs] = useState<{ expr: string; color: string }[]>([{ expr: 'sin(x)', color: '#3b82f6' }]);
  const inputRef = useRef<HTMLDivElement>(null);

  const mode = externalMode ?? internalMode;
  const keys = keyMap[mode];

  const setMode = (m: 'basic' | 'scientific' | 'graphing') => {
    if (lockConfig?.mode) return;
    setInternalMode(m);
    onModeChange?.(m);
    setExpression('');
    setResult('0');
  };

  const insert = (text: string) => setExpression(prev => prev + text);

  const handleAction = useCallback((action: string) => {
    if (action === 'shift') { setShiftOn(prev => !prev); setAlphaOn(false); return; }
    if (action === 'alpha') { setAlphaOn(prev => !prev); setShiftOn(false); return; }
    if (action === 'mode') { setAngleMode(prev => prev === 'DEG' ? 'RAD' : prev === 'RAD' ? 'GRAD' : 'DEG'); return; }

    if (alphaOn && /^[A-Z]$/.test(action)) {
      insert(action);
      setAlphaOn(false);
      return;
    }

    let finalAction = action;
    if (shiftOn && action in SHIFT_MAP) {
      finalAction = SHIFT_MAP[action]!;
      setShiftOn(false);
    } else if (shiftOn) {
      setShiftOn(false);
    }

    if (finalAction === 'clearAll') { setExpression(''); setResult('0'); setHistory([]); setAns(null); return; }
    if (finalAction === 'del') { setExpression(prev => prev.slice(0, -1)); return; }
    if (finalAction === 'neg') { setExpression(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev); return; }
    if (finalAction === 'pi') { insert('π'); return; }

    if (finalAction in SHIFT_TO_FN) {
      insert(`${SHIFT_TO_FN[finalAction]}(`);
      return;
    }
    if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'].includes(finalAction)) {
      insert(`${finalAction}(`);
      return;
    }
    if (finalAction === '10ˣ') { insert('10**'); return; }
    if (finalAction === 'eˣ') { insert('e**'); return; }

    if (finalAction === 'm+') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(prev => (prev ?? 0) + v);
      return;
    }
    if (finalAction === 'm-') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(prev => (prev ?? 0) - v);
      return;
    }
    if (finalAction === 'mr') { if (memory !== null) insert(String(memory)); return; }
    if (finalAction === 'mc') { setMemory(null); return; }

    if (finalAction === 'eval') {
      const subst = expression.replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/√\(/g, 'sqrt(');
      const evalResult = engine.evaluate({ expression: subst, angleMode: angleMode.toLowerCase() as any });
      if (evalResult.error) {
        setResult(`Error: ${evalResult.error}`);
      } else {
        const rs = String(evalResult.result);
        setResult(rs);
        setAns(rs);
        setHistory(prev => [...prev, { expr: expression, result: rs }]);
        if (mode === 'graphing') {
          setGraphExprs(prev => [{ ...prev[0]!, expr: subst }]);
        }
        setExpression('');
      }
      return;
    }

    if (finalAction === 'window' || finalAction === 'zoom' || finalAction === 'trace') return;

    insert(finalAction);
  }, [expression, shiftOn, alphaOn, angleMode, memory, result, mode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleAction('eval');
      else if (e.key === 'Backspace') handleAction('del');
      else if (e.key === 'Escape') handleAction('clearAll');
      else if (/^[0-9+\-*/.^()]$/.test(e.key)) handleAction(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction]);

  const displayFontSize = compact ? 20 : 28;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full select-none" style={{ ...toCssVars(resolvedTheme), fontFamily: resolvedTheme.fontFamily, color: resolvedTheme.textColor }}>
      <div className="p-[var(--calc-spacing,4px)] space-y-[var(--calc-spacing,4px)]" style={{ backgroundColor: resolvedTheme.backgroundColor, borderRadius: resolvedTheme.borderRadius }}>
        {!externalMode && (
          <div className="flex items-center gap-1.5 px-1 pt-1.5">
            {(['basic', 'scientific', 'graphing'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2.5 py-0.5 text-[10px] rounded-md uppercase tracking-wider font-semibold transition-all ${
                  mode === m ? 'opacity-100' : 'opacity-30 hover:opacity-60'
                }`}
                style={{
                  backgroundColor: mode === m ? `color-mix(in srgb, ${resolvedTheme.primaryColor} 20%, transparent)` : 'transparent',
                  color: mode === m ? resolvedTheme.primaryColor : resolvedTheme.textColor,
                }}
              >{m}</button>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] font-mono opacity-30 tracking-widest">{angleMode}</span>
            {memory !== null && <span className="text-[10px] font-mono text-yellow-400 opacity-70">M</span>}
            {shiftOn && <span className="text-[10px] font-mono text-green-400 opacity-80">2nd</span>}
            {alphaOn && <span className="text-[10px] font-mono text-blue-400 opacity-80">A</span>}
          </div>
        )}

        <div className="p-4 min-h-[88px] space-y-1 flex flex-col justify-end" style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.backgroundColor} 70%, #000)`, borderRadius: resolvedTheme.borderRadius }}>
          {mode === 'graphing' && graphExprs.length > 0 && !expression && (
            <div className="mb-2">
              <GraphCanvas expressions={graphExprs} width={280} height={160} />
            </div>
          )}
          {showHistory && history.length > 0 && (
            <div className="max-h-20 overflow-y-auto space-y-0.5 mb-1 opacity-50">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between gap-4 font-mono text-[10px]">
                  <span>{h.expr}</span>
                  <span>= {h.result}</span>
                </div>
              ))}
            </div>
          )}
          {ans && !expression && result === '0' && (
            <div className="text-[10px] opacity-30 font-mono">Ans = {ans}</div>
          )}
          <div ref={inputRef} className="font-mono min-h-[1.2em] break-all truncate text-xs opacity-50">
            {expression || '\u00A0'}
          </div>
          <div className="font-semibold font-mono mt-0.5 truncate leading-none" style={{ fontSize: displayFontSize }}>
            {result}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-[var(--calc-spacing,4px)]">
          {keys.map((btn, i) => {
            const display = shiftOn && btn.shift ? btn.shift : btn.label;
            return (
              <button
                key={i}
                onClick={() => handleAction(btn.action)}
                className={styleByType(btn.type, resolvedTheme.primaryColor, compact)}
                title={btn.shift ? `${btn.shift}` : undefined}
              >
                {display}
              </button>
            );
          })}
        </div>

        {mode === 'graphing' && (
          <div className="flex gap-1.5 px-1 pb-1">
            {graphExprs.map((ge, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={ge.expr}
                  onChange={e => {
                    const next = [...graphExprs];
                    next[i] = { ...next[i]!, expr: e.target.value };
                    setGraphExprs(next);
                  }}
                  className="w-20 h-6 rounded bg-zinc-800/50 px-2 text-[10px] font-mono text-zinc-300 border border-zinc-700/50 focus:outline-none"
                />
                <input
                  type="color"
                  value={ge.color}
                  onChange={e => {
                    const next = [...graphExprs];
                    next[i] = { ...next[i]!, color: e.target.value };
                    setGraphExprs(next);
                  }}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                />
                {i === graphExprs.length - 1 && graphExprs.length < 6 && (
                  <button onClick={() => setGraphExprs(prev => [...prev, { expr: 'x', color: COLORS[prev.length % COLORS.length]! }])}
                    className="w-5 h-5 rounded bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 text-xs flex items-center justify-center"
                  >+</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 px-1 pb-1.5">
          <button onClick={() => setShowHistory(!showHistory)}
            className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-medium"
            style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 15%, transparent)`, color: resolvedTheme.primaryColor }}
          >{showHistory ? 'Hide' : 'History'}</button>
          {history.length > 0 && (
            <button onClick={() => { setHistory([]); setShowHistory(false); setAns(null); }}
              className="px-2 py-0.5 text-[9px] rounded-md uppercase tracking-wider font-medium opacity-40 hover:opacity-80"
              style={{ backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 8%, transparent)`, color: resolvedTheme.textColor }}
            >Clear</button>
          )}
        </div>
      </div>
    </div>
  );
}
