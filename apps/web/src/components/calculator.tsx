import { useState, useCallback, useEffect, useRef } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { CalculatorConfig, ThemeConfig } from '@calculo/shared';
import { createDefaultConfig, createDefaultTheme } from '@calculo/shared';

interface CalculatorProps {
  config?: Partial<CalculatorConfig>;
  theme?: Partial<ThemeConfig>;
  mode?: 'basic' | 'scientific' | 'graphing';
  onModeChange?: (mode: 'basic' | 'scientific' | 'graphing') => void;
  compact?: boolean;
  lockConfig?: { theme?: boolean; size?: boolean; mode?: boolean; };
}

const engine = new CalculatorEngine();

const CONSTANTS_LIST: [string, string, number][] = [
  ['c', 'Speed of light', 299792458],
  ['h', 'Planck const', 6.62607015e-34],
  ['G', 'Gravitational', 6.6743e-11],
  ['ε₀', 'Vacuum perm', 8.854187817e-12],
  ['μ₀', 'Vacuum perm', 1.25663706212e-6],
  ['e', 'Elementary charge', 1.602176634e-19],
  ['mₑ', 'Electron mass', 9.1093837e-31],
  ['mₚ', 'Proton mass', 1.67262192369e-27],
  ['Nₐ', 'Avogadro', 6.02214076e23],
  ['k', 'Boltzmann', 1.380649e-23],
  ['R', 'Gas const', 8.314462618],
  ['σ', 'Stefan-Boltzmann', 5.670374419e-8],
];

const shiftFunctions: Record<string, string> = {
  sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹',
  log: '10ˣ', ln: 'eˣ',
  '√': '∛', 'x²': 'x³', 'xʸ': 'ʸ√x',
  'n!': 'nPr', nPr: 'nCr',
  sinh: 'sinh⁻¹', cosh: 'cosh⁻¹', tanh: 'tanh⁻¹',
};

const alphaVars = ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'X', 'Y', 'Z'];

function isShiftFn(fn: string): boolean {
  return fn in shiftFunctions;
}

interface RowDef {
  label: string;
  shift?: string;
  span?: number;
}

const basicLayout: RowDef[][] = [
  [{ label: 'C', shift: 'AC' }, { label: 'M+' }, { label: 'M-' }, { label: 'MR' }, { label: '÷' }],
  [{ label: '7' }, { label: '8' }, { label: '9' }, { label: '×' }, { label: '⌫' }],
  [{ label: '4' }, { label: '5' }, { label: '6' }, { label: '-' }, { label: '(' }],
  [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '+' }, { label: ')' }],
  [{ label: '±' }, { label: '0' }, { label: '.' }, { label: '=' }],
];

const scientificLayout: RowDef[][] = [
  [{ label: 'Shift' }, { label: 'Alpha' }, { label: 'MODE' }, { label: 'ON' }],
  [{ label: 'sin', shift: 'sin⁻¹' }, { label: 'cos', shift: 'cos⁻¹' }, { label: 'tan', shift: 'tan⁻¹' }, { label: 'n!', shift: 'nPr' }, { label: '(' }],
  [{ label: 'log', shift: '10ˣ' }, { label: 'ln', shift: 'eˣ' }, { label: '√', shift: '∛' }, { label: 'x²', shift: 'x³' }, { label: ')' }],
  [{ label: 'α', shift: 'β' }, { label: 'xʸ', shift: 'ʸ√x' }, { label: 'π' }, { label: 'e' }, { label: '÷' }],
  [{ label: '7' }, { label: '8' }, { label: '9' }, { label: 'DEL' }, { label: 'AC' }],
  [{ label: '4' }, { label: '5' }, { label: '6' }, { label: '×' }, { label: '-' }],
  [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '+' }, { label: '×10ˣ' }],
  [{ label: '0' }, { label: '.' }, { label: '±' }, { label: 'Ans' }, { label: '=' }],
];

