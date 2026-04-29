import express from 'express';
import Task from '../models/Task.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks with filtering
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.query.assignee) query.assignee = req.query.assignee;
    if (req.query.project) query.project = req.query.project;
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.search) query.title = { $regex: req.query.search, $options: 'i' };
    
    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project', 'name key')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project', 'name key');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create task
router.post('/', protect, async (req, res) => {
  try {
    req.body.reporter = req.user.id;
    const task = await Task.create(req.body);
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('reporter', 'name email')
      .populate('project', 'name key');
    
    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update task
router.put('/:id', protect, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email')
     .populate('reporter', 'name email')
     .populate('project', 'name key');
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete task
router.delete('/:id', protect, authorize('admin', 'project_manager'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    await task.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user tasks
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.params.userId })
      .populate('project', 'name key')
      .populate('reporter', 'name email')
      .sort({ dueDate: 1 });
    
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