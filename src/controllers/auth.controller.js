// src/controllers/auth.controller.js

import User from '../models/User.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import sessionModel from '../models/Session.js';
import { sendEmail } from '../services/email.service.js';
import { generateOtp, getOtpHtml } from '../utils/utils.js';
import otpModel from '../models/otp.js';

// @desc    Register user with OTP verification
// @route   POST /api/auth/register
// @access  Public
export async function register(req, res) {
    try {
        const { username, name, email, password, role } = req.body;

        // Check if user already exists
        const isAlreadyRegistered = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email }
            ]
        });

        if (isAlreadyRegistered) {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        // Hash password
        const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

        // Create user
        const user = await User.create({
            username: username.toLowerCase(),
            name,
            email,
            password: hashedPassword,
            role: role || 'developer',
            isEmailVerified: false
        });

        // Generate OTP
        const otp = generateOtp();
        const html = getOtpHtml(otp, name);

        // Store OTP hash
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
        await otpModel.create({
            email,
            user: user._id,
            otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        // Send OTP email
        await sendEmail(email, "OTP Verification - Task Manager", `Your OTP code is ${otp}`, html);

        res.status(201).json({
            success: true,
            message: "User registered successfully. Please verify your email with OTP.",
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                verified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error during registration"
        });
    }
}

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-otp
// @access  Public
// export async function verifyEmail(req, res) {
//     try {
//         const { otp, email } = req.body;

//         if (!otp || !email) {
//             return res.status(400).json({
//                 success: false,
//                 message: "OTP and email are required"
//             });
//         }

//         // Hash the provided OTP
//         const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

//         // Find valid OTP
//         const otpDoc = await otpModel.findOne({
//             email,
//             otpHash,
//             expiresAt: { $gt: new Date() }
//         });

//         if (!otpDoc) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid or expired OTP"
//             });
//         }

//         // Update user as verified
//         const user = await User.findByIdAndUpdate(
//             otpDoc.user,
//             { 
//                 isEmailVerified: true,
//                 emailVerificationOTP: null,
//                 emailVerificationOTPExpires: null
//             },
//             { new: true }
//         );

//         // Delete all OTPs for this user
//         await otpModel.deleteMany({ user: otpDoc.user });

//         res.status(200).json({
//             success: true,
//             message: "Email verified successfully",
//             user: {
//                 id: user._id,
//                 username: user.username,
//                 name: user.name,
//                 email: user.email,
//                 verified: user.isEmailVerified
//             }
//         });

//     } catch (error) {
//         console.error('OTP verification error:', error);
//         res.status(500).json({
//             success: false,
//             message: error.message || "Server error during OTP verification"
//         });
//     }
// }


export async function verifyEmail(req, res) {
    try {
        const { otp, email } = req.body;
        
        // Add debug logs
        console.log('=== VERIFY OTP DEBUG ===');
        console.log('Received OTP:', otp);
        console.log('Received Email:', email);
        console.log('OTP Type:', typeof otp);
        console.log('OTP Length:', otp?.length);
        
        if (!otp || !email) {
            return res.status(400).json({
                success: false,
                message: "OTP and email are required"
            });
        }

        // Hash the provided OTP
        const otpHash = crypto.createHash("sha256").update(otp.toString()).digest("hex");
        console.log('Generated Hash:', otpHash);
        
        // Check all OTPs for this email (including expired)
        const allOtps = await otpModel.find({ email });
        console.log(`Found ${allOtps.length} total OTP records for this email`);
        
        allOtps.forEach((doc, index) => {
            console.log(`OTP ${index + 1}:`);
            console.log(`  Hash: ${doc.otpHash}`);
            console.log(`  Expires: ${doc.expiresAt}`);
            console.log(`  User ID: ${doc.user}`);
            console.log(`  Is Expired: ${new Date() > doc.expiresAt}`);
            console.log(`  Hash Match: ${doc.otpHash === otpHash}`);
        });
        
        // Find valid OTP
        const otpDoc = await otpModel.findOne({
            email,
            otpHash,
            expiresAt: { $gt: new Date() }
        });
        
        console.log('Valid OTP Document Found:', !!otpDoc);
        console.log('Current Time:', new Date());
        
        if (!otpDoc) {
            // Check if OTP exists but expired
            const expiredOtp = await otpModel.findOne({
                email,
                otpHash,
                expiresAt: { $lte: new Date() }
            });
            
            if (expiredOtp) {
                console.log('OTP found but EXPIRED at:', expiredOtp.expiresAt);
                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please request a new one."
                });
            }
            
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Update user as verified
        const user = await User.findByIdAndUpdate(
            otpDoc.user,
            { 
                isEmailVerified: true,
                emailVerificationOTP: null,
                emailVerificationOTPExpires: null
            },
            { new: true }
        );

        // Delete all OTPs for this user
        await otpModel.deleteMany({ user: otpDoc.user });

        console.log('Email verified successfully for user:', user.email);
        
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                verified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error during OTP verification"
        });
    }
}



// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export async function resendOTP(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified"
            });
        }

        // Generate new OTP
        const otp = generateOtp();
        const html = getOtpHtml(otp, user.name);

        // Store new OTP hash
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
        
        // Delete old OTPs
        await otpModel.deleteMany({ email });
        
        // Create new OTP
        await otpModel.create({
            email,
            user: user._id,
            otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Send OTP email
        await sendEmail(email, "OTP Verification - Task Manager", `Your new OTP code is ${otp}`, html);

        res.status(200).json({
            success: true,
            message: "New OTP sent to your email. Valid for 10 minutes."
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error while resending OTP"
        });
    }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export async function login(req, res) {
    try {
        const { email, username, password } = req.body;

        // Find user by email or username
        let query = {};
        if (email) {
            query = { email };
        } else if (username) {
            query = { username: username.toLowerCase() };
        } else {
            return res.status(400).json({
                success: false,
                message: "Please provide email or username"
            });
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(401).json({
                success: false,
                message: "Email not verified. Please verify your email first.",
                requiresVerification: true,
                email: user.email
            });
        }

        // Verify password
        const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
        const isPasswordValid = hashedPassword === user.password;

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Generate refresh token
        const refreshToken = jwt.sign({
            id: user._id
        }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        // Hash refresh token and store in session
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await sessionModel.create({
            user: user._id,
            refreshTokenHash,
            ip: req.ip,
            userAgent: req.headers["user-agent"]
        });

        // Generate access token
        const accessToken = jwt.sign({
            id: user._id,
            sessionId: session._id
        }, config.JWT_SECRET, {
            expiresIn: "15m"
        });

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set refresh token as HTTP-only cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                verified: user.isEmailVerified
            },
            accessToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error during login"
        });
    }
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export async function getMe(req, res) {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token not found"
            });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                verified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export async function refreshToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await sessionModel.findOne({
            refreshTokenHash,
            revoked: false
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        // Generate new access token
        const accessToken = jwt.sign({
            id: decoded.id,
            sessionId: session._id
        }, config.JWT_SECRET, {
            expiresIn: "15m"
        });

        // Generate new refresh token
        const newRefreshToken = jwt.sign({
            id: decoded.id
        }, config.JWT_SECRET, {
            expiresIn: "7d"
        });

        const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

        // Update session with new refresh token hash
        session.refreshTokenHash = newRefreshTokenHash;
        await session.save();

        // Set new refresh token cookie
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: "Access token refreshed successfully",
            accessToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token"
        });
    }
}

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export async function logout(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await sessionModel.findOne({
            refreshTokenHash,
            revoked: false
        });

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        // Revoke the session
        session.revoked = true;
        await session.save();

        // Clear refresh token cookie
        res.clearCookie("refreshToken");

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error during logout"
        });
    }
}

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
export async function logoutAll(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

        // Revoke all sessions for this user
        await sessionModel.updateMany({
            user: decoded.id,
            revoked: false
        }, {
            revoked: true
        });

        // Clear refresh token cookie
        res.clearCookie("refreshToken");

        res.status(200).json({
            success: true,
            message: "Logged out from all devices successfully"
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error during logout"
        });
    }
}

// @desc    Request password reset
// @route   POST /api/auth/reset-password
// @access  Public
export async function resetPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }

        // Generate password reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.passwordResetToken = resetTokenHash;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send reset email (implement this)
        console.log('Password reset token for testing:', `${process.env.FRONTEND_URL}/reset-password/${resetToken}`);

        res.status(200).json({
            success: true,
            message: "Password reset email sent",
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

export const verifyOTP = verifyEmail;
