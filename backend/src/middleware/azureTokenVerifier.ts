import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import logger from '../utils/logger.js';
// HUOM: env luetaan config/env.js:n kautta, joka ajaa dotenv.config():n.
// Suoralla process.env-luvulla arvot olisivat tyhjiä, koska tämä moduuli
// alustetaan ennen kuin app.ts ehtii ladata .env-tiedoston.
import { env } from '../config/env.js';

/**
 * Azure AD -tokenin allekirjoituksen tarkistus.
 *
 * Tätä moduulia käyttävät sekä HTTP-pyyntöjen authMiddleware että
 * WebSocket-yhteyksien socketService. Aiemmin molemmissa oli oma
 * toteutuksensa, ja ne ehtivät ajautua eri tilaan.
 *
 * TAUSTA: commit 07efc46 poisti tarkistuksen kokonaan, koska tuotannossa
 * tuli "invalid signature" -virheitä. Syy oli siinä, että frontend lähetti
 * tuolloin Microsoft Graphille tarkoitetun access tokenin, jota mikään muu
 * palvelu ei voi tarkistaa. Frontend lähettää nyt ID-tokenin
 * (authService.acquireToken -> response.idToken), jonka aud on oma
 * client id ja jonka allekirjoitus on normaalisti tarkistettavissa.
 */

export interface AzureTokenPayload {
  preferred_username?: string;
  upn?: string;
  email?: string;
  unique_name?: string;
  name?: string;
  given_name?: string;
  oid?: string;
  sub?: string;
  iss?: string;
  aud?: string;
  tid?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface VerifiedUser {
  email: string;
  name: string;
  oid: string;
}

export type TokenErrorCode =
  | 'CONFIG_MISSING'
  | 'MALFORMED'
  | 'GRAPH_TOKEN'
  | 'EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_CLAIMS'
  | 'MISSING_USER_INFO';

export class TokenVerificationError extends Error {
  constructor(public code: TokenErrorCode, message: string) {
    super(message);
    this.name = 'TokenVerificationError';
  }
}

const AZURE_TENANT_ID: string = env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID: string = env.AZURE_CLIENT_ID || '';

/** Microsoft Graphin resurssitunnisteet. Näitä tokeneita ei voi tarkistaa. */
const GRAPH_AUDIENCES = [
  '00000003-0000-0000-c000-000000000000',
  'https://graph.microsoft.com',
];

/**
 * enforce = kelpaamaton token hylätään (oletus)
 * warn    = kelpaamaton token hyväksytään, mutta syy lokitetaan
 *
 * Käytä warn-tilaa vain väliaikaisesti käyttöönoton yhteydessä, kun haluat
 * nähdä tuotantoliikenteestä mikä tarkistuksessa pettää. Warn-tilassa
 * järjestelmä on käytännössä ilman todennusta.
 */
export const AUTH_VERIFY_MODE: 'enforce' | 'warn' =
  process.env.AUTH_VERIFY_MODE === 'warn' ? 'warn' : 'enforce';

export const isAuthConfigured = (): boolean => !!AZURE_TENANT_ID && !!AZURE_CLIENT_ID;

/** Hyväksytyt issuerit: v2 (login.microsoftonline.com) ja v1 (sts.windows.net). */
const expectedIssuers = (): string[] => [
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
  `https://sts.windows.net/${AZURE_TENANT_ID}/`,
];

// JWKS-clientit luodaan vasta ensimmäisellä käytöllä, jotta puuttuva
// tenant id ei muodosta rikkinäistä osoitetta jo moduulin latauksessa.
let jwksV2Client: jwksRsa.JwksClient | null = null;
let jwksV1Client: jwksRsa.JwksClient | null = null;

const jwksOptions = {
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
};

/** v2-tokenien avaimet (issuer login.microsoftonline.com/.../v2.0) */
const getJwksV2 = (): jwksRsa.JwksClient =>
  (jwksV2Client ??= jwksRsa({
    jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`,
    ...jwksOptions,
  }));

/** v1-tokenien avaimet (issuer sts.windows.net, eri discovery-polku) */
const getJwksV1 = (): jwksRsa.JwksClient =>
  (jwksV1Client ??= jwksRsa({
    jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/keys`,
    ...jwksOptions,
  }));

const getKeyFrom = (client: jwksRsa.JwksClient): jwt.GetPublicKeyOrSecret =>
  (header, callback) => {
    if (!header.kid) {
      callback(new Error('Token header missing kid'));
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) callback(err);
      else callback(null, key?.getPublicKey());
    });
  };

const verifyWith = (client: jwksRsa.JwksClient, token: string): Promise<AzureTokenPayload> =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKeyFrom(client),
      {
        audience: AZURE_CLIENT_ID,
        issuer: expectedIssuers(),
        algorithms: ['RS256', 'RS384', 'RS512'],
      },
      (err, payload) => {
        if (err) reject(err);
        else resolve(payload as AzureTokenPayload);
      }
    );
  });

/**
 * Tarkistaa tokenin allekirjoituksen, issuerin, audiencen ja voimassaolon.
 * Heittää TokenVerificationError-virheen, jonka code kertoo syyn.
 */
