import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Public one-click unsubscribe reached from a notification email's footer link.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let message = "This unsubscribe link is invalid or has expired.";
  if (token) {
    const sub = await prisma.subscriber.findUnique({ where: { token } });
    if (sub) {
      if (!sub.unsubscribedAt) {
        await prisma.subscriber.update({ where: { token }, data: { unsubscribedAt: new Date() } });
      }
      message = `${sub.email} has been unsubscribed from trust-center notifications.`;
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-lg font-semibold text-ink">Notifications</h1>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <a href="/" className="mt-5 inline-block text-sm font-medium text-brand-700 hover:underline">
          Back to the Trust Center
        </a>
      </div>
    </div>
  );
}
