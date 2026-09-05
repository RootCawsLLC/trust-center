"use client";

import { useState } from "react";
import { Bell, Loader2, Check } from "lucide-react";

// Public "subscribe to updates" capture. Posts to /api/subscribe; email delivery
// is scaffolded server-side (recorded, not sent, until SES is configured).
export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setState("done");
      else {
        const j = await res.json().catch(() => ({}));
        setError(j.error === "invalid_email" ? "Enter a valid email address." : "Something went wrong.");
        setState("error");
      }
    } catch {
      setError("Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Check size={16} /> You&rsquo;re subscribed. We&rsquo;ll email you when reports, subprocessors, or certifications change.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Bell size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          required
          className="input pl-9"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email for update notifications"
        />
      </div>
      <button type="submit" className="btn-primary shrink-0" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />}
        Subscribe to updates
      </button>
      {error && <p className="text-sm text-red-600 sm:hidden">{error}</p>}
    </form>
  );
}
