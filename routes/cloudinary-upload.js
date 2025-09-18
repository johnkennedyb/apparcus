import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure multer for memory storage (since we're uploading to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images only for profile/cover photos
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Upload profile picture
router.post('/profile-picture', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No profile picture uploaded' });
    }

    // Upload to Cloudinary with specific folder and transformation
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'apparcus/profile-pictures',
      public_id: `user_${req.user._id}_profile_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Update user's avatar URL with Cloudinary URL
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: result.secure_url },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
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

    // Upload to Cloudinary with specific folder and transformation
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'apparcus/cover-photos',
      public_id: `user_${req.user._id}_cover_${Date.now()}`,
      transformation: [
        { width: 1200, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Update user's cover photo URL with Cloudinary URL
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverPhotoUrl: result.secure_url },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Cover photo uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
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

// Upload single file (general purpose)
router.post('/single', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'apparcus/uploads',
      public_id: `user_${req.user._id}_${Date.now()}`,
      resource_type: 'auto'
    });

    res.json({
      message: 'File uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
      size: result.bytes,
      format: result.format
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

    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, {
        folder: 'apparcus/uploads',
        public_id: `user_${req.user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resource_type: 'auto'
      })
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map((result, index) => ({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: req.files[index].originalname,
      size: result.bytes,
      format: result.format
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: files
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Delete file from Cloudinary
router.delete('/:publicId', authenticate, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found or already deleted' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

export default router;
