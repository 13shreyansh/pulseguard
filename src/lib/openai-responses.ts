import crypto from "crypto";

type ResponsesOptions = {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  safetySeed: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
};

type OpenAIResponseBody = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string; code?: string; param?: string };
};

function outputText(body: OpenAIResponseBody) {
  if (body.output_text?.trim()) return body.output_text.trim();

  return (body.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n");
}

function safetyIdentifier(seed: string) {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 48);
}

function modelWasRejected(status: number, body: OpenAIResponseBody) {
  if (status !== 400 && status !== 404) return false;
  const detail = `${body.error?.code || ""} ${body.error?.param || ""} ${body.error?.message || ""}`;
  return /model|gpt-5\.6-sol/i.test(detail);
}

async function requestModel(model: string, apiKey: string, options: ResponsesOptions) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        instructions: options.instructions,
        input: options.input,
        reasoning: { effort: "low" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: options.schemaName,
            strict: true,
            schema: options.schema,
          },
        },
        max_output_tokens: options.maxOutputTokens ?? 700,
        store: false,
        safety_identifier: safetyIdentifier(options.safetySeed),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as OpenAIResponseBody;
    return { response, body, text: outputText(body) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function structuredResponse<T>(options: ResponsesOptions): Promise<{
  value: T;
  model: "gpt-5.6-sol" | "gpt-5.6";
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_unavailable");

  let result = await requestModel("gpt-5.6-sol", apiKey, options);
  let model: "gpt-5.6-sol" | "gpt-5.6" = "gpt-5.6-sol";

  if (!result.response.ok && modelWasRejected(result.response.status, result.body)) {
    result = await requestModel("gpt-5.6", apiKey, options);
    model = "gpt-5.6";
  }

  if (!result.response.ok || !result.text) throw new Error("openai_unavailable");

  try {
    return { value: JSON.parse(result.text) as T, model };
  } catch {
    throw new Error("openai_invalid_output");
  }
}
