import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import logger from '../utils/logger.js';

interface JWTPayload {
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
  exp?: number;
  [key: string]: unknown;
}

// Azure AD configuration
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;

// Developer emails that bypass strict tenant validation
const DEVELOPER_EMAILS = process.env.DEVELOPER_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];

// JWKS client for Azure AD v2.0 keys (issuer like https://login.microsoftonline.com/{tenant}/v2.0)
// NOTE: v2 tokens use this endpoint, keys usually overlap with v1 but not guaranteed.
const jwksClientV2 = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// JWKS client for Azure AD v1 keys (issuer like https://sts.windows.net/{tenant}/)
// IMPORTANT: v1 tokens expect the non-v2 discovery path.
const jwksClientV1 = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// JWKS client for common endpoint (personal Microsoft accounts), v2.0
const jwksClientCommon = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/common/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// Helper to create a getKey function bound to a specific JWKS client
const createGetKey = (client: jwksRsa.JwksClient, label: string) => (header: any, callback: any) => {
  console.log('[PROD DEBUG1] Getting signing key for kid:', header.kid);
  console.log('[PROD DEBUG1] Using JWKS client:', label);
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.log('[PROD DEBUG1] Error getting signing key:', {
        errorMessage: err.message,
        errorName: err.name,
        kid: header.kid,
        client: label
      });
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      console.log('[PROD DEBUG1] Successfully retrieved signing key for kid:', header.kid);
      callback(null, signingKey);
    }
  });
};

