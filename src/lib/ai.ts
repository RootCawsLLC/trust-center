import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

// Claude on Amazon Bedrock. Uses IAM (the App Runner instance role), so there is
// no API key. The model id is a cross-region inference profile by default.
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const REGION = process.env.AWS_REGION || "us-east-1";

// The AI is only "on" when explicitly enabled, so a fork without Bedrock access
// degrades gracefully (the widget shows a request form instead).
export function aiEnabled(): boolean {
  return (process.env.AI_ENABLED ?? "").toLowerCase() === "true";
}

let client: BedrockRuntimeClient | null = null;
function getClient() {
  if (!client) client = new BedrockRuntimeClient({ region: REGION });
  return client;
}

export async function askClaude({
  system,
  user,
  maxTokens = 500,
}: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await getClient().send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: system }],
      messages: [{ role: "user", content: [{ text: user }] }],
      inferenceConfig: { maxTokens, temperature: 0.2, topP: 0.9 },
    }),
  );
  const text =
    res.output?.message?.content
      ?.map((c) => c.text)
      .filter(Boolean)
      .join("\n") ?? "";
  return text.slice(0, 6000);
}
