import { prisma } from "@/lib/prisma";

// Fan a change notification out to active subscribers. Sending is scaffolded in
// this build: the notification is recorded (and would be delivered via SES when
// configured). Returns the created log row, or null if there are no subscribers.
export async function enqueueNotification(input: {
  event: "update" | "subprocessor" | "certification" | "incident" | "manual";
  subject: string;
  body: string;
  createdById?: string;
}) {
  const recipientCount = await prisma.subscriber.count({ where: { unsubscribedAt: null, confirmedAt: { not: null } } });
  if (recipientCount === 0) return null;
  return prisma.notificationLog.create({
    data: {
      event: input.event,
      subject: input.subject.slice(0, 200),
      body: input.body.slice(0, 8000),
      recipientCount,
      status: "queued", // scaffold: SES delivery would flip this to "sent"
      createdById: input.createdById ?? null,
    },
  });
}
