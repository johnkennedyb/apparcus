import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all projects (public endpoint)
router.get('/all', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('adminId', 'firstName lastName email')
      .populate('members.userId', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('adminId', 'firstName lastName email')
      .populate('members.userId', 'firstName lastName email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1 }),
  body('fundingGoal').isNumeric().isFloat({ min: 0 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, fundingGoal } = req.body;

    const project = new Project({
      name,
      description,
      adminId: req.user._id,
      fundingGoal,
      members: [{ userId: req.user._id }] // Admin is automatically a member
    });

    await project.save();
    await project.populate('adminId', 'firstName lastName email');
    await project.populate('members.userId', 'firstName lastName email');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('fundingGoal').optional().isNumeric().isFloat({ min: 0 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin
    if (project.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const { name, description, fundingGoal, status } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (fundingGoal !== undefined) updateData.fundingGoal = fundingGoal;
    if (status !== undefined) updateData.status = status;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('adminId', 'firstName lastName email')
    .populate('members.userId', 'firstName lastName email');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join project
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is already a member
    const existingMember = project.members.find(member => 
      member.userId.toString() === req.user._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this project' });
    }

    project.members.push({ userId: req.user._id });
    await project.save();
    await project.populate('adminId', 'firstName lastName email');
    await project.populate('members.userId', 'firstName lastName email');

    res.json({
      message: 'Successfully joined project',
      project
    });
  } catch (error) {
    console.error('Join project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave project
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Admin cannot leave their own project
    if (project.adminId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Project admin cannot leave the project' });
    }

    // Remove user from members
    project.members = project.members.filter(member => 
      member.userId.toString() !== req.user._id.toString()
    );

    await project.save();
    await project.populate('adminId', 'firstName lastName email');
    await project.populate('members.userId', 'firstName lastName email');

    res.json({
      message: 'Successfully left project',
      project
    });
  } catch (error) {
    console.error('Leave project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects by adminId (for useProjects hook)
router.get('/', authenticate, async (req, res) => {
  try {
    const { adminId, page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    
    // If adminId is provided, filter by admin
    if (adminId) {
      query.adminId = adminId;
    }
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('adminId', 'firstName lastName email')
      .populate('members.userId', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    // Return just the projects array for frontend compatibility
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's projects
router.get('/user/my-projects', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const projects = await Project.find({
      $or: [
        { adminId: req.user._id },
        { 'members.userId': req.user._id }
      ]
    })
    .populate('adminId', 'firstName lastName email')
    .populate('members.userId', 'firstName lastName email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

    const total = await Project.countDocuments({
      $or: [
        { adminId: req.user._id },
        { 'members.userId': req.user._id }
      ]
    });

    res.json({
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
