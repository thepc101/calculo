import type { CalculatorConfig, ThemeConfig } from './types';

export function createDefaultConfig(overrides?: Partial<CalculatorConfig>): CalculatorConfig {
  return {
    type: 'basic',
    theme: createDefaultTheme(),
    width: '100%',
    height: 600,
    precision: 12,
    angleMode: 'rad',
    graph: false,
    history: true,
    memory: true,
    buttons: [],
    layout: {
      rows: 5,
      columns: 4,
      gap: 4,
      padding: 16,
      buttonOrder: [],
      sidePanel: false,
      graphPanel: false,
    },
    variables: [],
    functions: [],
    display: {
      showExpression: true,
      showResult: true,
      showHistory: true,
      fontSize: 24,
      multiline: true,
      maxLines: 5,
    },
    accessibility: {
      ariaLabels: true,
      keyboardShortcuts: true,
      highContrast: false,
      screenReader: true,
    },
    localization: {
      locale: 'en-US',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencySymbol: '$',
    },
    ...overrides,
  };
}

export function createDefaultTheme(overrides?: Partial<ThemeConfig>): ThemeConfig {
  return {
    mode: 'dark',
    primaryColor: '#3b82f6',
    backgroundColor: '#0a0a0b',
    textColor: '#fafafa',
    fontFamily: 'Geist, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 4,
    ...overrides,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'cal_';
  for (let i = 0; i < 48; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function formatNumber(value: number, locale = 'en-US', decimals = 10): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
