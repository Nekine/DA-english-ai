export type AiProvider = "gemini" | "openai" | "xai";

export interface AiTextRequest {
  provider: AiProvider;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export class ProviderHttpError extends Error {
  provider: AiProvider;
  statusCode: number;

  constructor(provider: AiProvider, statusCode: number, message: string) {
    super(message);
    this.name = "ProviderHttpError";
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

function normalizeProvider(provider: string | undefined): AiProvider {
  const normalized = (provider ?? "openai").trim().toLowerCase();
  if (normalized === "gemini" || normalized === "openai" || normalized === "xai") {
    return normalized;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function requireApiKey(provider: AiProvider): string {
  const key =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.XAI_API_KEY;

  if (!key || key.trim().length === 0) {
    throw new Error(`Missing API key for provider: ${provider}`);
  }

  return key.trim();
}

function getModel(provider: AiProvider): string {
  if (provider === "gemini") {
    return process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";
  }

  if (provider === "openai") {
    return process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
  }

  return "grok-4-fast";
}

function getModelCandidates(provider: AiProvider): string[] {
  const primary = getModel(provider);

  const defaults =
    provider === "gemini"
      ? ["gemini-3-flash-preview"]
      : provider === "openai"
        ? ["gpt-5.4-mini"]
        : ["grok-4-fast"];

  const unique = new Set<string>();
  for (const model of [primary, ...defaults]) {
    const cleaned = model.trim();
    if (cleaned) {
      unique.add(cleaned);
    }
  }

  return Array.from(unique);
}

async function listOpenAiLikeModels(baseUrl: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };

    if (!Array.isArray(payload.data)) {
      return [];
    }

    return payload.data
      .map((item) => String(item.id ?? "").trim())
      .filter((id) => id.length > 0 && !/vision/i.test(id));
  } catch {
    return [];
  }
}

function isModelNotFoundResponse(statusCode: number, body: string): boolean {
  if (statusCode !== 400 && statusCode !== 404) {
    return false;
  }

  return /model\s+not\s+found|not\s+supported|invalid\s+argument|unknown\s+model/i.test(body);
}

function formatProviderError(provider: AiProvider, statusCode: number, rawBody: string): string {
  let detail = rawBody;

  try {
    const parsed = JSON.parse(rawBody) as { error?: unknown; code?: unknown; message?: unknown };
    const parts = [parsed.message, parsed.error, parsed.code]
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    if (parts.length > 0) {
      detail = parts.join(" | ");
    }
  } catch {
    // Keep raw body when JSON parsing fails.
  }

  if (provider === "xai" && statusCode === 403 && /credit|license|permission/i.test(detail)) {
    return `${provider} API error ${statusCode}: ${detail}. Check xAI team credits/licenses in console.x.ai.`;
  }

  return `${provider} API error ${statusCode}: ${detail}`;
}

function extractTextFromOpenAiLike(payload: unknown): string {
  const root = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = root.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          const textNode = (item as { text?: unknown }).text;
          return typeof textNode === "string" ? textNode : "";
        }

        return "";
      })
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("Provider returned empty content");
}

function extractTextFromGemini(payload: unknown): string {
  const root = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const parts = root.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned empty content");
  }

  return text;
}

async function callOpenAiLike(provider: "openai" | "xai", req: AiTextRequest): Promise<string> {
  const apiKey = requireApiKey(provider);
  const baseUrl = normalizeBaseUrl(
    provider === "openai"
      ? process.env.OPENAI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1"
      : process.env.XAI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1",
  );

  const models = provider === "xai" ? ["grok-4.2"] : getModelCandidates(provider);
  let lastError: Error | null = null;

  for (const model of models) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: req.temperature ?? 0.4,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      if (isModelNotFoundResponse(response.status, raw)) {
        lastError = new ProviderHttpError(provider, response.status, formatProviderError(provider, response.status, raw));
        continue;
      }

      throw new ProviderHttpError(provider, response.status, formatProviderError(provider, response.status, raw));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error(`${provider} API returned invalid JSON`);
    }

    return extractTextFromOpenAiLike(parsed);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`${provider} API model resolution failed`);
}

async function callGemini(req: AiTextRequest): Promise<string> {
  const apiKey = requireApiKey("gemini");
  const baseUrl = normalizeBaseUrl(process.env.GEMINI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1");
  const apiStyle = process.env.GEMINI_API_STYLE?.trim().toLowerCase();
  const useOpenAiCompat = apiStyle === "openai" || /api-v2\.shopaikey\.com\//i.test(baseUrl);
  const discoveredModels = useOpenAiCompat ? await listOpenAiLikeModels(baseUrl, apiKey) : [];
  const models = Array.from(new Set([...getModelCandidates("gemini"), ...discoveredModels]));
  let lastError: Error | null = null;

  for (const model of models) {
    const response = await (useOpenAiCompat
      ? fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: req.temperature ?? 0.4,
            messages: [
              { role: "system", content: req.systemPrompt },
              { role: "user", content: req.userPrompt },
            ],
          }),
        })
      : fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: req.systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: req.userPrompt }],
              },
            ],
            generationConfig: {
              temperature: req.temperature ?? 0.4,
            },
          }),
        }));

    const raw = await response.text();
    if (!response.ok) {
      if (isModelNotFoundResponse(response.status, raw)) {
        lastError = new ProviderHttpError("gemini", response.status, formatProviderError("gemini", response.status, raw));
        continue;
      }

      throw new ProviderHttpError("gemini", response.status, formatProviderError("gemini", response.status, raw));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("gemini API returned invalid JSON");
    }

    return useOpenAiCompat ? extractTextFromOpenAiLike(parsed) : extractTextFromGemini(parsed);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("gemini API model resolution failed");
}

function tryParseJsonDirect<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const starts = [objectStart, arrayStart].filter((x) => x >= 0).sort((a, b) => a - b);

  if (starts.length === 0) {
    return null;
  }

  const start = starts[0] as number;
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i] as string;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

export async function generateTextFromProvider(input: AiTextRequest): Promise<string> {
  const provider = normalizeProvider(input.provider);

  if (provider === "gemini") {
    return callGemini({ ...input, provider });
  }

  return callOpenAiLike(provider, { ...input, provider });
}

export async function generateJsonFromProvider<T>(input: AiTextRequest): Promise<T> {
  const text = await generateTextFromProvider(input);

  const direct = tryParseJsonDirect<T>(text);
  if (direct) {
    return direct;
  }

  const block = extractJsonBlock(text);
  if (!block) {
    throw new Error("Model did not return JSON content");
  }

  const parsed = tryParseJsonDirect<T>(block);
  if (!parsed) {
    throw new Error("Unable to parse JSON content from model response");
  }

  return parsed;
}

export function getHttpStatusFromError(error: unknown, fallback = 502): number {
  if (error instanceof ProviderHttpError) {
    return error.statusCode;
  }

  if (error instanceof Error) {
    const match = error.message.match(/API error\s+(\d{3})/i);
    if (match && match[1]) {
      return Number(match[1]);
    }
  }

  return fallback;
}
