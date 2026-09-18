'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

interface CategoryBreakdownChartProps {
  categories: { category: string; amount: number; count: number }[];
  currency?: string;
}

const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#e11d48', // Rose
  '#64748b', // Slate
];

export default function CategoryBreakdownChart({
  categories,
  currency = '₹',
}: CategoryBreakdownChartProps) {
  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{data.category}</p>
          <p className="text-slate-300">
            {currency}
            {data.amount.toLocaleString('en-IN')} ({pct}%)
          </p>
          <p className="text-[10px] text-slate-400">{data.count} transactions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Spending Breakdown
            </h3>
            <p className="text-xs text-slate-400">Current month by category</p>
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl my-4">
          <p className="text-xs text-slate-400">No expenses recorded for this month yet.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-48 h-48 shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
              <span className="text-xs font-black text-white">
                {currency}
                {totalAmount >= 1000 ? `${Math.round(totalAmount / 1000)}k` : totalAmount}
              </span>
            </div>
          </div>

          {/* List of top categories */}
          <div className="w-full space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {categories.slice(0, 5).map((cat, idx) => {
              const pct = totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 100) : 0;
              return (
                <div key={cat.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span className="text-slate-300 truncate">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-medium">
                    <span className="text-white font-semibold">
                      {currency}
                      {cat.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400 text-[10px] w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
