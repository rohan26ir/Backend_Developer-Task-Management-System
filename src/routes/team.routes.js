import express from 'express';
import Team from '../models/Team.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all teams
router.get('/', protect, async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('lead', 'name email')
      .populate('members', 'name email avatar');
    
    res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single team
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar position')
      .populate('projects', 'name key status');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create team
router.post('/', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    req.body.lead = req.user.id;
    const team = await Team.create(req.body);
    
    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update team
router.put('/:id', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete team
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    await team.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
