import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = req.user.toJSON();
    // Transform to match frontend Profile interface
    const profile = {
      id: user._id,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      date_of_birth: user.dateOfBirth,
      address: user.address,
      avatar_url: user.avatarUrl,
      coverPhotoUrl: user.coverPhotoUrl,
      account_number: user.accountNumber,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('first_name').optional().trim().isLength({ min: 1 }),
  body('last_name').optional().trim().isLength({ min: 1 }),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('date_of_birth').optional().isISO8601(),
  body('account_number').optional().trim(),
  body('avatar_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, phone, address, date_of_birth, account_number, avatar_url, cover_photo_url } = req.body;
    
    const updateData = {};
    if (first_name !== undefined) updateData.firstName = first_name;
    if (last_name !== undefined) updateData.lastName = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (date_of_birth !== undefined) updateData.dateOfBirth = date_of_birth;
    if (account_number !== undefined) updateData.accountNumber = account_number;
    if (avatar_url !== undefined) updateData.avatarUrl = avatar_url;
    if (cover_photo_url !== undefined) updateData.coverPhotoUrl = cover_photo_url;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    // Return updated profile in frontend format
    const updatedProfile = {
      id: user._id,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      date_of_birth: user.dateOfBirth,
      address: user.address,
      avatar_url: user.avatarUrl,
      coverPhotoUrl: user.coverPhotoUrl,
      account_number: user.accountNumber,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for admin purposes or member selection)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
