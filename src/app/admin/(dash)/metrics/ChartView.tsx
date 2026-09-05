"use client";

import { cn } from "@/lib/utils";

export type ChartRow = { label: string; n: number };

// A palette for donut slices (brand-forward, then complementary hues).
const SLICE = ["#8b5a5a", "#4f8a8b", "#c58940", "#6b7fd7", "#5aa469", "#b1568a", "#8a8f99", "#c98b3a", "#5f9ea0", "#9b6bd7", "#cf6b6b", "#7a9e5a"];

export function ChartView({ rows, chartType }: { rows: ChartRow[]; chartType: string }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-ink-faint">No data in this period.</p>;
  if (chartType === "pie") return <Donut rows={rows} />;
  if (chartType === "table") return <TableView rows={rows} />;
  return <Bars rows={rows} />;
}

function Bars({ rows }: { rows: ChartRow[] }) {
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-soft" title={r.label}>{r.label}</span>
            <span className="shrink-0 font-semibold text-ink">{r.n}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((r.n / max) * 100, 3)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ rows }: { rows: ChartRow[] }) {
  const total = rows.reduce((s, r) => s + r.n, 0) || 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="py-1.5 pr-4 font-medium">Value</th>
            <th className="py-1.5 pr-4 font-medium">Count</th>
            <th className="py-1.5 font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1.5 pr-4 text-ink">{r.label}</td>
              <td className="py-1.5 pr-4 font-semibold text-ink">{r.n}</td>
              <td className="py-1.5 text-ink-faint">{Math.round((r.n / total) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Donut({ rows }: { rows: ChartRow[] }) {
  const total = rows.reduce((s, r) => s + r.n, 0) || 1;
  const R = 60, C = 2 * Math.PI * R, cx = 80, cy = 80, stroke = 22;
  let offset = 0;
  const segs = rows.map((r, i) => {
    const frac = r.n / total;
    const seg = { color: SLICE[i % SLICE.length], dash: frac * C, offset: offset * C, label: r.label, n: r.n };
    offset += frac;
    return seg;
  });
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segs.map((s) => (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate text-ink-soft" title={s.label}>{s.label}</span>
            <span className="ml-auto shrink-0 font-semibold text-ink">{s.n}</span>
            <span className="w-10 shrink-0 text-right text-xs text-ink-faint">{Math.round((s.n / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartTypeIcon({ type, className }: { type: string; className?: string }) {
  return <span className={cn("text-xs uppercase tracking-wide text-ink-faint", className)}>{type}</span>;
}