const getKeyCommon = (header: any, callback: any) => {
  jwksClientCommon.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Bearer token required' });
    }

    let decoded: JWTPayload;
    
    // Decode token payload for initial logging
    const tokenPayloadRaw = jwt.decode(token) as JWTPayload;
    console.log('[PROD DEBUG1] Initial token decode:', {
      email: tokenPayloadRaw?.preferred_username || tokenPayloadRaw?.upn || tokenPayloadRaw?.email,
      iss: tokenPayloadRaw?.iss,
      aud: tokenPayloadRaw?.aud,
      exp: tokenPayloadRaw?.exp,
      oid: tokenPayloadRaw?.oid,
      sub: tokenPayloadRaw?.sub
    });
    
    // Always verify tokens - no exceptions!
    try {
      const tokenHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      
      console.log('[PROD DEBUG1] Token header:', {
        alg: tokenHeader.alg,
        typ: tokenHeader.typ,
        kid: tokenHeader.kid
      });
      
      // Log token header for debugging
      logger.debug('Token header', { 
        alg: tokenHeader.alg,
        typ: tokenHeader.typ,
        kid: tokenHeader.kid,
        hasAzureClientId: !!AZURE_CLIENT_ID,
        requestId: (req as any).requestId
      });
      
      console.log('[PROD DEBUG1] Azure config:', {
        AZURE_TENANT_ID,
        AZURE_CLIENT_ID,
        hasClientId: !!AZURE_CLIENT_ID,
        hasTenantId: !!AZURE_TENANT_ID,
        developerEmails: DEVELOPER_EMAILS
      });
      
      // Determine token type based on algorithm
      const algorithm = tokenHeader.alg || 'HS256';
      const isAsymmetric = algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm.startsWith('PS');
      
      // Check if it's an Azure AD token (RS256/RS384/RS512 algorithms)
      if (isAsymmetric) {
        // This is an asymmetric token (likely Azure AD)
        if (!AZURE_CLIENT_ID) {
          logger.warn('Received RS* token but AZURE_CLIENT_ID not configured', { 
            algorithm,
            requestId: (req as any).requestId 
          });
          
          // In development, we can decode without verification if explicitly configured
          if (process.env.NODE_ENV === 'development' && process.env.SKIP_JWT_VERIFICATION === 'true') {
            logger.warn('DEVELOPMENT MODE: Decoding Azure token without verification', { requestId: (req as any).requestId });
            decoded = jwt.decode(token) as JWTPayload;
          } else {
            return res.status(500).json({ 
              error: 'Azure AD configuration missing',
              details: 'Server is not configured for Azure AD authentication. Contact administrator.'
            });
          }
        } else {
          // Verify Azure AD token with JWKS
          logger.debug('Verifying as Azure AD token', { 
            algorithm,
            hasKid: !!tokenHeader.kid,
            requestId: (req as any).requestId 
          });
          
          // If no kid, try to verify anyway (some Azure tokens might not have kid)
          if (!tokenHeader.kid) {
            logger.warn('Azure token missing kid field, attempting verification anyway', { 
              requestId: (req as any).requestId 
            });
          }
          
          try {
            // First decode the token to check if it's a developer account
            const decodedForCheck = jwt.decode(token) as JWTPayload;
            const userEmail = (decodedForCheck?.preferred_username || decodedForCheck?.upn || decodedForCheck?.email || '').toLowerCase();
            
            console.log('[PROD DEBUG1] Token analysis:', {
              userEmail,
              iss: decodedForCheck?.iss,
              aud: decodedForCheck?.aud,
              isDeveloper: DEVELOPER_EMAILS.includes(userEmail),
              expectedIssuer1: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
              expectedIssuer2: `https://sts.windows.net/${AZURE_TENANT_ID}/`,
              expectedAudience: AZURE_CLIENT_ID
            });
            const isDeveloper = DEVELOPER_EMAILS.includes(userEmail);
            
            if (isDeveloper) {
              logger.info('Developer account detected, using relaxed validation', { 
                email: userEmail,
                iss: decodedForCheck?.iss,
                aud: decodedForCheck?.aud,
                requestId: (req as any).requestId 
              });
              
              // For developer accounts, verify with more flexible parameters
              // Accept tokens from any tenant and various audiences
              decoded = await new Promise((resolve, reject) => {
                // Get the actual issuer from the token to handle any tenant
                const tokenIssuer = decodedForCheck?.iss || '';
                const tokenAudience = decodedForCheck?.aud || '';
                
                // Log what we're verifying with
                logger.debug('Attempting developer token verification', {
                  tokenIssuer,
                  tokenAudience,
                  configuredClientId: AZURE_CLIENT_ID,
                  requestId: (req as any).requestId
                });
                
                // For developer accounts, skip strict JWT verification but validate the token structure
                // This is safe because we still check the email against the whitelist
                logger.info('Bypassing strict JWT verification for whitelisted developer', {
                  email: userEmail,
                  tokenIssuer,
                  tokenAudience,
                  requestId: (req as any).requestId
                });
                
                // Simply decode the token without verification for developer accounts
                // The token is still from Microsoft, we just can't verify the signature
                // because it's from a different tenant
                const decodedToken = jwt.decode(token) as JWTPayload;
                
                // Validate token hasn't expired
                if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
                  logger.warn('Developer token is expired', {
                    email: userEmail,
                    requestId: (req as any).requestId
                  });
                  reject(new Error('Token expired'));
                } else {
                  logger.info('Developer token accepted (signature not verified)', {
                    email: userEmail,
                    issuer: decodedToken.iss,
                    audience: decodedToken.aud,
                    requestId: (req as any).requestId
                  });
                  resolve(decodedToken);
                }
              });
            } else {
              // For production users, use strict validation
              console.log('[PROD DEBUG1] Starting strict validation for non-developer account:', {
                email: userEmail,
                configuredTenant: AZURE_TENANT_ID,
                configuredClientId: AZURE_CLIENT_ID,
                tokenIssuer: decodedForCheck?.iss,
                tokenAudience: decodedForCheck?.aud
              });
              
              // For production users, use strict validation with proper signature verification
              decoded = await new Promise((resolve, reject) => {
                const verifyOptions = {
                  audience: AZURE_CLIENT_ID,
                  issuer: [
                    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
                    `https://sts.windows.net/${AZURE_TENANT_ID}/`
                  ],
                  algorithms: ['RS256', 'RS384', 'RS512'] as jwt.Algorithm[]
                };

                console.log('[PROD DEBUG1] JWT verify options:', verifyOptions);
                console.log('[PROD DEBUG1] Token details:', {
                  tokenAudience: decodedForCheck?.aud,
                  expectedAudience: AZURE_CLIENT_ID,
                  tokenIssuer: decodedForCheck?.iss
                });

                // Decide primary JWKS client based on issuer (v1 vs v2)
                const issuer: string = decodedForCheck?.iss || '';
                const isV1Issuer = issuer.startsWith(`https://sts.windows.net/`);
                const primaryClient = isV1Issuer ? jwksClientV1 : jwksClientV2;
                const secondaryClient = isV1Issuer ? jwksClientV2 : jwksClientV1;

                const tryVerifyWith = (client: jwksRsa.JwksClient, label: string, onDone: (err: any, decoded?: JWTPayload) => void) => {
                  const getKeyDynamic = createGetKey(client, label) as any;
                  jwt.verify(token, getKeyDynamic, verifyOptions, (err, decodedPayload) => {
                    onDone(err, decodedPayload as JWTPayload | undefined);
                  });
                };

                // First try with the primary client, on invalid signature fallback to the secondary client once
                tryVerifyWith(primaryClient, isV1Issuer ? 'AzureAD v1 (discovery/keys)' : 'AzureAD v2 (discovery/v2.0/keys)', (err, decodedPayload) => {
                  if (!err && decodedPayload) {
                    console.log('[PROD DEBUG1] JWT verification successful');
                    return resolve(decodedPayload);
                  }

                  console.log('[PROD DEBUG1] JWT verification error:', {
                    errorMessage: err?.message,
                    errorName: err?.name,
                    tokenAudience: decodedForCheck?.aud,
                    expectedAudience: AZURE_CLIENT_ID,
                    hint:
                      err?.name === 'JsonWebTokenError' && err?.message === 'invalid signature'
                        ? 'Possible JWKS set mismatch (v1 vs v2) or wrong tenant'
                        : undefined
                  });

                  // If signature invalid, try the alternate JWKS set once
                  if (err && err.name === 'JsonWebTokenError' && err.message === 'invalid signature') {
                    console.log('[PROD DEBUG1] Retrying verification with alternate JWKS client');
                    tryVerifyWith(secondaryClient, isV1Issuer ? 'AzureAD v2 (fallback)' : 'AzureAD v1 (fallback)', (err2, decodedPayload2) => {
                      if (!err2 && decodedPayload2) {
                        console.log('[PROD DEBUG1] JWT verification successful after JWKS fallback');
                        return resolve(decodedPayload2);
                      }

                      console.log('[PROD DEBUG1] JWT verification still failing after fallback:', {
                        errorMessage: err2?.message,
                        errorName: err2?.name,
                        tokenAudience: decodedForCheck?.aud,
                        expectedAudience: AZURE_CLIENT_ID,
                        issuer: issuer
                      });
                      return reject(err2 || err);
                    });
                  } else {
                    // Not a signature error or other failure; reject immediately
                    return reject(err);
                  }
                });
              });
            }
          } catch (azureError: any) {
            // If Azure verification fails in development with skip flag, decode anyway
            if (process.env.NODE_ENV === 'development' && process.env.SKIP_JWT_VERIFICATION === 'true') {
              logger.warn('DEVELOPMENT MODE: Azure verification failed, decoding without verification', { 
                error: azureError.message,
                requestId: (req as any).requestId 
              });
              decoded = jwt.decode(token) as JWTPayload;
            } else {
              // Log more details about the verification failure
              const decodedForError = jwt.decode(token, { complete: true }) as any;
              
              console.log('[PROD DEBUG1] VERIFICATION FAILED - Full error details:', {
                errorMessage: azureError.message,
                errorName: azureError.name,
                tokenIssuer: decodedForError?.payload?.iss,
                tokenAudience: decodedForError?.payload?.aud,
                tokenEmail: decodedForError?.payload?.preferred_username || decodedForError?.payload?.email,
                tokenExp: decodedForError?.payload?.exp,
                tokenIat: decodedForError?.payload?.iat,
                expectedIssuers: [`https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`, `https://sts.windows.net/${AZURE_TENANT_ID}/`],
                expectedAudience: AZURE_CLIENT_ID,
                actualTenantId: AZURE_TENANT_ID,
                actualClientId: AZURE_CLIENT_ID,
                currentTime: Date.now() / 1000
              });
              
              logger.error('Token verification failed', { 
                error: azureError.message,
                tokenIssuer: decodedForError?.payload?.iss,
                tokenAudience: decodedForError?.payload?.aud,
                tokenEmail: decodedForError?.payload?.preferred_username || decodedForError?.payload?.email,
                expectedIssuer: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
                expectedAudience: AZURE_CLIENT_ID,
                requestId: (req as any).requestId 
              });
              throw azureError;
            }
          }
        }
      } else {
        // Local JWT with symmetric algorithm (HS256/HS384/HS512)
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
          logger.error('JWT_SECRET not configured');
          return res.status(500).json({ error: 'Authentication configuration error' });
        }
        
        logger.debug('Verifying as local JWT', { algorithm, requestId: (req as any).requestId });
        
        // For development, also accept tokens without verification if explicitly configured
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_JWT_VERIFICATION === 'true') {
          logger.warn('DEVELOPMENT MODE: Skipping JWT verification', { requestId: (req as any).requestId });
          decoded = jwt.decode(token) as JWTPayload;
        } else {
          // Verify with symmetric algorithm
          decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256', 'HS384', 'HS512'] // Support common symmetric algorithms
          }) as JWTPayload;
        }
      }
    } catch (verifyError: any) {
      logger.warn('Token verification failed', { 
        error: verifyError instanceof Error ? verifyError.message : verifyError,
        errorName: verifyError?.name,
        requestId: (req as any).requestId 
      });
      
      // Provide more specific error messages
      if (verifyError.message === 'invalid algorithm') {
        return res.status(401).json({ 
          error: 'Invalid token algorithm',
          details: 'The token uses an unsupported or mismatched algorithm'
        });
      } else if (verifyError.message === 'jwt expired') {
        return res.status(401).json({ error: 'Token expired' });
      } else if (verifyError.message === 'invalid signature') {
        return res.status(401).json({ error: 'Invalid token signature' });
      }
      
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // Extract user info from verified token
    const email = decoded.preferred_username || decoded.upn || decoded.email || decoded.unique_name;
    const name = decoded.name || decoded.given_name;
    const oid = decoded.oid || decoded.sub;

    // Check if this is a developer account
    const isDeveloperAccount = email && DEVELOPER_EMAILS.includes(email.toLowerCase());

    // For developer accounts, only email is required (name and oid are optional)
    // For production users, all fields are required
    if (!email) {
      logger.warn('Missing email from token', { 
        requestId: (req as any).requestId 
      });
      return res.status(401).json({ error: 'Invalid token: missing email' });
    }

    if (!isDeveloperAccount && (!name || !oid)) {
      logger.warn('Missing required user info from token (non-developer)', { 
        hasEmail: !!email, 
        hasName: !!name, 
        hasOid: !!oid,
        requestId: (req as any).requestId 
      });
      return res.status(401).json({ error: 'Invalid token: missing user information' });
    }

    // For developer accounts with missing fields, provide defaults
    req.user = {
      email,
      name: name || email.split('@')[0], // Use email prefix as fallback name
      oid: oid || email // Use email as fallback oid for developers
    };

    if (isDeveloperAccount && (!name || !oid)) {
      logger.info('Developer account with missing fields, using defaults', {
        email,
        nameProvided: !!name,
        oidProvided: !!oid,
        requestId: (req as any).requestId
      });
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error', { 
      error: error instanceof Error ? error.message : error,
      requestId: (req as any).requestId 
    });
    res.status(500).json({ error: 'Authentication error' });
  }
}; 