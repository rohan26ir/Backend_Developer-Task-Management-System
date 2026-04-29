const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let tasks, projects, stats;
    
    if (userRole === 'admin') {
      tasks = await Task.countDocuments();
      projects = await Project.countDocuments();
      const users = await User.countDocuments();
      
      const completedTasks = await Task.countDocuments({ status: 'done' });
      const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
      
      stats = {
        totalTasks: tasks,
        totalProjects: projects,
        totalUsers: users,
        completedTasks,
        inProgressTasks,
        completionRate: tasks > 0 ? (completedTasks / tasks * 100).toFixed(2) : 0
      };
    } else {
      tasks = await Task.find({ assignee: userId });
      projects = await Project.find({ team: userId });
      
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
      const overdueTasks = tasks.filter(t => t.dueDate < new Date() && t.status !== 'done').length;
      
      stats = {
        totalTasks: tasks.length,
        totalProjects: projects.length,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: tasks.length > 0 ? (completedTasks / tasks.length * 100).toFixed(2) : 0
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
};

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private
const getRecentActivities = async (req, res) => {
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
};

// @desc    Get task distribution
// @route   GET /api/dashboard/task-distribution
// @access  Private
const getTaskDistribution = async (req, res) => {
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
};

// @desc    Get upcoming deadlines
// @route   GET /api/dashboard/upcoming-deadlines
// @access  Private
const getUpcomingDeadlines = async (req, res) => {
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
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getTaskDistribution,
  getUpcomingDeadlines
};