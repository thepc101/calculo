import { useState, useRef, useCallback, useEffect } from 'react';
import type { ThemeConfig, ThemeMode } from '@calculo/shared';
import { themes } from '@calculo/config';
import { Calculator } from './calculator';
import { ThemePanel } from './theme-panel';

interface DraggableCalculatorProps {
  defaultTheme?: ThemeMode;
  initialMode?: 'basic' | 'scientific';
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
  const [size, setSize] = useState({ width: 320, height: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState<'theme' | 'embed' | 'config' | null>(null);
  const [mode, setMode] = useState<'basic' | 'scientific'>(initialMode);
  const [copyMsg, setCopyMsg] = useState('Copy');
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (isResizing && resizeRef.current) setSize({ width: Math.max(260, resizeRef.current.startW + e.clientX - resizeRef.current.startX), height: Math.max(360, resizeRef.current.startH + e.clientY - resizeRef.current.startY) });
    };
    const onUp = () => { setIsDragging(false); setIsResizing(false); dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, isResizing]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    if (menuOpen) { document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick); }
  }, [menuOpen]);

  const handleThemeSelect = useCallback((newTheme: ThemeConfig) => { setTheme(newTheme); setMenuOpen(null); }, []);

  const embedCode = `<div class="calculo-calculator"
  data-mode="${mode}"
  data-theme="${theme.mode}"
  data-width="${size.width}"
  data-height="${size.height}"
  ${lockTheme ? 'data-lock-theme="true"' : ''}
  ${lockSize ? 'data-lock-size="true"' : ''}
  ${lockMode ? 'data-lock-mode="true"' : ''}
></div>
<script src="https://cdn.calculo.dev/widget.js"><\/script>`;

  const configJson = JSON.stringify({ mode, theme: theme.mode, width: size.width, height: size.height, lockTheme, lockSize, lockMode }, null, 2);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopyMsg('Done');
    setTimeout(() => setCopyMsg(label), 2000);
  };

  const [menuTab, setMenuTab] = useState<'theme' | 'embed' | 'config'>('theme');

  const toggleMenu = () => {
    setMenuOpen(prev => prev ? null : 'menu');
    setMenuTab('theme');
  };

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all shadow-lg"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="9" y1="6" x2="15" y2="6" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="9" y1="14" x2="13" y2="14" />
        </svg>
        Show Calculator
      </button>
    );
  }

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
            <span className="opacity-30 font-semibold tracking-wide text-[10px] uppercase">calculo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); toggleMenu(); }}
                className="p-1 rounded opacity-40 hover:opacity-80 transition-opacity"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute z-50 right-0 top-full mt-1 rounded-xl border shadow-2xl overflow-hidden"
                  style={{
                    backgroundColor: '#18181b',
                    borderColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`,
                    minWidth: 240,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex border-b border-zinc-800">
                    {(['theme', 'embed', 'config'] as const).map(tab => (
                      <button key={tab} onClick={() => setMenuTab(tab)}
                        className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-medium transition-all ${
                          menuTab === tab ? 'text-zinc-100 border-b-2 border-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >{tab}</button>
                    ))}
                  </div>
                  {menuTab === 'theme' && <ThemePanel current={theme} onSelect={handleThemeSelect} />}
                  {menuTab === 'embed' && (
                    <div className="p-4 space-y-3">
                      <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap"
                        style={{ backgroundColor: '#09090b', color: theme.textColor, border: '1px solid rgba(255,255,255,0.08)' }}>{embedCode}</pre>
                      <button onClick={() => copy(embedCode, 'Copy')}
                        className="w-full py-1.5 text-[10px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
                        style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`, color: theme.primaryColor }}>{copyMsg}</button>
                    </div>
                  )}
                  {menuTab === 'config' && (
                    <div className="p-4 space-y-3">
                      <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed"
                        style={{ backgroundColor: '#09090b', color: theme.textColor, border: '1px solid rgba(255,255,255,0.08)' }}>{configJson}</pre>
                      <button onClick={() => copy(configJson, 'Copy')}
                        className="w-full py-1.5 text-[10px] rounded-lg uppercase tracking-wider font-medium transition-all hover:brightness-110"
                        style={{ backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 20%, transparent)`, color: theme.primaryColor }}>{copyMsg}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => { setVisible(false); setMenuOpen(null); }}
              className="p-1 rounded opacity-30 hover:opacity-70 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
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
          <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-30 hover:opacity-80 transition-opacity" style={{ color: theme.textColor }} onMouseDown={handleResizeStart}>
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
              <path d="M16 0v16H0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.2} />
              <path d="M16 8v8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.1} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
