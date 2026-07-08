import { useState, useRef, useCallback, useEffect } from 'react';
import type { CalculatorConfig, ThemeConfig, ThemeMode } from '@calculo/shared';
import { themes } from '@calculo/config';
import { Calculator } from './calculator';
import { ThemePanel } from './theme-panel';

interface DraggableCalculatorProps {
  config?: Partial<CalculatorConfig>;
  defaultTheme?: ThemeMode;
  initialMode?: 'basic' | 'scientific' | 'graphing';
  lockTheme?: boolean;
  lockSize?: boolean;
  lockMode?: boolean;
}

const sizePresets = [
  { label: 'S', w: 260, h: 400 },
  { label: 'M', w: 320, h: 520 },
  { label: 'L', w: 400, h: 600 },
  { label: 'XL', w: 500, h: 700 },
];

export function DraggableCalculator({
  config,
  defaultTheme = 'dark',
  initialMode = 'basic',
  lockTheme = false,
  lockSize = false,
  lockMode = false,
}: DraggableCalculatorProps) {
  const [theme, setTheme] = useState<ThemeConfig>({ ...themes[defaultTheme] ?? themes.dark });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 520 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showEmbedPanel, setShowEmbedPanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [mode, setMode] = useState<'basic' | 'scientific' | 'graphing'>(initialMode);
  const [copyMsg, setCopyMsg] = useState('Copy Code');
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }, [position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (lockSize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
  }, [size, lockSize]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        setPosition({
          x: dragRef.current.startPosX + e.clientX - dragRef.current.startX,
          y: dragRef.current.startPosY + e.clientY - dragRef.current.startY,
        });
      }
      if (isResizing && resizeRef.current) {
        setSize({
          width: Math.max(240, resizeRef.current.startW + e.clientX - resizeRef.current.startX),
          height: Math.max(360, resizeRef.current.startH + e.clientY - resizeRef.current.startY),
        });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowThemePanel(false);
        setShowEmbedPanel(false);
        setShowConfigPanel(false);
      }
    };
    if (showThemePanel || showEmbedPanel || showConfigPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemePanel, showEmbedPanel, showConfigPanel]);

  const handleThemeSelect = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    setShowThemePanel(false);
  }, []);

  const configJson = JSON.stringify({
    mode,
    theme: theme.mode,
    width: size.width,
    height: size.height,
    lockTheme,
    lockSize,
    lockMode,
  }, null, 2);

  const embedCode = `<!-- calculo embed -->
<div class="calculo-calculator"
  data-mode="${mode}"
  data-theme="${theme.mode}"
  data-width="${size.width}"
  data-height="${size.height}"
  ${lockTheme ? 'data-lock-theme="true"' : ''}
  ${lockSize ? 'data-lock-size="true"' : ''}
  ${lockMode ? 'data-lock-mode="true"' : ''}
></div>
<script src="https://cdn.calculo.dev/widget.js"><\/script>`;

  const handleCopy = async (text: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(msg), 2000);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          width: size.width,
          height: size.height,
          transform: `translate(${position.x}px, ${position.y}px)`,
          borderColor: `color-mix(in srgb, ${theme.primaryColor} 30%, transparent)`,
          borderRadius: theme.borderRadius,
          cursor: isDragging ? 'grabbing' : 'auto',
          transition: isDragging || isResizing ? 'none' : 'box-shadow 0.3s',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5 text-xs font-medium select-none"
          style={{
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
            cursor: 'grab',
            borderBottom: `1px solid color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="opacity-50 ml-2">calculo · {mode}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!lockSize && (
              <div className="flex gap-0.5 mr-1">
                {sizePresets.map((p) => (
                  <button
                    key={p.label}
                    onClick={(e) => { e.stopPropagation(); setSize({ width: p.w, height: p.h }); }}
                    className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${
                      size.width === p.w && size.height === p.h ? 'opacity-100 font-bold' : 'opacity-40 hover:opacity-70'
                    }`}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`,
                      color: theme.primaryColor,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowEmbedPanel(!showEmbedPanel); setShowThemePanel(false); setShowConfigPanel(false); }}
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
                color: theme.primaryColor,
              }}
            >
              Embed
            </button>
            {!lockTheme && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowThemePanel(!showThemePanel); setShowEmbedPanel(false); setShowConfigPanel(false); }}
                className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-60 hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
                  color: theme.primaryColor,
                }}
              >
                Theme
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfigPanel(!showConfigPanel); setShowThemePanel(false); setShowEmbedPanel(false); }}
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
                color: theme.primaryColor,
              }}
            >
              Config
            </button>
            <span className="text-[10px] opacity-30 font-mono ml-1">{size.width}×{size.height}</span>
          </div>
        </div>

        <div
          style={{
            height: `calc(100% - 32px)`,
            overflow: 'hidden',
            backgroundColor: theme.backgroundColor,
          }}
        >
          <Calculator
            config={config}
            theme={theme}
            mode={mode}
            onModeChange={lockMode ? undefined : setMode}
            compact={size.height < 440}
            lockConfig={{ theme: lockTheme, size: lockSize, mode: lockMode }}
          />
        </div>

        {!lockSize && (
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize hover:opacity-100 opacity-50 transition-opacity group"
            style={{ color: theme.textColor }}
            onMouseDown={handleResizeStart}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
              <path d="M16 0v16H0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.3} />
              <path d="M16 8v8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.15} />
            </svg>
            <span className="absolute bottom-5 right-0 text-[9px] opacity-0 group-hover:opacity-60 whitespace-nowrap font-mono transition-opacity">
              {size.width}×{size.height}
            </span>
          </div>
        )}
      </div>

      {showThemePanel && (
        <div
          ref={panelRef}
          className="absolute z-50 rounded-xl border shadow-2xl"
          style={{
            top: `calc(50% - ${size.height / 2}px)`,
            left: `calc(100% + 12px)`,
            backgroundColor: theme.backgroundColor,
            borderColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
            minWidth: 200,
            transform: `translateY(${position.y > 200 ? '-100%' : '0'})`,
          }}
        >
          <ThemePanel current={theme} onSelect={handleThemeSelect} />
        </div>
      )}

      {showEmbedPanel && (
        <div
          ref={panelRef}
          className="absolute z-50 rounded-xl border shadow-2xl"
          style={{
            top: `calc(50% - ${size.height / 2}px)`,
            left: `calc(100% + 12px)`,
            backgroundColor: theme.backgroundColor,
            borderColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
            minWidth: 320,
            transform: `translateY(${position.y > 200 ? '-100%' : '0'})`,
          }}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-medium opacity-40">Embed Code</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-[10px] opacity-50 cursor-pointer">
                  <input type="checkbox" checked={lockTheme} read-only className="sr-only" />
                  <span className="w-3 h-3 rounded border border-zinc-600 flex items-center justify-center">
                    {lockTheme && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-400" />}
                  </span>
                  Lock Th
                </label>
                <label className="flex items-center gap-1 text-[10px] opacity-50 cursor-pointer">
                  <input type="checkbox" checked={lockSize} read-only className="sr-only" />
                  <span className="w-3 h-3 rounded border border-zinc-600 flex items-center justify-center">
                    {lockSize && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-400" />}
                  </span>
                  Lock Sz
                </label>
                <label className="flex items-center gap-1 text-[10px] opacity-50 cursor-pointer">
                  <input type="checkbox" checked={lockMode} read-only className="sr-only" />
                  <span className="w-3 h-3 rounded border border-zinc-600 flex items-center justify-center">
                    {lockMode && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-400" />}
                  </span>
                  Lock Md
                </label>
              </div>
            </div>
            <pre
              className="text-xs font-mono p-3 rounded-lg overflow-x-auto leading-relaxed"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.backgroundColor} 80%, #000)`,
                color: theme.textColor,
                border: `1px solid color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`,
              }}
            >
              {embedCode}
            </pre>
            <button
              onClick={() => handleCopy(embedCode, 'Copy Code')}
              className="w-full py-2 text-[11px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
                color: theme.primaryColor,
              }}
            >
              {copyMsg}
            </button>
          </div>
        </div>
      )}

      {showConfigPanel && (
        <div
          ref={panelRef}
          className="absolute z-50 rounded-xl border shadow-2xl"
          style={{
            top: `calc(50% - ${size.height / 2}px)`,
            left: `calc(100% + 12px)`,
            backgroundColor: theme.backgroundColor,
            borderColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
            minWidth: 280,
            transform: `translateY(${position.y > 200 ? '-100%' : '0'})`,
          }}
        >
          <div className="p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-medium opacity-40">Calculator Config</div>
            <pre
              className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed max-h-64 overflow-y-auto"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.backgroundColor} 80%, #000)`,
                color: theme.textColor,
                border: `1px solid color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`,
              }}
            >
              {configJson}
            </pre>
            <button
              onClick={() => handleCopy(configJson, 'Copy Config')}
              className="w-full py-2 text-[11px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
                color: theme.primaryColor,
              }}
            >
              {copyMsg}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
