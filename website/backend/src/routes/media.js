import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[MediaRoute] Created uploads directory at: ${UPLOADS_DIR}`);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate a unique token filename: timestamp-random-originalName
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${randomSuffix}-${sanitizedOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB maximum size
  },
});

// UPLOAD ENDPOINT
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    // Set 24 hour expiry date
    const expiryDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
    const expiresAt = new Date(Date.now() + expiryDuration);

    const relativeUrl = `/uploads/${req.file.filename}`;

    return res.json({
      fileUrl: relativeUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      expiresAt: expiresAt.toISOString(),
      message: 'File uploaded successfully. Will expire in 24 hours.',
    });
  } catch (error) {
    console.error('[Media Upload Error]', error);
    return res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

export default router;
export { UPLOADS_DIR };
