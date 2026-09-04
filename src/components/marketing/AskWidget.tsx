"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, LifeBuoy, Check } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

export function AskWidget({ company }: { company: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [canTicket, setCanTicket] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketDone, setTicketDone] = useState(false);
  const [ticket, setTicket] = useState({ name: "", email: "" });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [msgs, loading, showTicket]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    setCanTicket(false);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.answer ?? "Sorry, something went wrong." }]);
      setCanTicket(Boolean(data.canTicket));
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitTicket() {
    const lastQ = [...msgs].reverse().find((m) => m.role === "user")?.text ?? "";
    await fetch("/api/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: lastQ, requesterName: ticket.name, requesterEmail: ticket.email }),
    });
    setTicketDone(true);
    setShowTicket(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-lift transition hover:bg-brand-700"
        >
          <MessageCircle size={18} /> Ask about our security
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-slate-100 bg-brand-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={17} />
              <span className="text-sm font-semibold">{company} assistant</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="text-sm text-ink-soft">
                Hi! Ask me about our certifications, security controls, or which
                document you need — e.g. &ldquo;Do you have a SOC 2 report?&rdquo; or
                &ldquo;What&rsquo;s your data encryption?&rdquo;
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={"inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " + (m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-ink")}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-sm text-ink-faint"><Loader2 className="animate-spin" size={14} /> Thinking…</div>}

            {ticketDone && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Check size={15} /> Request submitted — our team will follow up.
              </div>
            )}

            {canTicket && !showTicket && !ticketDone && (
              <button onClick={() => setShowTicket(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
                <LifeBuoy size={14} /> Not answered? Submit a request
              </button>
            )}

            {showTicket && !ticketDone && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-ink-faint">Leave your details and we&rsquo;ll get back to you.</p>
                <input className="input" placeholder="Name" value={ticket.name} onChange={(e) => setTicket({ ...ticket, name: e.target.value })} />
                <input className="input" type="email" placeholder="Work email" value={ticket.email} onChange={(e) => setTicket({ ...ticket, email: e.target.value })} />
                <button className="btn-primary w-full text-sm" onClick={submitTicket} disabled={!ticket.email}>Submit request</button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-2.5">
            <div className="flex items-center gap-2">
              <input
                className="input"
                placeholder="Ask a question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button onClick={send} disabled={loading || !input.trim()} className="btn-primary shrink-0 p-2.5" aria-label="Send">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
