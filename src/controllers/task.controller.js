const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/email.service');

// @desc    Get all tasks with filtering
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    
    // Filter by assignee
    if (req.query.assignee) {
      query.assignee = req.query.assignee;
    }
    
    // Filter by project
    if (req.query.project) {
      query.project = req.query.project;
    }
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by priority
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    // Filter by due date
    if (req.query.dueDate) {
      const date = new Date(req.query.dueDate);
      query.dueDate = { $lte: date };
    }
    
    // Search by title
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .populate('project', 'name key')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);
    
    const total = await Task.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar position')
      .populate('reporter', 'name email')
      .populate('project', 'name key description')
      .populate('reviewers', 'name email')
      .populate('watchers', 'name email')
      .populate('subtasks')
      .populate({
        path: 'parentTask',
        populate: { path: 'assignee', select: 'name email' }
      });
    
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
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    req.body.reporter = req.user.id;
    
    const task = await Task.create(req.body);
    
    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'create',
      entityType: 'task',
      entityId: task._id,
      changes: task
    });
    
    // Create notification for assignee
    if (task.assignee) {
      const notification = await Notification.create({
        recipient: task.assignee,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${task.title}`,
        data: {
          taskId: task._id,
          projectId: task.project
        }
      });
      
      // Emit socket event
      const io = req.app.get('io');
      io.to(`user-${task.assignee}`).emit('new-notification', notification);
      
      // Send email notification
      const assignee = await User.findById(task.assignee);
      if (assignee && assignee.preferences?.notifications?.email) {
        await sendEmail({
          to: assignee.email,
          subject: `New Task Assigned: ${task.title}`,
          html: `<h1>New Task Assigned</h1><p>You have been assigned a new task: ${task.title}</p><a href="${process.env.FRONTEND_URL}/tasks/${task._id}">View Task</a>`
        });
      }
    }
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const oldStatus = task.status;
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'update',
      entityType: 'task',
      entityId: task._id,
      changes: { old: task, new: updatedTask }
    });
    
    // Handle status change notification
    if (oldStatus !== updatedTask.status && updatedTask.assignee) {
      const notification = await Notification.create({
        recipient: updatedTask.assignee,
        type: 'status_change',
        title: 'Task Status Updated',
        message: `Task "${updatedTask.title}" status changed from ${oldStatus} to ${updatedTask.status}`,
        data: {
          taskId: updatedTask._id,
          projectId: updatedTask.project
        }
      });
      
      const io = req.app.get('io');
      io.to(`task-${updatedTask._id}`).emit('task-updated', updatedTask);
      io.to(`user-${updatedTask.assignee}`).emit('new-notification', notification);
    }
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    await task.remove();
    
    await Activity.create({
      user: req.user.id,
      action: 'delete',
      entityType: 'task',
      entityId: task._id,
      changes: task
    });
    
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
};

// @desc    Get user tasks
// @route   GET /api/tasks/user/:userId
// @access  Private
const getUserTasks = async (req, res) => {
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
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getUserTasks
};