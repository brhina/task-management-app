import { generateText } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "../config/models.js";

function zodToDescription(schema: z.ZodTypeAny, indent = 2): string {
  const pad = " ".repeat(indent);
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const entries = Object.entries(shape)
      .map(([key, val]) => `${pad}"${key}": ${zodToDescription(val as z.ZodTypeAny, indent + 2)}`)
      .join(",\n");
    return `{\n${entries}\n${" ".repeat(indent - 2)}}`;
  }
  if (schema instanceof z.ZodArray) {
    return `${zodToDescription(schema.element, indent)}[]`;
  }
  if (schema instanceof z.ZodEnum) {
    return schema.options.map((o: string) => `"${o}"`).join(" | ");
  }
  if (schema instanceof z.ZodOptional) {
    return `${zodToDescription(schema.unwrap(), indent)} (optional)`;
  }
  if (schema instanceof z.ZodDefault) {
    return `${zodToDescription(schema._def.innerType, indent)} (default)`;
  }
  if (schema instanceof z.ZodNumber) return "number";
  if (schema instanceof z.ZodString) return "string";
  if (schema instanceof z.ZodBoolean) return "boolean";
  if (schema instanceof z.ZodRecord) return "Record<string, unknown>";
  if (schema instanceof z.ZodUnknown) return "unknown";
  if (schema instanceof z.ZodNullable) {
    return `${zodToDescription(schema.unwrap(), indent)} | null`;
  }
  return "unknown";
}

export function buildJsonInstructions<T extends z.ZodTypeAny>(
  schema: T,
): string {
  const shape = zodToDescription(schema);
  return `Respond ONLY with valid JSON matching this exact structure. No markdown, no explanation, no preamble, just the JSON object:\n${shape}`;
}

function extractBalancedJson(text: string): string | null {
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  let start = -1;
  if (objectStart === -1) start = arrayStart;
  else if (arrayStart === -1) start = objectStart;
  else start = Math.min(objectStart, arrayStart);
  if (start === -1) return null;

  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function collectAgentOutputText(result: unknown): string {
  if (!result || typeof result !== "object") {
    return String(result ?? "");
  }

  const record = result as Record<string, unknown>;
  const parts: string[] = [];

  const pushText = (value: unknown) => {
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  };

  pushText(record.text);

  if (Array.isArray(record.steps)) {
    for (const step of record.steps) {
      if (!step || typeof step !== "object") continue;
      const stepRecord = step as Record<string, unknown>;
      pushText(stepRecord.text);
      if (Array.isArray(stepRecord.content)) {
        for (const part of stepRecord.content) {
          if (!part || typeof part !== "object") continue;
          const contentPart = part as Record<string, unknown>;
          if (contentPart.type === "text") pushText(contentPart.text);
        }
      }
    }
  }

  if (Array.isArray(record.messages)) {
    for (const message of record.messages) {
      if (!message || typeof message !== "object") continue;
      const messageRecord = message as Record<string, unknown>;
      if (messageRecord.role !== "assistant") continue;
      if (typeof messageRecord.content === "string") {
        pushText(messageRecord.content);
        continue;
      }
      if (Array.isArray(messageRecord.content)) {
        for (const part of messageRecord.content) {
          if (!part || typeof part !== "object") continue;
          const contentPart = part as Record<string, unknown>;
          if (contentPart.type === "text") pushText(contentPart.text);
        }
      }
    }
  }

  if (parts.length > 0) {
    return parts.join("\n");
  }

  return typeof record.text === "string" ? record.text : "";
}

export function parseJsonResponse<T>(text: string, schema: z.ZodType<T>): T {
  let cleaned = text.trim();
  if (!cleaned) {
    throw new Error("Empty response");
  }

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const balanced = extractBalancedJson(cleaned);
  if (balanced) cleaned = balanced;

  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}

async function repairJsonWithModel<T>(
  rawText: string,
  schema: z.ZodType<T>,
  originalPrompt?: string,
): Promise<T> {
  const { text } = await generateText({
    model: DEFAULT_MODEL,
    temperature: 0,
    prompt: `Convert the assistant output below into ONLY valid JSON.
Rules:
- Output a single JSON object or array, nothing else
- No markdown fences, no explanation, no preamble
- Fill in reasonable defaults for any missing required fields

${buildJsonInstructions(schema)}

Original user request:
${originalPrompt || "N/A"}

Assistant output to convert:
${rawText}`,
  });

  return parseJsonResponse(text, schema);
}

export async function parseAgentJsonResult<T>(
  result: unknown,
  schema: z.ZodType<T>,
  label: string,
  originalPrompt?: string,
): Promise<T> {
  const rawText = collectAgentOutputText(result);

  try {
    return parseJsonResponse(rawText, schema);
  } catch (firstError) {
    try {
      return await repairJsonWithModel(rawText, schema, originalPrompt);
    } catch {
      const message =
        firstError instanceof Error ? firstError.message : String(firstError);
      throw new Error(`Failed to parse ${label}: ${message}`);
    }
  }
}
