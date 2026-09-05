"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Save } from "lucide-react";
import { ChartView, type ChartRow } from "./ChartView";
import { previewChart, saveChart } from "./actions";

type Dataset = { key: string; label: string; dimensions: { key: string; label: string }[] };

export function QueryBuilder({
  datasets,
  chartTypes,
  dashboardId,
  dashboardName,
}: {
  datasets: Dataset[];
  chartTypes: { key: string; label: string }[];
  dashboardId: string;
  dashboardName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)} disabled={!dashboardId}>
        <Plus size={16} /> New chart
      </button>
      {open && (
        <Builder
          datasets={datasets}
          chartTypes={chartTypes}
          dashboardId={dashboardId}
          dashboardName={dashboardName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Builder({
  datasets,
  chartTypes,
  dashboardId,
  dashboardName,
  onClose,
}: {
  datasets: Dataset[];
  chartTypes: { key: string; label: string }[];
  dashboardId: string;
  dashboardName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [dataset, setDataset] = useState(datasets[0].key);
  const [dimension, setDimension] = useState(datasets[0].dimensions[0].key);
  const [chartType, setChartType] = useState("bar");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dims = datasets.find((d) => d.key === dataset)?.dimensions ?? [];

  useEffect(() => {
    start(async () => {
      const res = await previewChart(dataset, dimension, from || undefined, to || undefined);
      if (res.ok) setRows(res.rows);
      else setError(res.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, dimension, from, to]);

  function onDataset(key: string) {
    setDataset(key);
    setDimension(datasets.find((d) => d.key === key)?.dimensions[0].key ?? "");
  }

  function suggestName() {
    const dl = datasets.find((d) => d.key === dataset)?.label ?? dataset;
    const dm = dims.find((d) => d.key === dimension)?.label ?? dimension;
    return `${dl} by ${dm.toLowerCase()}`;
  }

  function save() {
    setSaving(true);
    setError(null);
    saveChart({ name: name.trim() || suggestName(), dataset, dimension, chartType, dashboardId, from: from || undefined, to: to || undefined }).then((res) => {
      setSaving(false);
      if (!res.ok) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New chart</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="mb-4 text-sm text-ink-faint">Adds to the <span className="font-medium text-ink">{dashboardName}</span> view.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Dataset</span>
            <select className="input" value={dataset} onChange={(e) => onDataset(e.target.value)}>
              {datasets.map((d) => (<option key={d.key} value={d.key}>{d.label}</option>))}
            </select>
          </label>
          <label className="block">
            <span className="label">Group by</span>
            <select className="input" value={dimension} onChange={(e) => setDimension(e.target.value)}>
              {dims.map((d) => (<option key={d.key} value={d.key}>{d.label}</option>))}
            </select>
          </label>
          <label className="block">
            <span className="label">Chart type</span>
            <select className="input" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              {chartTypes.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">From</span>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">To</span>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Preview {pending && <Loader2 size={12} className="animate-spin" />}
          </div>
          <ChartView rows={rows} chartType={chartType} />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center gap-2">
          <input className="input flex-1" placeholder={suggestName()} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save to view
          </button>
        </div>
      </div>
    </div>
  );
}
