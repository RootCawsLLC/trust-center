"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ChartView, type ChartRow } from "./ChartView";
import { deleteChart } from "./actions";

export function SavedChartCard({
  id,
  name,
  subtitle,
  chartType,
  rows,
}: {
  id: string;
  name: string;
  subtitle: string;
  chartType: string;
  rows: ChartRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm(`Delete chart "${name}"?`)) return;
    start(async () => {
      await deleteChart(id);
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{name}</h3>
          <p className="text-xs text-ink-faint">{subtitle}</p>
        </div>
        <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={remove} disabled={pending} aria-label="Delete chart">
          <Trash2 size={15} />
        </button>
      </div>
      <ChartView rows={rows} chartType={chartType} />
    </div>
  );
}
