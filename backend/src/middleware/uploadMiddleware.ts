import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ValidationError } from './errorHandler.js';

// Get current file's directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with the original extension
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for allowing only images and videos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // HEIC/HEIF (iPhone-kuvat)
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];
  // HUOM: SVG ei ole sallittu tarkoituksella. SVG voi sisältää JavaScriptiä,
  // ja koska liitteet tarjoillaan samasta origin-osoitteesta kuin sovellus,
  // se avaisi XSS-reitin tiedoston URL-osoitteen kautta.

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // ValidationError tuottaa statuksen 400 ja välittää viestin käyttäjälle asti.
    // Tavallinen Error päätyisi errorHandlerissa 500-haaraan.
    cb(new ValidationError(
      `Tiedostomuoto ${file.mimetype} ei ole tuettu. Sallitut muodot: JPEG, PNG, GIF, WEBP, HEIC, MP4, WebM, MOV.`,
      'UNSUPPORTED_FILE_TYPE'
    ));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export const mediaUpload = upload.single('media');
export const ticketAttachmentsUpload = upload.array('attachments', 5); // Allow up to 5 attachments 