import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  preferred_username?: string;
  upn?: string;
  email?: string;
  unique_name?: string;
  name?: string;
  given_name?: string;
  oid?: string;
  sub?: string;
  [key: string]: unknown;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    //console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('No auth header found');
      return next();
    }

    const token = authHeader.split(' ')[1];
    //console.log('Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.log('No token found in auth header');
      return next();
    }

    // Decode token to get user info (MSAL token on JWT muotoinen)
    const decoded = jwt.decode(token) as JWTPayload | null;
   // console.log('Decoded token:', decoded);
    
    if (!decoded || typeof decoded !== 'object') {
      console.log('Token decode failed or not an object');
      return next();
    }

    // MSAL tokenista löytyy käyttäjän tiedot
    const email = decoded.preferred_username || decoded.upn || decoded.email || decoded.unique_name;
    const name = decoded.name || decoded.given_name;
    const oid = decoded.oid || decoded.sub;

   //console.log('Extracted user info:', {
   //  email,
   //  name,
   //  oid,
   //  allFields: Object.keys(decoded)
   //});

    if (!email || !name || !oid) {
      console.log('Missing required user info from token');
      return next();
    }

    req.user = {
      email,
      name,
      oid
    };

   // console.log('Final user object:', req.user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
};