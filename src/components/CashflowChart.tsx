import React, { useState, useMemo } from 'react';
import { Transaction, Currency, Language } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CashflowChartProps {
  transactions: Transaction[];
  currency: Currency;
  lang: Language;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions, currency, lang }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group transactions by date
  const chartData = useMemo(() => {
    // Collect dates from last 14 days or available transactions
    const dateMap = new Map<string, { date: string; income: number; expense: number }>();

    // Generate last 10 days array to ensure continuous timeline
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dateMap.set(dateStr, { date: dateStr, income: 0, expense: 0 });
    }

    // Populate with actual transactions
    transactions.forEach(t => {
      if (t.type === 'transfer') return;
      let entry = dateMap.get(t.date);
      if (!entry) {
        entry = { date: t.date, income: 0, expense: 0 };
        dateMap.set(t.date, entry);
      }
      if (t.type === 'income') {
        entry.income += t.amountInBase;
      } else if (t.type === 'expense') {
        entry.expense += t.amountInBase;
      }
    });

    const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-10); // show last 10 days
  }, [transactions]);

  const maxVal = useMemo(() => {
    const highest = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 500000);
    return Math.ceil(highest * 1.15);
  }, [chartData]);

  const width = 760;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const points = useMemo(() => {
    if (chartData.length === 0) return { incomePoints: '', expensePoints: '', coords: [] };
    const step = plotWidth / (chartData.length - 1 || 1);

    const coords = chartData.map((d, i) => {
      const x = paddingX + i * step;
      const yInc = height - paddingY - (d.income / maxVal) * plotHeight;
      const yExp = height - paddingY - (d.expense / maxVal) * plotHeight;
      return { x, yInc, yExp, ...d };
    });

    const incomeLine = coords.map(c => `${c.x},${c.yInc}`).join(' ');
    const expenseLine = coords.map(c => `${c.x},${c.yExp}`).join(' ');

    return { incomePoints: incomeLine, expensePoints: expenseLine, coords };
  }, [chartData, maxVal, plotWidth, plotHeight, height, paddingX, paddingY]);

  const activePoint = hoveredIndex !== null && points.coords[hoveredIndex] ? points.coords[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      {/* Chart Header info / Legend */}
      <div className="flex items-center justify-between pb-3 text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
            <span className="text-slate-300 font-medium">{lang === 'lo' ? 'ລາຍຮັບ (Income)' : 'Income'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
            <span className="text-slate-300 font-medium">{lang === 'lo' ? 'ລາຍຈ່າຍ (Expense)' : 'Expense'}</span>
          </div>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-slate-900/90 px-3 py-1 rounded border border-slate-800">
            <span className="text-slate-400">{formatDate(activePoint.date, lang)}</span>
            <span className="text-emerald-400 font-mono tabular-nums">+{formatCurrency(activePoint.income, currency)}</span>
            <span className="text-rose-400 font-mono tabular-nums">-{formatCurrency(activePoint.expense, currency)}</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 md:h-56 select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * plotHeight;
            const val = maxVal * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  className="font-mono tabular-nums"
                >
                  {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${Math.round(val / 1000)}k`}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Income Fill Area */}
          {points.coords.length > 0 && (
            <polygon
              points={`${paddingX},${height - paddingY} ${points.incomePoints} ${points.coords[points.coords.length - 1].x},${height - paddingY}`}
              fill="url(#incomeAreaGrad)"
            />
          )}

          {/* Expense Fill Area */}
          {points.coords.length > 0 && (
            <polygon
              points={`${paddingX},${height - paddingY} ${points.expensePoints} ${points.coords[points.coords.length - 1].x},${height - paddingY}`}
              fill="url(#expenseAreaGrad)"
            />
          )}

          {/* Income Stroke Line */}
          {points.incomePoints && (
            <polyline
              points={points.incomePoints}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Expense Stroke Line */}
          {points.expensePoints && (
            <polyline
              points={points.expensePoints}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Hover Columns & Markers */}
          {points.coords.map((c, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={c.date} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)}>
                {/* Invisible hover trigger column */}
                <rect
                  x={c.x - plotWidth / (points.coords.length * 2)}
                  y={0}
                  width={plotWidth / points.coords.length}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={c.x}
                    y1={paddingY}
                    x2={c.x}
                    y2={height - paddingY}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Income point */}
                <circle
                  cx={c.x}
                  cy={c.yInc}
                  r={isHovered ? 5 : 3}
                  fill="#10b981"
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Expense point */}
                <circle
                  cx={c.x}
                  cy={c.yExp}
                  r={isHovered ? 5 : 3}
                  fill="#f43f5e"
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* X Axis Date label */}
                <text
                  x={c.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#f1f5f9' : '#64748b'}
                  fontSize="9.5"
                  className="font-mono tabular-nums"
                >
                  {c.date.slice(8, 10)}/{c.date.slice(5, 7)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
