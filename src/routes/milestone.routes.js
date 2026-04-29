import express from 'express';
import Milestone from '../models/Milestone.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get milestones for a project
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const milestones = await Milestone.find({ project: req.params.projectId })
      .populate('tasks', 'title status priority')
      .sort({ dueDate: 1 });
    
    res.status(200).json({
      success: true,
      data: milestones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create milestone
router.post('/', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const milestone = await Milestone.create(req.body);
    
    res.status(201).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update milestone
router.put('/:id', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete milestone
router.delete('/:id', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }
    
    await milestone.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;