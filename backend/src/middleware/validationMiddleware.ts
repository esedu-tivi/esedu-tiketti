import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { Priority, ResponseFormat } from '@prisma/client';

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
  responseFormat: z.enum(['TEKSTI', 'KUVA', 'VIDEO']).default('TEKSTI'),
  userProfile: z
    .string()
    .max(100, 'Käyttäjäprofiili on liian pitkä')
    .optional()
    .nullable()
    .transform((val) => val ? sanitizeHtml(val) : val)
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

// Tikettien validointi
export const validateTicket = (req: Request, res: Response, next: NextFunction) => {
  // For multipart form data, the body is provided as strings in form fields
  const { title, description, device, additionalInfo, priority, categoryId, responseFormat, userProfile } = req.body;
  
  try {
    // Create a data object with the correct types
    const data = {
      title,
      description,
      device: device || null,
      additionalInfo: additionalInfo || null,
      priority: priority as Priority,
      categoryId,
      responseFormat: responseFormat as ResponseFormat || 'TEKSTI',
      userProfile: userProfile || null
    };
    
    // Basic validation
    if (!title || title.length < 5 || title.length > 100) {
      throw new Error('Otsikon tulee olla 5-100 merkkiä pitkä');
    }
    
    if (!description || description.length < 10 || description.length > 2000) {
      throw new Error('Kuvauksen tulee olla 10-2000 merkkiä pitkä');
    }
    
    if (device && device.length > 100) {
      throw new Error('Laitteen tiedot voivat olla enintään 100 merkkiä');
    }
    
    if (additionalInfo && additionalInfo.length > 1000) {
      throw new Error('Lisätiedot voivat olla enintään 1000 merkkiä');
    }
    
    if (!Object.values(Priority).includes(priority as Priority)) {
      throw new Error('Virheellinen prioriteetti');
    }
    
    if (!categoryId) {
      throw new Error('Kategoria on pakollinen');
    }
    
    if (responseFormat && !Object.values(ResponseFormat).includes(responseFormat as ResponseFormat)) {
      throw new Error('Virheellinen vastausmuoto');
    }
    
    // Attach the validated data to the request body
    req.body = data;
    
    next();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: 'Validointivirhe' });
  }
}; 