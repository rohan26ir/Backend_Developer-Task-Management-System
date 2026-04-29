import express from 'express';
import Activity from '../models/Activity.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get activities
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    
    if (req.query.entityType) {
      query.entityType = req.query.entityType;
    }
    
    if (req.query.action) {
      query.action = req.query.action;
    }
    
    const activities = await Activity.find(query)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get activity for specific entity
router.get('/entity/:entityType/:entityId', protect, async (req, res) => {
  try {
    const activities = await Activity.find({
      entityType: req.params.entityType,
      entityId: req.params.entityId
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;