import express from 'express';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get comments for a task
router.get('/task/:taskId', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 });
    
    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create comment
router.post('/', protect, async (req, res) => {
  try {
    req.body.author = req.user.id;
    const comment = await Comment.create(req.body);
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email avatar');
    
    // Create notifications for mentions
    if (req.body.mentions && req.body.mentions.length > 0) {
      for (const mentionedUser of req.body.mentions) {
        await Notification.create({
          recipient: mentionedUser,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.name} mentioned you in a comment`,
          data: {
            taskId: req.body.task,
            commentId: comment._id
          }
        });
      }
    }
    
    // Emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(`task-${req.body.task}`).emit('new-comment', populatedComment);
    }
    
    res.status(201).json({
      success: true,
      data: populatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update comment
router.put('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }
    
    comment.content = req.body.content;
    comment.isEdited = true;
    await comment.save();
    
    const updatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email avatar');
    
    res.status(200).json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete comment
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }
    
    await comment.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;