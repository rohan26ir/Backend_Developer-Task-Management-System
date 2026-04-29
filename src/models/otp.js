import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    otpHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 600 // MongoDB will auto-delete after 10 minutes (600 seconds)
    }
}, {
    timestamps: true
});

// Create TTL index for auto-deletion
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const otpModel = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

export default otpModel;