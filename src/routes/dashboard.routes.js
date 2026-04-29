import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let stats = {};
    
    if (userRole === 'admin') {
      const totalTasks = await Task.countDocuments();
      const totalProjects = await Project.countDocuments();
      const totalUsers = await User.countDocuments();
      const completedTasks = await Task.countDocuments({ status: 'done' });
      const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
      
      stats = {
        totalTasks,
        totalProjects,
        totalUsers,
        completedTasks,
        inProgressTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
      };
    } else {
      const tasks = await Task.find({ assignee: userId });
      const projects = await Project.find({ team: userId });
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
      const overdueTasks = tasks.filter(t => t.dueDate < new Date() && t.status !== 'done').length;
      
      stats = {
        totalTasks: tasks.length,
        totalProjects: projects.length,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(2) : 0
      };
    }
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get recent activities
router.get('/activities', protect, async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10);
    
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

// Get task distribution
router.get('/task-distribution', protect, async (req, res) => {
  try {
    const distribution = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get upcoming deadlines
router.get('/upcoming-deadlines', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const tasks = await Task.find({
      assignee: userId,
      dueDate: { $lte: sevenDaysFromNow, $gte: new Date() },
      status: { $ne: 'done' }
    })
      .populate('project', 'name key')
      .sort({ dueDate: 1 })
      .limit(10);
    
    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;