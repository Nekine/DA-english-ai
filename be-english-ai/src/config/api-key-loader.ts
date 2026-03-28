import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

function sanitizeKey(raw: string): string {
  const withoutBom = raw.replace(/^\uFEFF/, "").trim();
  const withoutQuotes = withoutBom.replace(/^['\"](.+)['\"]$/, "$1").trim();
  return withoutQuotes.replace(/^bearer\s+/i, "").trim();
}

function readKeyFile(filePath: string): string {
  if (!existsSync(filePath)) {
    return "";
  }

  const raw = readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => sanitizeKey(line))
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return lines[0] ?? "";
}

export function loadApiKeysFromFiles(): void {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(moduleDir, "..", "..");

  const candidates = [
    resolve(projectRoot, "src", "keys"),
    resolve(projectRoot, "keys"),
    resolve(process.cwd(), "src", "keys"),
    resolve(process.cwd(), "keys"),
  ];

  const uniqueCandidates = Array.from(new Set(candidates));

  for (const baseDir of uniqueCandidates) {
    const geminiKey = readKeyFile(resolve(baseDir, "gemini.key"));
    const openaiKey = readKeyFile(resolve(baseDir, "openai.key"));
    const xaiKey = readKeyFile(resolve(baseDir, "xai.key"));

    if (!process.env.GEMINI_API_KEY && geminiKey && !geminiKey.includes("YOUR_GEMINI_API_KEY_HERE")) {
      process.env.GEMINI_API_KEY = geminiKey;
    }

    if (!process.env.OPENAI_API_KEY && openaiKey && !openaiKey.includes("YOUR_OPENAI_API_KEY_HERE")) {
      process.env.OPENAI_API_KEY = openaiKey;
    }

    if (!process.env.XAI_API_KEY && xaiKey && !xaiKey.includes("YOUR_XAI_API_KEY_HERE")) {
      process.env.XAI_API_KEY = xaiKey;
    }
  }
}