const graphingLayout: RowDef[][] = [
  [{ label: 'Shift' }, { label: 'Alpha' }, { label: 'MODE' }, { label: 'ON' }],
  [{ label: 'y=' }, { label: 'WINDOW' }, { label: 'ZOOM' }, { label: 'TRACE' }, { label: 'GRAPH' }],
  [{ label: 'sin', shift: 'sin⁻¹' }, { label: 'cos', shift: 'cos⁻¹' }, { label: 'tan', shift: 'tan⁻¹' }, { label: 'x²', shift: 'x³' }, { label: '^' }],
  [{ label: 'log', shift: '10ˣ' }, { label: 'ln', shift: 'eˣ' }, { label: '√', shift: '∛' }, { label: '(', shift: '{' }, { label: ')' }],
  [{ label: '7' }, { label: '8' }, { label: '9' }, { label: 'DEL' }, { label: 'AC' }],
  [{ label: '4' }, { label: '5' }, { label: '6' }, { label: '×' }, { label: '÷' }],
  [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '+' }, { label: '-' }],
  [{ label: '0' }, { label: '.' }, { label: '±' }, { label: 'Ans' }, { label: '=' }],
];

function toCssVars(theme: ThemeConfig): React.CSSProperties {
  return {
    '--calc-bg': theme.backgroundColor,
    '--calc-text': theme.textColor,
    '--calc-primary': theme.primaryColor,
    '--calc-radius': `${theme.borderRadius}px`,
    '--calc-spacing': `${theme.spacing}px`,
    '--calc-font': theme.fontFamily,
  } as React.CSSProperties;
}

function btnClass(label: string, primary: string, compact: boolean): string {
  const h = compact ? 'h-8 text-[11px]' : 'h-10 text-sm';
  const base = `${h} rounded-[var(--calc-radius,0.75rem)] font-medium transition-all duration-100 active:scale-95 select-none px-1`;
  if (['Shift', 'Alpha', 'MODE', 'ON', 'AC', 'DEL'].includes(label)) {
    return `${base} bg-zinc-800/30 text-zinc-300 hover:bg-zinc-700/30 text-[10px]`;
  }
  if (['sin', 'cos', 'tan', 'log', 'ln'].includes(label)) {
    return `${base} bg-zinc-800/20 text-[var(--calc-primary)] hover:brightness-125 font-mono`;
  }
  if (label === '=') return `${base} bg-[var(--calc-primary)] text-white hover:brightness-110 font-bold text-base`;
  if (/^\d$/.test(label)) return `${base} bg-zinc-800/50 text-[var(--calc-text)] hover:bg-zinc-700/50 font-semibold`;
  if (['+', '-', '×', '÷', '^', '×10ˣ'].includes(label)) {
    return `${base} bg-zinc-800/30 text-[var(--calc-primary)] hover:bg-zinc-700/30`;
  }
  if (['(', ')', 'DEL', 'AC'].includes(label)) return `${base} bg-zinc-800/30 text-zinc-300 hover:bg-zinc-700/30`;
  if (['√', 'x²', 'xʸ', 'n!', 'nPr', 'Ans', 'π', 'e', 'α', 'β', '±', '.', 'M+', 'M-', 'MR', 'MC'].includes(label)) {
    return `${base} bg-zinc-800/25 text-zinc-300 hover:bg-zinc-700/25`;
  }
  if (['y=', 'WINDOW', 'ZOOM', 'TRACE', 'GRAPH'].includes(label)) {
    return `${base} bg-zinc-800/20 text-[var(--calc-primary)] hover:brightness-125 font-mono text-[10px]`;
  }
  if (label === 'C') return `${base} bg-zinc-800/30 text-red-400 hover:bg-zinc-700/30`;
  return `${base} bg-zinc-800/40 text-[var(--calc-text)] hover:bg-zinc-700/40`;
}

