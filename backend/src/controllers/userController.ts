import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Updates the user's profile picture from Microsoft Graph API
 * This is called when a user logs in and has a Microsoft Graph access token
 */
export const updateProfilePictureFromMicrosoft = async (req: Request, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphAccessToken } = req.body;
    
    if (!graphAccessToken) {
      return res.status(400).json({ error: 'Microsoft Graph access token is required' });
    }

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

      res.json({
        profilePicture: dataUrl,
        message: 'Profile picture updated successfully from Microsoft'
      });
    } catch (graphError) {
      console.error('Error fetching profile picture from Microsoft:', graphError);
      
      // Don't treat this as an error, just don't update the profile picture
      res.json({
        message: 'No profile picture available from Microsoft'
      });
    }
  } catch (error) {
    console.error('Error updating profile picture from Microsoft:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Gets a user's profile picture
 */
export const getProfilePicture = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If the user doesn't have a profile picture, return a 404
    if (!user.profilePicture) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }

    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    console.error('Error getting profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Gets a user's profile picture by email
 */
export const getProfilePictureByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If the user doesn't have a profile picture, return a 404
    if (!user.profilePicture) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }

    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    console.error('Error getting profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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