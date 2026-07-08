import { useMemo } from 'react';
import { CalculatorEngine } from '@calculo/calculator-engine';

interface GraphCanvasProps {
  expressions: { expr: string; color: string }[];
  width: number;
  height: number;
}

const engine = new CalculatorEngine();

export function GraphCanvas({ expressions, width, height }: GraphCanvasProps) {
  const padding = 40;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const bounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const xRange = bounds.xMax - bounds.xMin;
  const yRange = bounds.yMax - bounds.yMin;

  const toScreen = (x: number, y: number) => ({
    sx: padding + ((x - bounds.xMin) / xRange) * plotW,
    sy: padding + ((bounds.yMax - y) / yRange) * plotH,
  });

  const curves = useMemo(() => {
    return expressions.map(({ expr, color }) => {
      const points: { x: number; y: number }[] = [];
      const steps = 400;
      const step = xRange / steps;
      for (let i = 0; i <= steps; i++) {
        const x = bounds.xMin + i * step;
        const result = engine.evaluate({ expression: expr, variables: { x } });
        if (!result.error && isFinite(result.result as number)) {
          points.push({ x, y: result.result as number });
        }
      }
      if (points.length < 2) return null;
      const { sx, sy } = toScreen(points[0]!.x, points[0]!.y);
      let d = `M ${sx} ${sy}`;
      for (let i = 1; i < points.length; i++) {
        const { sx: sx2, sy: sy2 } = toScreen(points[i]!.x, points[i]!.y);
        d += ` L ${sx2} ${sy2}`;
      }
      return { d, color };
    }).filter(Boolean) as { d: string; color: string }[];
  }, [expressions, width, height]);

  const { sx: xAxisY } = toScreen(0, 0);
  const yAxisX = padding + ((0 - bounds.xMin) / xRange) * plotW;

  const tickMarks: { label: string; x?: number; y?: number }[] = [];
  for (let i = -9; i <= 9; i++) {
    if (i === 0) continue;
    const { sx, sy } = toScreen(i, 0);
    if (sx >= padding && sx <= width - padding) {
      tickMarks.push({ label: String(i), x: sx, y: 0 });
    }
    if (sy >= padding && sy <= height - padding) {
      tickMarks.push({ label: String(-i), x: 0, y: sy });
    }
  }

  return (
    <svg width={width} height={height} className="block">
      <rect width={width} height={height} fill="transparent" />
      <line x1={padding} y1={xAxisY} x2={width - padding} y2={xAxisY} stroke="currentColor" strokeWidth="1" opacity={0.15} />
      <line x1={yAxisX} y1={padding} x2={yAxisX} y2={height - padding} stroke="currentColor" strokeWidth="1" opacity={0.15} />
      {tickMarks.map((t, i) => (
        <g key={i}>
          {t.x !== undefined && (
            <>
              <line x1={t.x} y1={xAxisY - 4} x2={t.x} y2={xAxisY + 4} stroke="currentColor" strokeWidth="1" opacity={0.2} />
              <text x={t.x} y={xAxisY + 14} textAnchor="middle" className="text-[9px]" fill="currentColor" opacity={0.3}>
                {t.label}
              </text>
            </>
          )}
          {t.y !== undefined && (
            <>
              <line x1={yAxisX - 4} y1={t.y} x2={yAxisX + 4} y2={t.y} stroke="currentColor" strokeWidth="1" opacity={0.2} />
              <text x={yAxisX - 10} y={t.y + 3} textAnchor="end" className="text-[9px]" fill="currentColor" opacity={0.3}>
                {t.label}
              </text>
            </>
          )}
        </g>
      ))}
      {curves.map((c, i) => (
        <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      ))}
      <text x={width - padding} y={padding + 12} textAnchor="end" className="text-[9px]" fill="currentColor" opacity={0.2}>
        x: [{bounds.xMin}, {bounds.xMax}]
      </text>
    </svg>
  );
}
