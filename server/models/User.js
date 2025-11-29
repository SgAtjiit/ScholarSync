import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: String,
  avatar: String,
  // This refresh token is CRITICAL. It allows us to scan Classroom 
  // in the background without the user being logged in.
  refreshToken: String, 
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  notificationPreferences: {
    deadlineAlerts: { type: [Number], default: [24, 12, 6, 1] },
    emailNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true },
    solutionReadyNotifications: { type: Boolean, default: true }
  },
  classrooms: [{
    classroomId: String,
    className: String,
    subject: String
  }]
});

const User = mongoose.model('User', userSchema);

export default User;