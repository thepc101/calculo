import { useState, useRef, useCallback, useEffect } from 'react';
import type { CalculatorConfig, ThemeConfig } from '@calculo/shared';
import { createDefaultTheme } from '@calculo/shared';
import { themes } from '@calculo/config';
import { Calculator } from './calculator';
import { ThemePanel } from './theme-panel';

interface DraggableCalculatorProps {
  config?: Partial<CalculatorConfig>;
  defaultTheme?: ThemeMode;
}

export function DraggableCalculator({ config, defaultTheme = 'dark' }: DraggableCalculatorProps) {
  const [theme, setTheme] = useState<ThemeConfig>({ ...themes[defaultTheme] ?? themes.dark });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
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
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
  }, [size]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.startPosX + dx,
          y: dragRef.current.startPosY + dy,
        });
      }
      if (isResizing && resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        setSize({
          width: Math.max(240, resizeRef.current.startW + dx),
          height: Math.max(360, resizeRef.current.startH + dy),
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
        setShowPanel(false);
      }
    };
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const handleThemeSelect = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    setShowPanel(false);
  }, []);

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
          className="flex items-center justify-between px-3 py-2 text-xs font-medium select-none"
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
            <span className="opacity-50 ml-2">calculo</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowPanel(!showPanel); }}
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
                color: theme.primaryColor,
              }}
            >
              Theme
            </button>
            <span className="text-[10px] opacity-30 font-mono">{size.width}×{size.height}</span>
          </div>
        </div>

        <div
          style={{
            height: `calc(100% - 36px)`,
            overflow: 'hidden',
            backgroundColor: theme.backgroundColor,
          }}
        >
          <Calculator
            config={config}
            theme={theme}
          />
        </div>

        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:opacity-100 opacity-40 transition-opacity"
          style={{ color: theme.textColor }}
          onMouseDown={handleResizeStart}
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
            <path d="M16 0v16H0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.4} />
            <path d="M16 8v8H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.25} />
          </svg>
        </div>
      </div>

      {showPanel && (
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
    </div>
  );
}
