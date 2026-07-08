import { useState, useCallback, useEffect } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { CalculatorConfig, ThemeConfig } from '@calculo/shared';
import { createDefaultConfig, createDefaultTheme } from '@calculo/shared';

interface CalculatorProps {
  config?: Partial<CalculatorConfig>;
  theme?: Partial<ThemeConfig>;
  onThemeChange?: (theme: ThemeConfig) => void;
}

const engine = new CalculatorEngine();

const basicLayout = [
  ['C', '(', ')', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

const scientificLayout = [
  ['sin', 'cos', 'tan', '/'],
  ['log', 'ln', 'sqrt', '*'],
  ['7', '8', '9', '-'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '^'],
  ['±', '0', '.', '='],
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

function buttonClass(
  label: string,
  primary: string,
  bg: string,
  text: string,
  radius: string,
): string {
  const base = `h-14 rounded-[var(--calc-radius,0.75rem)] text-lg font-medium transition-all duration-100 active:scale-95`;
  const isNum = /^\d$/.test(label);
  const isOp = /[+\-*/÷^%]/.test(label);
  const isEq = label === '=';
  const isClr = label === 'C';
  const isParen = label === '(' || label === ')';
  const isFn = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(label);

  if (isFn) return `${base} bg-[var(--calc-bg)]/60 text-[var(--calc-primary)] hover:brightness-125`;
  if (isNum) return `${base} bg-zinc-800/60 text-[var(--calc-text)] hover:bg-zinc-700/60`;
  if (isOp) return `${base} bg-zinc-800/40 text-[var(--calc-primary)] hover:bg-zinc-700/40`;
  if (isEq) return `${base} bg-[var(--calc-primary)] text-white hover:brightness-110`;
  if (isClr) return `${base} bg-zinc-800/40 text-red-400 hover:bg-zinc-700/40`;
  if (isParen) return `${base} bg-zinc-800/40 text-zinc-300 hover:bg-zinc-700/40`;
  return `${base} bg-zinc-800/60 text-[var(--calc-text)] hover:bg-zinc-700/60`;
}

export function Calculator({ config, theme: themeProp, onThemeChange }: CalculatorProps) {
  const fullConfig = { ...createDefaultConfig(), ...config };
  const resolvedTheme: ThemeConfig = { ...createDefaultTheme(), ...themeProp };
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isScientific = fullConfig.type === 'scientific' || fullConfig.type === 'graphing';
  const buttons = isScientific ? scientificLayout : basicLayout;
  const displayFontSize = fullConfig.display?.fontSize ?? 24;

  const handleButton = useCallback((value: string) => {
    if (value === 'clear') {
      setExpression('');
      setResult('0');
    } else if (value === 'evaluate') {
      const evalResult = engine.evaluate({ expression });
      if (evalResult.error) {
        setResult(`Error: ${evalResult.error}`);
      } else {
        const resultStr = String(evalResult.result);
        setResult(resultStr);
        setHistory((prev) => [...prev, { expr: expression, result: resultStr }]);
        setExpression('');
      }
    } else if (value === 'backspace') {
      setExpression((prev) => prev.slice(0, -1));
    } else if (value === 'negate') {
      if (expression.startsWith('-')) {
        setExpression((prev) => prev.slice(1));
      } else {
        setExpression((prev) => '-' + prev);
      }
    } else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(value)) {
      setExpression((prev) => prev + value + '(');
    } else {
      setExpression((prev) => prev + value);
    }
  }, [expression]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleButton('evaluate');
      } else if (e.key === 'Backspace') {
        handleButton('backspace');
      } else if (e.key === 'Escape') {
        handleButton('clear');
      } else if (/^[0-9+\-*/.^()%]$/.test(e.key)) {
        handleButton(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton]);

  const mapped = buttons.flat().map((label) => {
    const val =
      label === '=' ? 'evaluate' :
      label === 'C' ? 'clear' :
      label === '±' ? 'negate' :
      label;
    return { label, value: val };
  });

  const lastResult = history.length > 0 ? history[history.length - 1]!.result : null;

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
        <div
          className="p-4 min-h-[100px] space-y-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${resolvedTheme.backgroundColor} 80%, transparent)`,
            borderRadius: resolvedTheme.borderRadius,
          }}
        >
          {showHistory && history.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-0.5 mb-2 opacity-60 text-xs">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between gap-4 font-mono">
                  <span>{h.expr}</span>
                  <span>= {h.result}</span>
                </div>
              ))}
            </div>
          )}
          {lastResult && !expression && result === '0' && (
            <div className="text-sm opacity-40 font-mono mb-1">Ans = {lastResult}</div>
          )}
          <div
            className="font-mono min-h-[1.5em] break-all truncate"
            style={{ fontSize: 14, opacity: 0.5 }}
          >
            {expression || '\u00A0'}
          </div>
          <div
            className="font-semibold font-mono mt-1 truncate"
            style={{ fontSize: displayFontSize }}
          >
            {result}
          </div>
        </div>

        <div
          className="grid gap-[var(--calc-spacing,4px)]"
          style={{
            gridTemplateColumns: `repeat(${buttons[0]?.length ?? 4}, 1fr)`,
          }}
        >
          {mapped.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleButton(value)}
              className={buttonClass(label, resolvedTheme.primaryColor, resolvedTheme.backgroundColor, resolvedTheme.textColor, String(resolvedTheme.borderRadius))}
            >
              {label}
            </button>
          ))}
        </div>

        {(fullConfig.history || fullConfig.memory) && (
          <div className="flex gap-1 pt-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-2 py-1 text-[10px] rounded uppercase tracking-wider font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${resolvedTheme.primaryColor} 20%, transparent)`,
                color: resolvedTheme.primaryColor,
              }}
            >
              {showHistory ? 'Hide' : 'History'}
            </button>
            {history.length > 0 && (
              <button
                onClick={() => { setHistory([]); setShowHistory(false); }}
                className="px-2 py-1 text-[10px] rounded uppercase tracking-wider font-medium opacity-50 hover:opacity-100"
                style={{
                  backgroundColor: `color-mix(in srgb, ${resolvedTheme.textColor} 10%, transparent)`,
                  color: resolvedTheme.textColor,
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
