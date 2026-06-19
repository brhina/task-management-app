import { z } from "zod";

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
  return `Respond ONLY with valid JSON matching this exact structure. No markdown, no explanation, just the JSON object:\n${shape}`;
}

export function parseJsonResponse<T>(text: string, schema: z.ZodType<T>): T {
  let cleaned = text.trim();

  // Try extracting from markdown fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Try finding the first { ... } or [ ... ] block
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) cleaned = jsonMatch[1];

  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
