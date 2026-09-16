import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { decodeUnsafe } from './azureTokenVerifier.js';

/**
 * Tunnistaa käyttäjän rate limit -laskentaa varten.
 *
 * TÄRKEÄÄ: tämä middleware EI todenna käyttäjää eikä saa asettaa req.user-
 * kenttää. Aiemmin se asetti sen tarkistamattomasta tokenista, jolloin
 * roleMiddleware saattoi myöntää oikeudet väärennetyn tokenin perusteella
 * ilman että authMiddleware oli edes ajettu.
 *
 * Tunniste menee omaan kenttäänsä req.rateLimitIdentity, jota käytetään
 * vain rate limit -avaimena. Väärennetyllä tunnisteella pääsee korkeintaan
 * toiseen rate limit -ämpäriin, ei käsiksi tietoihin.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader.trim();

    if (!token) {
      next();
      return;
    }

    const decoded = decodeUnsafe(token);
    const identity =
      decoded?.preferred_username || decoded?.upn || decoded?.email || decoded?.unique_name || decoded?.sub;

    if (identity) {
      req.rateLimitIdentity = identity;
      logger.debug('Optional auth: identity resolved for rate limiting', {
        identity,
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.debug('Optional auth: failed to read token', { error, requestId: req.requestId });
  }

  next();
};
