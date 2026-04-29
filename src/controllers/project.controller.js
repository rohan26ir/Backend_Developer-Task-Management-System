const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Activity = require('../models/Activity');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    let query = {};
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by owner
    if (req.query.owner) {
      query.owner = req.query.owner;
    }
    
    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }
    
    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('team', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar position')
      .populate('team', 'name email avatar role');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get project statistics
    const tasks = await Task.find({ project: project._id });
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      overdueTasks: tasks.filter(t => t.dueDate < new Date() && t.status !== 'done').length
    };
    
    res.status(200).json({
      success: true,
      data: project,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    req.body.owner = req.user.id;
    
    const project = await Project.create(req.body);
    
    // Add owner to team
    project.team.push(req.user.id);
    await project.save();
    
    // Update user's assigned projects
    await User.findByIdAndUpdate(req.user.id, {
      $push: { assignedProjects: project._id }
    });
    
    await Activity.create({
      user: req.user.id,
      action: 'create',
      entityType: 'project',
      entityId: project._id,
      changes: project
    });
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    await Activity.create({
      user: req.user.id,
      action: 'update',
      entityType: 'project',
      entityId: project._id,
      changes: { old: project, new: updatedProject }
    });
    
    res.status(200).json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Delete all associated tasks
    await Task.deleteMany({ project: project._id });
    await project.remove();
    
    await Activity.create({
      user: req.user.id,
      action: 'delete',
      entityType: 'project',
      entityId: project._id,
      changes: project
    });
    
    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get project tasks
// @route   GET /api/projects/:id/tasks
// @access  Private
const getProjectTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });
    
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
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks
};