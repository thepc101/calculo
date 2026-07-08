import type { ThemeConfig, ThemeMode } from '@calculo/shared';
import { themes, themeOrder } from '@calculo/config';

interface ThemePanelProps {
  current: ThemeConfig;
  onSelect: (theme: ThemeConfig) => void;
}

export function ThemePanel({ current, onSelect }: ThemePanelProps) {
  return (
    <div className="p-4 space-y-4 w-64">
      <div className="text-[10px] uppercase tracking-widest font-medium opacity-40">Themes ({themeOrder.length})</div>
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
                relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-150
                ${isActive
                  ? 'border-zinc-400 ring-1 ring-zinc-400/30'
                  : 'border-transparent hover:border-zinc-700'
                }
              `}
              style={{ backgroundColor: t.backgroundColor }}
            >
              <div className="flex gap-0.5 w-full justify-center">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: t.primaryColor }}
                />
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: t.textColor, opacity: 0.3 }}
                />
              </div>
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
