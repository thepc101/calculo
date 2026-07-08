import { useState, useCallback, useRef, useEffect } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';
import type { CalculatorConfig } from '@calculo/shared';
import { createDefaultConfig } from '@calculo/shared';

interface CalculatorProps {
  config?: Partial<CalculatorConfig>;
}

const engine = new CalculatorEngine();

export function Calculator({ config }: CalculatorProps) {
  const fullConfig = { ...createDefaultConfig(), ...config };
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const buttons = [
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['±', '0', '.', '='],
  ];

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div className="bg-zinc-950 rounded-xl p-4 min-h-[100px]">
          <div className="text-sm text-zinc-400 font-mono min-h-[24px] break-all">
            {expression || '\u00A0'}
          </div>
          <div className="text-3xl font-semibold text-zinc-100 mt-2 font-mono">
            {result}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((label) => (
            <button
              key={label}
              onClick={() => handleButton(
                label === '=' ? 'evaluate' :
                label === 'C' ? 'clear' :
                label === '±' ? 'negate' :
                label
              )}
              className={cn(
                'h-14 rounded-xl text-lg font-medium transition-all duration-100 active:scale-95',
                /^\d$/.test(label) && 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
                /[+\-*/÷^]/.test(label) && 'bg-zinc-800/50 text-blue-400 hover:bg-zinc-700/50',
                label === '=' && 'bg-blue-600 text-white hover:bg-blue-500',
                label === 'C' && 'bg-zinc-800/50 text-red-400 hover:bg-zinc-700/50',
                label === '(' || label === ')' ? 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50' : '',
                label === '±' || label === '.' ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : '',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