export async function verifyAzureToken(token: string): Promise<AzureTokenPayload> {
  if (!isAuthConfigured()) {
    throw new TokenVerificationError(
      'CONFIG_MISSING',
      'AZURE_TENANT_ID ja AZURE_CLIENT_ID puuttuvat palvelimen ympäristömuuttujista'
    );
  }

  const unverified = jwt.decode(token) as AzureTokenPayload | null;
  if (!unverified || typeof unverified !== 'object') {
    throw new TokenVerificationError('MALFORMED', 'Tokenia ei voi jäsentää');
  }

  // Graph-tokenin allekirjoitusta ei voi tarkistaa millään avaimella - Microsoft
  // muokkaa sitä tarkoituksella. Tämä oli alkuperäisen ongelman juurisyy, joten
  // siitä annetaan oma selkeä virheensä.
  const audience = String(unverified.aud || '');
  if (GRAPH_AUDIENCES.some((a) => audience === a || audience.startsWith(a))) {
    throw new TokenVerificationError(
      'GRAPH_TOKEN',
      'Token on tarkoitettu Microsoft Graphille eikä tälle sovellukselle. ' +
        'Frontendin tulee lähettää ID-token (acquireTokenSilent -> response.idToken).'
    );
  }

  // v1-issuer käyttää eri avainjoukkoa kuin v2
  const isV1 = String(unverified.iss || '').startsWith('https://sts.windows.net/');
  const primary = isV1 ? getJwksV1() : getJwksV2();
  const secondary = isV1 ? getJwksV2() : getJwksV1();

  try {
    return await verifyWith(primary, token);
  } catch (error: any) {
    // Vain allekirjoitusvirheellä kokeillaan toista avainjoukkoa. Muut virheet
    // (vanhentunut, väärä aud/iss) eivät korjaannu avaimia vaihtamalla.
    if (error?.name === 'JsonWebTokenError' && error?.message === 'invalid signature') {
      try {
        const payload = await verifyWith(secondary, token);
        logger.info('Token verified with fallback JWKS set', { issuer: unverified.iss });
        return payload;
      } catch (fallbackError: any) {
        throw toTokenError(fallbackError, unverified);
      }
    }
    throw toTokenError(error, unverified);
  }
}

const toTokenError = (error: any, payload: AzureTokenPayload): TokenVerificationError => {
  const message: string = error?.message || 'Tuntematon virhe';

  if (error?.name === 'TokenExpiredError' || message === 'jwt expired') {
    return new TokenVerificationError('EXPIRED', 'Token on vanhentunut');
  }
  if (message === 'invalid signature') {
    return new TokenVerificationError(
      'INVALID_SIGNATURE',
      `Allekirjoitus ei kelpaa (issuer: ${payload.iss})`
    );
  }
  if (message.includes('audience') || message.includes('issuer')) {
    return new TokenVerificationError(
      'INVALID_CLAIMS',
      `${message}. Token: aud=${payload.aud}, iss=${payload.iss}. ` +
        `Odotettu: aud=${AZURE_CLIENT_ID}, iss=${expectedIssuers().join(' tai ')}`
    );
  }
  return new TokenVerificationError('INVALID_SIGNATURE', message);
};

/** Poimii käyttäjätiedot tarkistetusta tokenista. */
export function extractUser(payload: AzureTokenPayload): VerifiedUser {
  const email = payload.preferred_username || payload.upn || payload.email || payload.unique_name;
  const name = payload.name || payload.given_name;
  const oid = payload.oid || payload.sub;

  if (!email || !name || !oid) {
    throw new TokenVerificationError(
      'MISSING_USER_INFO',
      'Tokenista puuttuu käyttäjätietoja (email, name tai oid)'
    );
  }

  return { email, name, oid };
}

/**
 * Tokenin jäsennys ilman allekirjoituksen tarkistusta.
 * Käytetään VAIN warn-tilassa ja rate limit -tunnistuksessa.
 */
export function decodeUnsafe(token: string): AzureTokenPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded === 'object' ? (decoded as AzureTokenPayload) : null;
  } catch {
    return null;
  }
}

/** Lokitetaan käynnistyksessä, jotta konfiguraatio-ongelma näkyy heti. */
export function logAuthConfiguration(): void {
  if (!isAuthConfigured()) {
    logger.error(
      '🔴 Azure AD -todennusta ei ole konfiguroitu. Aseta AZURE_TENANT_ID ja AZURE_CLIENT_ID ' +
        'palvelimen .env-tiedostoon. Ilman niitä kaikki todennetut pyynnöt hylätään.',
      { hasTenantId: !!AZURE_TENANT_ID, hasClientId: !!AZURE_CLIENT_ID }
    );
    return;
  }

  logger.info('🔐 Azure AD -todennus käytössä', {
    mode: AUTH_VERIFY_MODE,
    expectedAudience: AZURE_CLIENT_ID,
    expectedIssuers: expectedIssuers(),
  });

  if (AUTH_VERIFY_MODE === 'warn') {
    logger.warn(
      '⚠️  AUTH_VERIFY_MODE=warn: kelpaamattomat tokenit hyväksytään ja vain lokitetaan. ' +
        'Käytä tätä vain väliaikaisesti käyttöönoton diagnosointiin.'
    );
  }
}
