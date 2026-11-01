import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { createError } from './errorHandler';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `complaint-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError('Only image files (JPEG, PNG, GIF, WebP) are allowed', 400));
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});
