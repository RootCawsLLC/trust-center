import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader, StatCard, Pill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  await requireModuleView("subscribers");
  const [subscribers, notifications, activeCount, customerCount] = await Promise.all([
    prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    prisma.subscriber.count({ where: { unsubscribedAt: null, isCustomer: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Subscribers"
        description="Visitors subscribed to trust-center change notifications. A notification is queued to active subscribers whenever a new update is published (delivery is scaffolded until SES is connected)."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active subscribers" value={activeCount} />
        <StatCard label="Customers" value={customerCount} />
        <StatCard label="Notifications queued" value={notifications.length} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink">Subscribers</h2>
      {subscribers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">No subscribers yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Domain</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-ink">{s.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{s.emailDomain}</td>
                  <td className="px-4 py-3">
                    {s.isCustomer ? <Pill tone="emerald">{s.matchedCustomerName ?? "Customer"}</Pill> : <Pill tone="slate">Lead</Pill>}
                  </td>
                  <td className="px-4 py-3">
                    {s.unsubscribedAt ? <Pill tone="red">Unsubscribed</Pill> : <Pill tone="emerald">Active</Pill>}
                  </td>
                  <td className="px-4 py-3 text-ink-faint">{s.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink">Notification log</h2>
      {notifications.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">No notifications sent yet. Publishing a new update queues one.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Pill tone="blue">{n.event}</Pill>
                  <span className="font-medium text-ink">{n.subject}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-faint">{n.body}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-ink-faint">
                <Pill tone={n.status === "sent" ? "emerald" : "amber"}>{n.status === "sent" ? "sent" : "queued (preview)"}</Pill>
                <div className="mt-1">{n.recipientCount} recipient(s)</div>
                <div>{n.createdAt.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
