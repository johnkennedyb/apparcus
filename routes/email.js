import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Send verification email endpoint
router.post('/send-verification', [
  body('email').isEmail().normalizeEmail(),
  body('token').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, token } = req.body;
    const result = await emailService.sendVerificationEmail(email, token);

    res.json({
      message: 'Verification email sent successfully',
      messageId: result.messageId,
      previewUrl: result.previewUrl || null
    });
  } catch (error) {
    console.error('Verification email sending error:', error);
    res.status(500).json({ 
      message: 'Failed to send verification email',
      error: error.message 
    });
  }
});

// Send email endpoint (authenticated)
router.post('/send', authenticate, [
  body('to').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ min: 1 }),
  body('html').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, html, text } = req.body;

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text
    });

    res.json({
      message: 'Email sent successfully',
      messageId: result.messageId,
      previewUrl: result.previewUrl || null
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      message: 'Failed to send email',
      error: error.message 
    });
  }
});

export default router;
