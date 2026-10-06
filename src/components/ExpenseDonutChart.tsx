import React, { useState, useMemo } from 'react';
import { Transaction, Category, Currency, Language } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface ExpenseDonutChartProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  lang: Language;
}

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  transactions,
  categories,
  currency,
  lang,
}) => {
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Aggregate expenses by category
  const data = useMemo(() => {
    const expenseTotals = new Map<string, number>();
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const current = expenseTotals.get(t.categoryId) || 0;
        expenseTotals.set(t.categoryId, current + t.amountInBase);
        totalExpense += t.amountInBase;
      }
    });

    if (totalExpense === 0) return { items: [], totalExpense: 0 };

    const items = Array.from(expenseTotals.entries())
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        const percentage = Math.round((amount / totalExpense) * 100);
        return {
          id: catId,
          name: cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : catId,
          icon: cat?.icon || 'HelpCircle',
          color: cat?.color || '#94a3b8',
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { items, totalExpense };
  }, [transactions, catMap, lang]);

  // SVG Donut Calculations
  const radius = 64;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    if (data.totalExpense === 0) return [];
    let accumulatedAngle = 0;

    return data.items.map(item => {
      const fraction = item.amount / data.totalExpense;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [data, circumference]);

  const activeCategory = hoveredCatId
    ? data.items.find(i => i.id === hoveredCatId)
    : null;

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
        <p className="text-sm">{lang === 'lo' ? 'ຍັງບໍ່ມີລາຍຈ່າຍໃນຊ່ວງເວລານີ້' : 'No expenses recorded in this period'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Donut Graphic */}
      <div className="md:col-span-5 flex flex-col items-center justify-center relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Colored Category Segments */}
            {donutSegments.map(segment => {
              const isHovered = hoveredCatId === segment.id;
              return (
                <circle
                  key={segment.id}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredCatId(segment.id)}
                  onMouseLeave={() => setHoveredCatId(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            {activeCategory ? (
              <>
                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[100px]">
                  {activeCategory.name}
                </span>
                <span className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                  {activeCategory.percentage}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                  {formatCurrency(activeCategory.amount, currency)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                  {lang === 'lo' ? 'ລາຍຈ່າຍລວມ' : 'Total'}
                </span>
                <span className="text-base font-bold text-slate-100 font-mono tabular-nums">
                  {formatCurrency(data.totalExpense, currency)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {data.items.length} {lang === 'lo' ? 'ໝວດໝູ່' : 'categories'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="md:col-span-7 space-y-2.5">
        {data.items.slice(0, 5).map(item => {
          const isHovered = hoveredCatId === item.id;
          return (
            <div
              key={item.id}
              className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                isHovered ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-900/40 border-transparent hover:bg-slate-900/80'
              }`}
              onMouseEnter={() => setHoveredCatId(item.id)}
              onMouseLeave={() => setHoveredCatId(null)}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <CategoryIcon iconName={item.icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="text-slate-400 text-[11px]">{item.percentage}%</span>
                  <span className="font-semibold text-slate-100">{formatCurrency(item.amount, currency)}</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}

        {data.items.length > 5 && (
          <p className="text-[11px] text-slate-500 text-center pt-1">
            + {data.items.length - 5} {lang === 'lo' ? 'ໝວດໝູ່ເພີ່ມເຕີມ' : 'more categories'}
          </p>
        )}
      </div>
    </div>
  );
};
