import { useState, useRef, useCallback, useEffect } from 'react';
import type { ThemeConfig, ThemeMode } from '@calculo/shared';
import { themes } from '@calculo/config';
import { Calculator } from './calculator';
import { ThemePanel } from './theme-panel';

interface DraggableCalculatorProps {
  defaultTheme?: ThemeMode;
  initialMode?: 'basic' | 'scientific' | 'graphing';
  lockTheme?: boolean;
  lockSize?: boolean;
  lockMode?: boolean;
}

export function DraggableCalculator({
  defaultTheme = 'dark',
  initialMode = 'basic',
  lockTheme = false,
  lockSize = false,
  lockMode = false,
}: DraggableCalculatorProps) {
  const [theme, setTheme] = useState<ThemeConfig>({ ...themes[defaultTheme] ?? themes.dark });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 340, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showEmbedPanel, setShowEmbedPanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [mode, setMode] = useState<'basic' | 'scientific' | 'graphing'>(initialMode);
  const [copyMsg, setCopyMsg] = useState('Copy');
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };
  }, [position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (lockSize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };
  }, [size, lockSize]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) setPosition({ x: dragRef.current.startPosX + e.clientX - dragRef.current.startX, y: dragRef.current.startPosY + e.clientY - dragRef.current.startY });
      if (isResizing && resizeRef.current) setSize({ width: Math.max(280, resizeRef.current.startW + e.clientX - resizeRef.current.startX), height: Math.max(400, resizeRef.current.startH + e.clientY - resizeRef.current.startY) });
    };
    const onUp = () => { setIsDragging(false); setIsResizing(false); dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, isResizing]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowThemePanel(false); setShowEmbedPanel(false); setShowConfigPanel(false);
      }
    };
    if (showThemePanel || showEmbedPanel || showConfigPanel) { document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick); }
  }, [showThemePanel, showEmbedPanel, showConfigPanel]);

  const handleThemeSelect = useCallback((newTheme: ThemeConfig) => { setTheme(newTheme); setShowThemePanel(false); }, []);

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

  const configJson = JSON.stringify({
    mode, theme: theme.mode, width: size.width, height: size.height,
    lockTheme, lockSize, lockMode,
  }, null, 2);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopyMsg('Done');
    setTimeout(() => setCopyMsg(label), 2000);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border shadow-2xl"
        style={{
          width: size.width, height: size.height,
          transform: `translate(${position.x}px, ${position.y}px)`,
          borderColor: `color-mix(in srgb, ${theme.primaryColor} 25%, transparent)`,
          borderRadius: theme.borderRadius,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 text-xs select-none"
          style={{ backgroundColor: theme.backgroundColor, color: theme.textColor, cursor: 'grab', borderBottom: `1px solid color-mix(in srgb, ${theme.primaryColor} 10%, transparent)` }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="opacity-40 font-medium">calculo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); setShowConfigPanel(!showConfigPanel); setShowThemePanel(false); setShowEmbedPanel(false); }}
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-50 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`, color: theme.primaryColor }}
            >Config</button>
            <button onClick={(e) => { e.stopPropagation(); setShowEmbedPanel(!showEmbedPanel); setShowThemePanel(false); setShowConfigPanel(false); }}
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-50 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`, color: theme.primaryColor }}
            >Embed</button>
            {!lockTheme && (
              <button onClick={(e) => { e.stopPropagation(); setShowThemePanel(!showThemePanel); setShowEmbedPanel(false); setShowConfigPanel(false); }}
                className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-50 hover:opacity-100 transition-opacity"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`, color: theme.primaryColor }}
              >Theme</button>
            )}
            <span className="text-[9px] opacity-20 font-mono ml-0.5">{size.width}×{size.height}</span>
          </div>
        </div>

        <div style={{ height: `calc(100% - 34px)`, overflow: 'hidden', backgroundColor: theme.backgroundColor }}>
          <Calculator
            theme={theme}
            mode={mode}
            onModeChange={lockMode ? undefined : setMode}
            compact={size.height < 460}
            lockConfig={{ theme: lockTheme, size: lockSize, mode: lockMode }}
          />
        </div>

        {!lockSize && (
          <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-40 hover:opacity-100 transition-opacity group" style={{ color: theme.textColor }} onMouseDown={handleResizeStart}>
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
              <path d="M16 0v16H0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.25} />
              <path d="M16 8v8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.12} />
            </svg>
          </div>
        )}
      </div>

      {(showThemePanel || showEmbedPanel || showConfigPanel) && (
        <div ref={panelRef} className="absolute z-50 rounded-xl border shadow-2xl"
          style={{
            top: `calc(50% - ${size.height / 2}px)`, left: `calc(100% + 12px)`,
            backgroundColor: theme.backgroundColor,
            borderColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
            minWidth: showEmbedPanel ? 300 : 220,
            transform: `translateY(${position.y > 200 ? '-100%' : '0'})`,
          }}
        >
          {showThemePanel && <ThemePanel current={theme} onSelect={handleThemeSelect} />}
          {showEmbedPanel && (
            <div className="p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-widest font-medium opacity-40">Embed</div>
              <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.backgroundColor} 80%, #000)`, color: theme.textColor, border: `1px solid color-mix(in srgb, ${theme.primaryColor} 12%, transparent)` }}>{embedCode}</pre>
              <button onClick={() => copy(embedCode, 'Copy')}
                className="w-full py-1.5 text-[10px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`, color: theme.primaryColor }}>{copyMsg}</button>
            </div>
          )}
          {showConfigPanel && (
            <div className="p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-widest font-medium opacity-40">Config</div>
              <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.backgroundColor} 80%, #000)`, color: theme.textColor, border: `1px solid color-mix(in srgb, ${theme.primaryColor} 12%, transparent)` }}>{configJson}</pre>
              <button onClick={() => copy(configJson, 'Copy')}
                className="w-full py-1.5 text-[10px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`, color: theme.primaryColor }}>{copyMsg}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
