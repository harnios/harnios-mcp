import { z } from "zod";

type JsonSchemaObject = Record<string, unknown>;

function convertLeaf(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") return z.unknown();
  const s = schema as JsonSchemaObject;

  if (Array.isArray(s.enum)) {
    const values = s.enum as unknown[];
    if (values.length > 0 && values.every((v) => typeof v === "string")) {
      return z.enum(values as [string, ...string[]]);
    }
    return z.unknown();
  }

  switch (s.type) {
    case "string":
      return z.string();
    case "number":
    case "integer":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(convertLeaf(s.items));
    case "object":
      return convertObject(s);
    default:
      return z.unknown();
  }
}

function convertObject(schema: JsonSchemaObject): z.ZodTypeAny {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") {
    return z.record(z.string(), z.unknown());
  }

  const required = new Set(
    Array.isArray(schema.required) ? (schema.required as unknown[]).filter((r) => typeof r === "string") : [],
  );

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(properties as Record<string, unknown>)) {
    const fieldSchema = convertLeaf(value);
    shape[key] = required.has(key) ? fieldSchema : fieldSchema.optional();
  }

  return z.object(shape).passthrough();
}

/**
 * Best-effort JSON Schema → Zod conversion for a proxied tool's declared
 * input/output schema (research.md §4). Every recognized field is typed;
 * anything not confidently recognized falls back to `z.unknown()`; and
 * `.passthrough()` allows properties this converter didn't anticipate at
 * all, rather than rejecting the call — Harnios's local validation is not
 * authoritative, the external server re-validates when the call is actually
 * forwarded (contracts/external-mcp-proxy-protocol.md).
 */
export function convertJsonSchemaToZod(schema: Record<string, unknown> | undefined): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") return z.object({}).passthrough();
  return convertObject(schema);
}
