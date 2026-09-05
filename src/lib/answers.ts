import { prisma } from "@/lib/prisma";

// Lightweight keyword matcher over the answer library. This is the primary,
// deterministic drafting path (no AI needed); AI can enhance it when available.
const STOP = new Set([
  "the", "a", "an", "is", "are", "do", "does", "did", "you", "your", "we", "our", "us", "of", "to", "and", "or",
  "in", "on", "for", "with", "how", "what", "which", "that", "this", "have", "has", "had", "can", "could", "will",
  "would", "be", "been", "it", "its", "as", "at", "by", "from", "any", "all", "please", "provide", "describe", "list",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export type Draft = { answer: string | null; entryId: string | null; confidence: "high" | "medium" | "low" | "none" };

// Draft answers for a batch of questions from the published answer library.
export async function draftAnswers(questions: string[]): Promise<Draft[]> {
  const entries = await prisma.answerLibraryEntry.findMany({ where: { isPublished: true } });
  const index = entries.map((e) => ({
    e,
    toks: new Set([...tokens(e.question), ...e.tags.flatMap((t) => tokens(t))]),
  }));

  return questions.map((q) => {
    const qt = tokens(q);
    if (qt.length === 0 || index.length === 0) return { answer: null, entryId: null, confidence: "none" };
    let best: (typeof entries)[number] | null = null;
    let bestScore = 0;
    for (const { e, toks } of index) {
      const overlap = qt.filter((t) => toks.has(t)).length;
      const score = overlap / Math.max(qt.length, 1);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    const confidence = bestScore >= 0.5 ? "high" : bestScore >= 0.3 ? "medium" : bestScore >= 0.15 ? "low" : "none";
    if (!best || confidence === "none") return { answer: null, entryId: null, confidence: "none" };
    return { answer: best.answer, entryId: best.id, confidence };
  });
}
