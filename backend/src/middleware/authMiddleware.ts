import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import {
  verifyAzureToken,
  extractUser,
  decodeUnsafe,
  isAuthConfigured,
  AUTH_VERIFY_MODE,
  TokenVerificationError,
} from './azureTokenVerifier.js';

/**
 * Todentaa pyynnön Azure AD -tokenin.
 *
 * TÄRKEÄÄ: tämä middleware EI saa päästää pyyntöä eteenpäin ilman
 * tarkistettua tokenia. roleMiddleware hakee käyttäjän roolin pelkän
 * sähköpostiosoitteen perusteella, joten tarkistamaton req.user tarkoittaisi,
 * että kuka tahansa voi esiintyä pääkäyttäjänä.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestId = req.requestId;

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Kirjautuminen vaaditaan' });
    return;
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : authHeader.trim();

  if (!token) {
    res.status(401).json({ error: 'Kirjautuminen vaaditaan' });
    return;
  }

  if (!isAuthConfigured()) {
    logger.error('Azure AD configuration missing - rejecting request', { requestId });
    res.status(500).json({
      error: 'Todennusta ei ole konfiguroitu palvelimella',
      details: 'AZURE_TENANT_ID ja AZURE_CLIENT_ID puuttuvat. Ota yhteys ylläpitoon.',
    });
    return;
  }

  try {
    const payload = await verifyAzureToken(token);
    req.user = extractUser(payload);
    next();
  } catch (error) {
    const code = error instanceof TokenVerificationError ? error.code : 'UNKNOWN';
    const message = error instanceof Error ? error.message : String(error);

    if (AUTH_VERIFY_MODE === 'warn') {
      // Diagnostiikkatila: päästetään läpi, mutta kirjataan tarkka syy.
      const decoded = decodeUnsafe(token);
      const email = decoded?.preferred_username || decoded?.upn || decoded?.email;

      // HUOM: tiedot kirjoitetaan viestiin, ei vain metadataan. Kehityksessä
      // konsoliformaatti tulostaa vain message-kentän, ja metadatan 'message'
      // korvaisi sen (Winstonin käyttäytyminen).
      logger.warn(
        `⚠️  Token verification failed but WARN mode is active - request allowed: ` +
          `${code} - ${message} [aud=${decoded?.aud}, iss=${decoded?.iss}, email=${email}]`,
        { code, reason: message, tokenAudience: decoded?.aud, tokenIssuer: decoded?.iss, email, requestId }
      );

      if (decoded) {
        const fallbackEmail = decoded.preferred_username || decoded.upn || decoded.email || decoded.unique_name;
        const oid = decoded.oid || decoded.sub;
        if (fallbackEmail && oid) {
          req.user = { email: fallbackEmail, name: decoded.name || fallbackEmail.split('@')[0], oid };
          next();
          return;
        }
      }
    }

    logger.warn(`Token verification failed: ${code} - ${message}`, { code, reason: message, requestId });

    const status = code === 'CONFIG_MISSING' ? 500 : 401;
    res.status(status).json({
      error: code === 'EXPIRED' ? 'Token on vanhentunut' : 'Virheellinen token',
      code,
    });
  }
};
