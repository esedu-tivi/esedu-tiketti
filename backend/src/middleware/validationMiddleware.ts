import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

// Validointiskeema kommenteille
const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Kommentti ei voi olla tyhjä')
    .max(1000, 'Kommentti on liian pitkä (max 1000 merkkiä)')
    .transform((val) => sanitizeHtml(val, {
      allowedTags: [], // Ei sallita HTML-tageja
      allowedAttributes: {} // Ei sallita attribuutteja
    }))
});

// Validointiskeema tiketeille
const ticketSchema = z.object({
  title: z
    .string()
    .min(5, 'Otsikon pitää olla vähintään 5 merkkiä')
    .max(100, 'Otsikko on liian pitkä (max 100 merkkiä)')
    .transform((val) => sanitizeHtml(val)),
  description: z
    .string()
    .min(10, 'Kuvauksen pitää olla vähintään 10 merkkiä')
    .max(2000, 'Kuvaus on liian pitkä (max 2000 merkkiä)')
    .transform((val) => sanitizeHtml(val)),
  device: z
    .string()
    .max(100, 'Laitteen nimi on liian pitkä')
    .nullable()
    .optional()
    .transform((val) => val ? sanitizeHtml(val) : val),
  additionalInfo: z
    .string()
    .max(1000, 'Lisätiedot ovat liian pitkät')
    .nullable()
    .optional()
    .transform((val) => val ? sanitizeHtml(val) : val),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  categoryId: z.string().uuid('Virheellinen kategoria ID'),
  responseFormat: z.enum(['TEKSTI', 'KUVA', 'VIDEO']).default('TEKSTI')
});

// Middleware kommenttien validointiin
export const validateComment = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = commentSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.errors[0].message 
      });
    }
    next(error);
  }
};

// Middleware tikettien validointiin
export const validateTicket = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = ticketSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.errors[0].message 
      });
    }
    next(error);
  }
}; 