// src/routes/auth.routes.js
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const authRouter = Router();

// All routes are prefixed with /api/auth
authRouter.post("/register", authController.register);
authRouter.get("/verify-otp", authController.verifyEmail);
authRouter.post("/resend-otp", authController.resendOTP);
authRouter.post("/login", authController.login);
authRouter.post("/logout", authController.logout);
authRouter.post("/logout-all", authController.logoutAll);
authRouter.get("/get-me", authController.getMe);
authRouter.get("/refresh-token", authController.refreshToken);
authRouter.post("/reset-password", authController.resetPassword);

console.log('✅ Auth routes module loaded');
export default authRouter;