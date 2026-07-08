import type { ThemeConfig, ThemeMode } from '@calculo/shared';
import { themes } from '@calculo/config';

interface ThemePanelProps {
  current: ThemeConfig;
  onSelect: (theme: ThemeConfig) => void;
}

const themeOrder: ThemeMode[] = [
  'dark', 'light', 'oled', 'high-contrast', 'glass',
  'neumorphism', 'minimal', 'corporate',
];

export function ThemePanel({ current, onSelect }: ThemePanelProps) {
  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-widest font-medium opacity-40">Themes</div>
      <div className="grid grid-cols-4 gap-2">
        {themeOrder.map((mode) => {
          const t = themes[mode];
          const isActive = current.mode === mode;
          return (
            <button
              key={mode}
              onClick={() => onSelect({ ...t })}
              title={mode}
              className={`
                relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150
                ${isActive
                  ? 'border-zinc-400 ring-1 ring-zinc-400/30'
                  : 'border-transparent hover:border-zinc-700'
                }
              `}
              style={{ backgroundColor: t.backgroundColor }}
            >
              <span
                className="w-full h-6 rounded text-[8px] font-mono flex items-center justify-center font-bold"
                style={{
                  backgroundColor: t.primaryColor,
                  color: t.textColor,
                  borderRadius: t.borderRadius,
                }}
              >
                a+b
              </span>
              <span
                className="text-[9px] capitalize truncate w-full text-center"
                style={{ color: t.textColor }}
              >
                {mode}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
