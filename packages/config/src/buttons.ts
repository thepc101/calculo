import type { ButtonConfig } from '@calculo/shared';

export const basicButtons: ButtonConfig[] = [
  { id: 'clear', label: 'C', value: 'clear', type: 'action', position: { row: 0, col: 0 } },
  { id: 'paren-left', label: '(', value: '(', type: 'operator', position: { row: 0, col: 1 } },
  { id: 'paren-right', label: ')', value: ')', type: 'operator', position: { row: 0, col: 2 } },
  { id: 'divide', label: '÷', value: '/', type: 'operator', position: { row: 0, col: 3 } },
  { id: 'n7', label: '7', value: '7', type: 'number', position: { row: 1, col: 0 } },
  { id: 'n8', label: '8', value: '8', type: 'number', position: { row: 1, col: 1 } },
  { id: 'n9', label: '9', value: '9', type: 'number', position: { row: 1, col: 2 } },
  { id: 'multiply', label: '×', value: '*', type: 'operator', position: { row: 1, col: 3 } },
  { id: 'n4', label: '4', value: '4', type: 'number', position: { row: 2, col: 0 } },
  { id: 'n5', label: '5', value: '5', type: 'number', position: { row: 2, col: 1 } },
  { id: 'n6', label: '6', value: '6', type: 'number', position: { row: 2, col: 2 } },
  { id: 'subtract', label: '−', value: '-', type: 'operator', position: { row: 2, col: 3 } },
  { id: 'n1', label: '1', value: '1', type: 'number', position: { row: 3, col: 0 } },
  { id: 'n2', label: '2', value: '2', type: 'number', position: { row: 3, col: 1 } },
  { id: 'n3', label: '3', value: '3', type: 'number', position: { row: 3, col: 2 } },
  { id: 'add', label: '+', value: '+', type: 'operator', position: { row: 3, col: 3 } },
  { id: 'negate', label: '±', value: 'negate', type: 'action', position: { row: 4, col: 0 } },
  { id: 'n0', label: '0', value: '0', type: 'number', position: { row: 4, col: 1 } },
  { id: 'decimal', label: '.', value: '.', type: 'operator', position: { row: 4, col: 2 } },
  { id: 'equals', label: '=', value: 'evaluate', type: 'action', position: { row: 4, col: 3 } },
];

export const scientificButtons: ButtonConfig[] = [
  ...basicButtons,
  { id: 'sin', label: 'sin', value: 'sin(', type: 'function', position: { row: 0, col: 4 } },
  { id: 'cos', label: 'cos', value: 'cos(', type: 'function', position: { row: 0, col: 5 } },
  { id: 'tan', label: 'tan', value: 'tan(', type: 'function', position: { row: 0, col: 6 } },
  { id: 'log', label: 'log', value: 'log(', type: 'function', position: { row: 1, col: 4 } },
  { id: 'ln', label: 'ln', value: 'ln(', type: 'function', position: { row: 1, col: 5 } },
  { id: 'sqrt', label: '√', value: 'sqrt(', type: 'function', position: { row: 1, col: 6 } },
  { id: 'power', label: 'x^y', value: '^', type: 'operator', position: { row: 2, col: 4 } },
  { id: 'factorial', label: 'x!', value: '!', type: 'function', position: { row: 2, col: 5 } },
  { id: 'pi', label: 'π', value: 'PI', type: 'number', position: { row: 2, col: 6 } },
  { id: 'exp', label: 'e', value: 'E', type: 'number', position: { row: 3, col: 4 } },
  { id: 'inverse', label: '1/x', value: '1/', type: 'function', position: { row: 3, col: 5 } },
  { id: 'abs', label: '|x|', value: 'abs(', type: 'function', position: { row: 3, col: 6 } },
];

export const memoryButtons: ButtonConfig[] = [
  { id: 'mc', label: 'MC', value: 'mc', type: 'memory', position: { row: 0, col: 7 } },
  { id: 'mr', label: 'MR', value: 'mr', type: 'memory', position: { row: 1, col: 7 } },
  { id: 'm-plus', label: 'M+', value: 'm+', type: 'memory', position: { row: 2, col: 7 } },
  { id: 'm-minus', label: 'M-', value: 'm-', type: 'memory', position: { row: 3, col: 7 } },
  { id: 'ms', label: 'MS', value: 'ms', type: 'memory', position: { row: 4, col: 7 } },
];
