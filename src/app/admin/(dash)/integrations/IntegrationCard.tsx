"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plug, Check } from "lucide-react";
import { setIntegration } from "../access-actions";
import { cn } from "@/lib/utils";

export type IntegrationItem = {
  key: string;
  name: string;
  category: string;
  status: string;
  note: string | null;
};

export function IntegrationCard({ item }: { item: IntegrationItem }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const connected = item.status === "connected";

  function toggle() {
    start(async () => {
      await setIntegration(item.key, connected ? "disconnected" : "connected");
      router.refresh();
    });
  }

  return (
    <div className="card flex items-start justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-ink-faint")}>
          <Plug size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink">{item.name}</h3>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Check size={11} /> Connected
              </span>
            )}
          </div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">{item.category}</div>
          {item.note && <p className="mt-1 text-sm text-ink-soft">{item.note}</p>}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        className={cn(connected ? "btn-ghost" : "btn-secondary", "shrink-0 text-sm")}
      >
        {pending ? <Loader2 className="animate-spin" size={15} /> : null}
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}
