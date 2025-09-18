import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|webp|svg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// Upload single file
router.post('/single', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate URL for the uploaded file using environment variable or fallback
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      url: fileUrl,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      format: path.extname(req.file.originalname).substring(1)
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload multiple files
router.post('/multiple', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const results = req.files.map(file => {
      const fileUrl = `${baseUrl}/uploads/${file.filename}`;
      return {
        url: fileUrl,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        format: path.extname(file.originalname).substring(1)
      };
    });

    res.json({
      message: 'Files uploaded successfully',
      files: results
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload profile picture
router.post('/profile-picture', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No profile picture uploaded' });
    }

    // Generate URL for the uploaded file using environment variable or fallback
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    // Update user's avatar URL
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: fileUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      url: fileUrl,
      publicId: req.file.filename,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        coverPhotoUrl: user.coverPhotoUrl
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Profile picture upload failed', error: error.message });
  }
});

// Upload cover photo
router.post('/cover-photo', authenticate, upload.single('coverPhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No cover photo uploaded' });
    }

    // Generate URL for the uploaded file using environment variable or fallback
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    // Update user's cover photo URL
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverPhotoUrl: fileUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Cover photo uploaded successfully',
      url: fileUrl,
      publicId: req.file.filename,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        coverPhotoUrl: user.coverPhotoUrl
      }
    });
  } catch (error) {
    console.error('Cover photo upload error:', error);
    res.status(500).json({ message: 'Cover photo upload failed', error: error.message });
  }
});

// Delete file
router.delete('/:publicId', authenticate, async (req, res) => {
  try {
    const { publicId } = req.params;
    const filePath = path.join(uploadsDir, publicId);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Delete the file
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

export default router;
