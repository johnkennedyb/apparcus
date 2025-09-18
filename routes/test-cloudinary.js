import express from 'express';
import cloudinary from '../config/cloudinary.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Test Cloudinary configuration
router.get('/test-config', authenticate, async (req, res) => {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Check if Cloudinary config is loaded
    const config = cloudinary.config();
    console.log('Cloudinary config:', {
      cloud_name: config.cloud_name,
      api_key: config.api_key ? 'Set' : 'Not set',
      api_secret: config.api_secret ? 'Set' : 'Not set'
    });
    
    // Test Cloudinary connection by getting account details
    const result = await cloudinary.api.ping();
    console.log('Cloudinary ping result:', result);
    
    res.json({
      success: true,
      message: 'Cloudinary configuration is working',
      config: {
        cloud_name: config.cloud_name,
        api_key: config.api_key ? 'Set' : 'Not set',
        api_secret: config.api_secret ? 'Set' : 'Not set'
      },
      ping: result
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary configuration failed',
      error: error.message,
      details: error
    });
  }
});

// Test simple upload with a small test image
router.post('/test-upload', authenticate, async (req, res) => {
  try {
    console.log('Testing Cloudinary upload...');
    
    // Create a simple 1x1 pixel image data URL for testing
    const testImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const result = await cloudinary.uploader.upload(testImageDataUrl, {
      folder: 'apparcus/test',
      public_id: `test_${Date.now()}`,
      resource_type: 'image'
    });
    
    console.log('Test upload result:', result);
    
    res.json({
      success: true,
      message: 'Test upload successful',
      result: {
        url: result.secure_url,
        public_id: result.public_id
      }
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Test upload failed',
      error: error.message,
      details: error
    });
  }
});

export default router;
