import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
// Express.Request-laajennus (requestId, user), jota errorHandler käyttää
import '../types/index.js';

/**
 * zod-päivitykseen liittyvät testit.
 *
 * TAUSTA: zod 3 -> 4 muutti kahta asiaa, jotka rikkoutuvat hiljaa:
 *  1. ZodError.errors poistui (nyt .issues). Validointivirhe muuttuisi
 *     selkeästä 400-vastauksesta 500-virheeksi.
 *  2. zod-to-json-schema ei tue zod 4:ää ja palauttaa tyhjän skeeman.
 *     AI-agentit lähettävät skeeman OpenAI:lle (strict: true), joten
 *     rakenteen pitää pysyä täsmälleen samana.
 */

// sanitize-html lataa ESM-only htmlparser2:n require():lla, mitä Jestin
// moduulijärjestelmä ei tue. Testit koskevat zodin virheenkäsittelyä,
// joten korvataan se ohituksella.
jest.unstable_mockModule('sanitize-html', () => ({ default: (s: string) => s }));

jest.unstable_mockModule('../utils/logger.js', () => {
  const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { default: { ...log, child: () => log } };
});

let toJsonSchema: typeof import('../ai/utils/jsonSchema.js').toJsonSchema;
let validateComment: typeof import('../middleware/validationMiddleware.js').validateComment;
let errorHandler: typeof import('../middleware/errorHandler.js').errorHandler;

beforeAll(async () => {
  ({ toJsonSchema } = await import('../ai/utils/jsonSchema.js'));
  ({ validateComment } = await import('../middleware/validationMiddleware.js'));
  ({ errorHandler } = await import('../middleware/errorHandler.js'));
});

/** Minimaalinen Express-vastausolio, joka tallentaa statuksen ja rungon */
const mockRes = () => {
  const res = { statusCode: 200, body: undefined as any, headersSent: false } as any;
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res as Response & { statusCode: number; body: any };
};

describe('toJsonSchema (OpenAI structured output)', () => {
  // Agenttien skeemoissa käytetyt rakenteet: string+max, enum, number+min/max, boolean
  const schema = z.object({
    title: z.string().max(50).describe('Short problem description in Finnish'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Ticket priority'),
    technicalAccuracy: z.number().min(0).max(1).describe('How technically accurate (0-1)'),
    hintGiven: z.boolean().describe('Whether a hint was included'),
  });

  it('tuottaa saman skeeman kuin zod-to-json-schema (zod 3) tuotti', () => {
    // Tallennettu zod-to-json-schema 3.25.2 + zod 3.25.76 -tulosteesta
    const aiempi = {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 50, description: 'Short problem description in Finnish' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Ticket priority' },
        technicalAccuracy: { type: 'number', minimum: 0, maximum: 1, description: 'How technically accurate (0-1)' },
        hintGiven: { type: 'boolean', description: 'Whether a hint was included' },
      },
      required: ['title', 'priority', 'technicalAccuracy', 'hintGiven'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#',
    };

    expect(toJsonSchema(schema)).toEqual(aiempi);
  });

  it('ei palauta tyhjää skeemaa', () => {
    const result = toJsonSchema(schema) as { properties?: Record<string, unknown> };
    expect(Object.keys(result.properties ?? {})).toHaveLength(4);
  });
});

describe('validointivirheet', () => {
  it('validateComment palauttaa 400 ja suomenkielisen viestin', () => {
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    validateComment({ body: { content: '' } } as Request, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Kommentti ei voi olla tyhjä' });
    expect(next).not.toHaveBeenCalled();
  });

  it('validateComment päästää kelvollisen kommentin läpi', () => {
    const req = { body: { content: 'Hei maailma' } } as Request;
    const next = jest.fn() as unknown as NextFunction;

    validateComment(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.content).toBe('Hei maailma');
  });

  it('validateComment hylkää liian pitkän kommentin', () => {
    const res = mockRes();

    validateComment({ body: { content: 'x'.repeat(1001) } } as Request, res, jest.fn() as unknown as NextFunction);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Kommentti on liian pitkä (max 1000 merkkiä)' });
  });

  it('errorHandler muuntaa ZodErrorin 400-vastaukseksi kenttäkohtaisin virhein', () => {
    const result = z.object({ email: z.string().min(3, 'Liian lyhyt') }).safeParse({ email: 'a' });
    expect(result.success).toBe(false);

    const res = mockRes();
    const req = { path: '/api/test', method: 'POST', body: {}, get: () => undefined } as unknown as Request;
    errorHandler(result.error!, req, res, jest.fn() as unknown as NextFunction);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Validointivirhe', statusCode: 400 });
    // Kehitystilassa errorHandler levittää details-taulukon objektiin stack tracen
    // kanssa ({ 0: {...}, stack }), joten luetaan ensimmäinen virhe indeksillä.
    expect(res.body.error.details[0]).toEqual({ field: 'email', message: 'Liian lyhyt' });
  });
});
