import { z } from 'zod';

/**
 * Muuntaa zod-skeeman JSON Schemaksi OpenAI:n structured outputia varten.
 *
 * Korvaa zod-to-json-schema-paketin, joka ei tue zod 4:ää: zod 4 -skeemalla
 * se palauttaa hiljaa tyhjän skeeman, jolloin OpenAI ei saisi rakennetta.
 *
 * target "draft-7" pitää tuloksen samana kuin zod-to-json-schema tuotti
 * (sama $schema-tunniste), joten OpenAI:lle lähtevä skeema ei muutu.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
}