export function Calculator({ config, theme: themeProp, mode: externalMode, onModeChange, compact = false, lockConfig }: CalculatorProps) {
  const fullConfig = { ...createDefaultConfig(), ...config };
  const resolvedTheme: ThemeConfig = { ...createDefaultTheme(), ...themeProp };
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [internalMode, setInternalMode] = useState<'basic' | 'scientific' | 'graphing'>('basic');
  const [shiftOn, setShiftOn] = useState(false);
  const [alphaOn, setAlphaOn] = useState(false);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD' | 'GRAD'>('DEG');
  const [memory, setMemory] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState(expression.length);
  const [showConstants, setShowConstants] = useState(false);
  const [ans, setAns] = useState<string | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const mode = externalMode ?? internalMode;

  const layout = mode === 'scientific' ? scientificLayout : mode === 'graphing' ? graphingLayout : basicLayout;
  const displayFontSize = compact ? 18 : (fullConfig.display?.fontSize ?? 24);

  const setMode = (m: 'basic' | 'scientific' | 'graphing') => {
    if (lockConfig?.mode) return;
    setInternalMode(m);
    onModeChange?.(m);
    setExpression('');
    setResult('0');
    setShowHistory(false);
  };

  const handleButton = useCallback((label: string) => {
    let activeLabel = label;
    if (shiftOn && isShiftFn(label)) {
      activeLabel = shiftFunctions[label] ?? label;
      setShiftOn(false);
    }

    const insertAtCursor = (text: string) => {
      setExpression(prev => prev.slice(0, cursorPos) + text + prev.slice(cursorPos));
      setCursorPos(prev => prev + text.length);
    };

    if (label === 'Shift') {
      setShiftOn(prev => !prev);
      setAlphaOn(false);
      return;
    }
    if (label === 'Alpha' || label === 'α') {
      setAlphaOn(prev => !prev);
      setShiftOn(false);
      return;
    }
    if (label === 'ON') {
      setExpression('');
      setResult('0');
      setHistory([]);
      setAns(null);
      return;
    }
    if (label === 'C') {
      setExpression('');
      setResult('0');
      setCursorPos(0);
      return;
    }
    if (label === 'AC') {
      setExpression('');
      setResult('0');
      setHistory([]);
      setAns(null);
      setCursorPos(0);
      return;
    }
    if (label === 'DEL' || label === '⌫') {
      setExpression(prev => prev.slice(0, -1));
      setCursorPos(prev => Math.max(0, prev - 1));
      return;
    }
    if (label === '=') {
      const subst = expression
        .replace(/π/g, 'pi')
        .replace(/√\(/g, 'sqrt(')
        .replace(/∛\(/g, 'cbrt(')
        .replace(/×10ˣ/g, 'e')
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
      const evalResult = engine.evaluate({ expression: subst, angleMode: angleMode.toLowerCase() as any });
      if (evalResult.error) {
        setResult(`Error: ${evalResult.error}`);
      } else {
        const resultStr = String(evalResult.result);
        setResult(resultStr);
        setAns(resultStr);
        setHistory(prev => [...prev, { expr: expression, result: resultStr }]);
        setExpression('');
        setCursorPos(0);
      }
      return;
    }
    if (label === '±') {
      setExpression(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
      return;
    }
    if (label === 'Ans') {
      insertAtCursor(ans ?? '0');
      return;
    }
    if (label === 'MODE') {
      setAngleMode(prev => prev === 'DEG' ? 'RAD' : prev === 'RAD' ? 'GRAD' : 'DEG');
      return;
    }
    if (label === 'M+') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(prev => (prev ?? 0) + v);
      return;
    }
    if (label === 'M-') {
      const v = parseFloat(result);
      if (!isNaN(v)) setMemory(prev => (prev ?? 0) - v);
      return;
    }
    if (label === 'MR') {
      if (memory !== null) insertAtCursor(String(memory));
      return;
    }
    if (label === 'MC') {
      setMemory(null);
      return;
    }
    if (label === 'π') {
      insertAtCursor('π');
      return;
    }
    if (label === 'e') {
      insertAtCursor('e');
      return;
    }
    if (alphaOn) {
      const upper = label.toUpperCase();
      if (alphaVars.includes(upper)) {
        insertAtCursor(upper);
        setAlphaOn(false);
        return;
      }
      setAlphaOn(false);
    }
    if (['sin', 'cos', 'tan', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'log', 'ln', '√', '∛'].includes(activeLabel)) {
      const fnMap: Record<string, string> = {
        'sin⁻¹': 'asin', 'cos⁻¹': 'acos', 'tan⁻¹': 'atan',
        '10ˣ': '10^', 'eˣ': 'e^', '∛': 'cbrt',
      };
      const fn = fnMap[activeLabel] ?? activeLabel;
      insertAtCursor(fn + '(');
      return;
    }
    if (activeLabel === 'x²') { insertAtCursor('^2'); return; }
    if (activeLabel === 'x³') { insertAtCursor('^3'); return; }
    if (activeLabel === 'xʸ') { insertAtCursor('^'); return; }
    if (activeLabel === 'ʸ√x') { insertAtCursor('^(1/'); return; }
    if (activeLabel === 'n!') { insertAtCursor('!'); return; }
    if (activeLabel === 'nPr') { insertAtCursor('P('); return; }
    if (activeLabel === 'nCr') { insertAtCursor('C('); return; }
    if (activeLabel === '×10ˣ') { insertAtCursor('e'); return; }
    if (activeLabel === 'β') { setAngleMode(prev => prev === 'DEG' ? 'RAD' : prev === 'RAD' ? 'GRAD' : 'DEG'); return; }
    if (label === 'WINDOW') { return; }
    if (label === 'ZOOM') { return; }
    if (label === 'TRACE') { return; }
    if (label === 'GRAPH') { return; }

    insertAtCursor(label);
  }, [expression, cursorPos, shiftOn, alphaOn, angleMode, ans, memory, result, lockConfig]);

  useEffect(() => {
    setCursorPos(expression.length);
  }, [expression]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { handleButton('='); }
      else if (e.key === 'Backspace') { handleButton('DEL'); }
      else if (e.key === 'Escape') { handleButton('C'); }
      else if (e.key === 'Delete') { handleButton('AC'); }
      else if (e.key === 'ArrowUp') { setShowHistory(true); }
      else if (e.key === 'ArrowDown') { setShowHistory(false); }
      else if (/^[0-9+\-*/.^()!%]$/.test(e.key)) { handleButton(e.key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton]);

  const hasMemory = memory !== null;

  return (
    <div
      className="w-full select-none"
      style={{
        ...toCssVars(resolvedTheme),
        fontFamily: resolvedTheme.fontFamily,
        color: resolvedTheme.textColor,
      }}
    >
      <div
        className="p-[var(--calc-spacing,4px)] space-y-[var(--calc-spacing,4px)]"
        style={{
          backgroundColor: resolvedTheme.backgroundColor,
          borderRadius: resolvedTheme.borderRadius,
        }}
      >
        {!externalMode && (
          <div className="flex items-center gap-1 px-1 pt-1">
            {(['basic', 'scientific', 'graphing'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-0.5 text-[10px] rounded uppercase tracking-wider font-medium transition-all ${
                  mode === m ? 'opacity-100' : 'opacity-30 hover:opacity-60'
                }`}
                style={{
                  backgroundColor: mode === m
                    ? `color-mix(in srgb, ${resolvedTheme.primaryColor} 25%, transparent)`
                    : 'transparent',
                  color: mode === m ? resolvedTheme.primaryColor : resolvedTheme.textColor,
                  border: mode === m ? `1px solid color-mix(in srgb, ${resolvedTheme.primaryColor} 30%, transparent)` : '1px solid transparent',
                }}
              >
                {m === 'basic' ? 'Basic' : m === 'scientific' ? 'Sci' : 'Graph'}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] font-mono opacity-40 tracking-wider">{angleMode}</span>
            {hasMemory && <span className="text-[10px] font-mono opacity-60 text-yellow-400 ml-1">M</span>}
            {shiftOn && <span className="text-[10px] font-mono opacity-80 text-green-400 ml-1">S</span>}
            {alphaOn && <span className="text-[10px] font-mono opacity-80 text-blue-400 ml-1">A</span>}
          </div>
        )}

        <div
          className="p-3 min-h-[72px] space-y-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${resolvedTheme.backgroundColor} 80%, transparent)`,
            borderRadius: resolvedTheme.borderRadius,
          }}
        >
          {showHistory && history.length > 0 && (
            <div className="max-h-16 overflow-y-auto space-y-0.5 mb-1 opacity-50 text-[10px]">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between gap-4 font-mono">
                  <span>{h.expr}</span>
                  <span>= {h.result}</span>
                </div>
              ))}
            </div>
          )}
          {ans && !expression && result === '0' && (
            <div className="text-[10px] opacity-30 font-mono mb-0.5">Ans = {ans}</div>
          )}
          <div ref={inputRef} className="font-mono min-h-[1.1em] break-all truncate text-[11px] opacity-50">
            {expression || '\u00A0'}
          </div>
          <div className="font-semibold font-mono mt-0.5 truncate leading-tight" style={{ fontSize: displayFontSize }}>
            {result}
          </div>
        </div>

        <div className="space-y-[var(--calc-spacing,4px)]">
          {layout.map((row, ri) => (
            <div
              key={ri}
              className="grid gap-[var(--calc-spacing,4px)]"
              style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
            >
              {row.map((btn) => {
                const display = shiftOn && btn.shift ? btn.shift : btn.label;
                return (
                  <button
                    key={btn.label}
                    onClick={() => handleButton(btn.label)}
                    className={btnClass(display, resolvedTheme.primaryColor, compact)}
                    title={btn.shift ? `Shift: ${btn.shift}` : undefined}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-1 pt-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-2 py-0.5 text-[10px] rounded uppercase tracking-wider font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 20%, transparent)`,
              color: resolvedTheme.primaryColor,
            }}
          >
            {showHistory ? 'Hide' : 'History'}
          </button>
          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); setShowHistory(false); setAns(null); }}
              className="px-2 py-0.5 text-[10px] rounded uppercase tracking-wider font-medium opacity-50 hover:opacity-100"
              style={{
                backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 10%, transparent)`,
                color: resolvedTheme.textColor,
              }}
            >
              Clear
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowConstants(!showConstants)}
            className="px-2 py-0.5 text-[10px] rounded uppercase tracking-wider font-medium opacity-50 hover:opacity-100"
            style={{
              backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 15%, transparent)`,
              color: resolvedTheme.primaryColor,
            }}
          >
            Constants
          </button>
        </div>

        {showConstants && (
          <div
            className="p-2 rounded-lg max-h-32 overflow-y-auto space-y-1"
            style={{
              backgroundColor: `color-mix(in srgb, ${resolvedTheme.backgroundColor} 80%, #000)`,
              border: `1px solid color-mix(in srgb, ${resolvedTheme.primaryColor} 15%, transparent)`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider font-medium opacity-40 mb-1">Scientific Constants</div>
            <div className="grid grid-cols-3 gap-1">
              {CONSTANTS_LIST.map(([sym, name, val]) => (
                <button
                  key={sym}
                  onClick={() => setExpression(prev => prev + `(${val})`)}
                  className="text-[10px] text-left px-2 py-1 rounded hover:bg-zinc-800/50 transition-colors"
                  style={{ color: resolvedTheme.textColor }}
                  title={name}
                >
                  <span className="opacity-80">{sym}</span>{' '}
                  <span className="opacity-40">{val.toExponential(3)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
