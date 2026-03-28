import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const promptCache = new Map<string, string>();
const currentDir = resolve(fileURLToPath(new URL(".", import.meta.url)));

function resolvePromptPath(fileName: string): string | null {
  const candidates = [
    resolve(currentDir, "..", "..", "prompts", fileName),
    resolve(process.cwd(), "src", "prompts", fileName),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

export function loadPromptTemplate(fileName: string): string {
  const filePath = resolvePromptPath(fileName);
  if (!filePath) {
    throw new Error(`Prompt file not found: ${fileName}`);
  }

  if (promptCache.has(filePath)) {
    return promptCache.get(filePath) ?? "";
  }

  const text = readFileSync(filePath, "utf8");
  promptCache.set(filePath, text);
  return text;
}

export function renderPrompt(template: string, vars: Record<string, string | number | boolean>): string {
  let output = template;

  for (const [key, value] of Object.entries(vars)) {
    const token = `{{${key}}}`;
    output = output.split(token).join(String(value));
  }

  return output;
}
