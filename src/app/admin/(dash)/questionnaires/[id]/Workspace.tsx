"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, SkipForward, RefreshCw, Download, Loader2, CircleCheck, Library } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { updateItem, redraftItem, setQuestionnaireStatus, saveItemToLibrary } from "../actions";

export type WItem = {
  id: string;
  question: string;
  finalAnswer: string;
  status: string;
  confidence: string | null;
};
export type Questionnaire = { id: string; name: string; status: string; requesterEmail: string | null };

const CONF_TONE: Record<string, "emerald" | "amber" | "red" | "slate"> = { high: "emerald", medium: "amber", low: "red", none: "slate" };

export function Workspace({ questionnaire, items }: { questionnaire: Questionnaire; items: WItem[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const approved = items.filter((i) => i.status === "approved").length;

  function act(fn: () => Promise<{ ok: boolean }>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/questionnaires" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand-700">
        <ArrowLeft size={15} /> All questionnaires
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">{questionnaire.name}</h1>
          <p className="text-sm text-ink-faint">
            {approved}/{items.length} approved{questionnaire.requesterEmail && <> · {questionnaire.requesterEmail}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/admin/questionnaire-export/${questionnaire.id}`} className="btn-secondary">
            <Download size={15} /> Export CSV
          </a>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => act(() => setQuestionnaireStatus(questionnaire.id, questionnaire.status === "complete" ? "in-progress" : "complete"))}
          >
            <CircleCheck size={15} /> {questionnaire.status === "complete" ? "Reopen" : "Mark complete"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <ItemCard key={it.id} item={it} index={i + 1} busy={busy} onAct={act} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, index, busy, onAct }: { item: WItem; index: number; busy: boolean; onAct: (fn: () => Promise<{ ok: boolean }>) => void }) {
  const [answer, setAnswer] = useState(item.finalAnswer);
  const dirty = answer !== item.finalAnswer;
  const [libMsg, setLibMsg] = useState<string | null>(null);
  const [libBusy, setLibBusy] = useState(false);

  async function toLibrary() {
    setLibBusy(true);
    setLibMsg(null);
    const res = await saveItemToLibrary(item.id);
    setLibBusy(false);
    setLibMsg(res.ok ? "Added to answer library" : res.error);
  }

  return (
    <div className={cn("card p-4", item.status === "approved" && "ring-1 ring-emerald-200", item.status === "skipped" && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-ink">
          <span className="mr-2 text-ink-faint">{index}.</span>{item.question}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {item.confidence && item.confidence !== "none" && <Pill tone={CONF_TONE[item.confidence] ?? "slate"}>{item.confidence} match</Pill>}
          {item.confidence === "none" && <Pill tone="slate">no match</Pill>}
          {item.status === "approved" && <Pill tone="emerald">approved</Pill>}
        </div>
      </div>
      <textarea
        className="input mt-3 min-h-20"
        value={answer}
        placeholder="No answer drafted — write one, or add it to the answer library and re-draft."
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dirty && (
          <button className="btn-secondary text-sm" disabled={busy} onClick={() => onAct(() => updateItem(item.id, { finalAnswer: answer }))}>
            Save
          </button>
        )}
        <button className="btn-primary text-sm" disabled={busy} onClick={() => onAct(() => updateItem(item.id, { finalAnswer: answer, status: "approved" }))}>
          <Check size={14} /> Approve
        </button>
        <button className="btn-ghost text-sm" disabled={busy} onClick={() => onAct(() => updateItem(item.id, { status: "skipped" }))}>
          <SkipForward size={14} /> Skip
        </button>
        <button className="btn-ghost text-sm text-ink-soft" disabled={busy} onClick={() => onAct(() => redraftItem(item.id))} title="Re-draft from the answer library">
          <RefreshCw size={14} /> Re-draft
        </button>
        <button className="btn-ghost text-sm text-ink-soft" disabled={libBusy || !answer.trim()} onClick={toLibrary} title="Add this answer to the answer library">
          {libBusy ? <Loader2 className="animate-spin" size={14} /> : <Library size={14} />} Save to library
        </button>
        {libMsg && <span className="text-xs text-ink-faint">{libMsg}</span>}
      </div>
    </div>
  );
}
