# Developer Task Management System - Backend

A comprehensive backend API for managing tasks, projects, and team collaboration for software development teams.

## Features

- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Project Management** - Create, update, delete, and manage projects
- **Task Management** - Full CRUD operations for tasks with status tracking
- **Team Management** - Create teams and manage team members
- **Comments & Collaboration** - Task comments with mention functionality
- **File Attachments** - Upload and manage file attachments
- **Real-time Updates** - WebSocket integration for live updates
- **Email Notifications** - Send email notifications for task assignments and updates
- **Activity Logging** - Track all user activities
- **Dashboard Analytics** - Statistics and reporting endpoints
- **API Rate Limiting** - Prevent abuse with rate limiting

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.io for real-time features
- Nodemailer for emails
- Multer for file uploads

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install