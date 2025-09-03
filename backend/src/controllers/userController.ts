import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { 
  asyncHandler, 
  successResponse,
  NotFoundError,
  ValidationError,
  AuthenticationError 
} from '../middleware/errorHandler.js';

/**
 * Updates the user's profile picture from Microsoft Graph API
 * This is called when a user logs in and has a Microsoft Graph access token
 */
export const updateProfilePictureFromMicrosoft = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.email) {
    throw new AuthenticationError('Käyttäjätunnistus puuttuu');
  }

  const { graphAccessToken } = req.body;
  
  if (!graphAccessToken) {
    throw new ValidationError('Microsoft Graph access token vaaditaan');
  }

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: { email: req.user.email }
  });

  if (!user) {
    throw new NotFoundError('Käyttäjää ei löytynyt');
  }

  try {
    // Fetch the profile picture from Microsoft Graph API
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/photo/$value',
      {
        headers: {
          Authorization: `Bearer ${graphAccessToken}`,
        },
        responseType: 'arraybuffer',
      }
    );
    
    // Convert arraybuffer to base64
    const base64 = arrayBufferToBase64(response.data);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    // Update the user with the new profile picture
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: dataUrl }
    });

    return successResponse(res, { profilePicture: dataUrl }, 'Profiilikuva päivitetty onnistuneesti Microsoft-tililtä');
  } catch (graphError) {
    // Don't treat this as an error, just don't update the profile picture
    return successResponse(res, {}, 'Profiilikuvaa ei ole saatavilla Microsoft-tililtä');
  }
});

/**
 * Gets a user's profile picture
 */
export const getProfilePicture = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('Käyttäjä ID vaaditaan');
  }

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('Käyttäjää ei löytynyt');
  }

  // If the user doesn't have a profile picture, return a 404
  if (!user.profilePicture) {
    throw new NotFoundError('Profiilikuvaa ei löytynyt');
  }

  return successResponse(res, { profilePicture: user.profilePicture }, 'Profiilikuva haettu onnistuneesti');
});

/**
 * Gets a user's profile picture by email
 */
export const getProfilePictureByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.params;

  if (!email) {
    throw new ValidationError('Sähköpostiosoite vaaditaan');
  }

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError('Käyttäjää ei löytynyt');
  }

  // If the user doesn't have a profile picture, return a 404
  if (!user.profilePicture) {
    throw new NotFoundError('Profiilikuvaa ei löytynyt');
  }

  return successResponse(res, { profilePicture: user.profilePicture }, 'Profiilikuva haettu onnistuneesti');
});

/**
 * Helper function to convert array buffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
} 